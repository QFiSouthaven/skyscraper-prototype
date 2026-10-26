import { Octokit } from "@octokit/rest";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Tool, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import dotenvSafe from "dotenv-safe";
import { z } from "zod";
import { publishLinearEvent } from "./LinearMCP.js";

// ─── Env Schema ──────────────────────────────────────────────────────────────

const GitHubEnvSchema = z.object({
  GITHUB_TOKEN: z.string().min(1),
  GITHUB_REPO_OWNER: z.string().min(1),
  GITHUB_REPO_NAME: z.string().min(1),
});

type GitHubEnv = z.infer<typeof GitHubEnvSchema>;

// ─── Tool Input Schemas (JSON Schema format for MCP) ────────────────────────

const CreatePullRequestInputSchema: { $schema?: string; type: "object"; properties?: Record<string, object>; required?: string[] } = {
  type: "object",
  properties: {
    title: { type: "string" },
    body: { type: "string" },
    head: { type: "string" },
    base: { type: "string" },
    issueId: { type: "string" },
    labelIds: { type: "array", items: { type: "string" } },
  },
};

const TriggerWorkflowInputSchema: { $schema?: string; type: "object"; properties?: Record<string, object>; required?: string[] } = {
  type: "object",
  properties: {
    workflowFilePath: { type: "string" },
    ref: { type: "string" },
    inputs: { type: "object", additionalProperties: { type: "string" } },
  },
};

const GetPullRequestInputSchema: { $schema?: string; type: "object"; properties?: Record<string, object>; required?: string[] } = {
  type: "object",
  properties: { pullNumber: { type: "integer" } },
};

// ─── MCP Server Factory ──────────────────────────────────────────────────────

export function createGitHubMcpServer(): { server: Server; shutdown: () => Promise<void> } {
  dotenvSafe.config(); // loads .env into process.env at import time
  const env = GitHubEnvSchema.parse(process.env);
  const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
  const repoOwner = env.GITHUB_REPO_OWNER;
  const repoName = env.GITHUB_REPO_NAME;

  const createPrTool: Tool = {
    name: "github_create_pull_request",
    description: "Create a pull request in the configured repository and publish downstream sync events",
    inputSchema: CreatePullRequestInputSchema,
  };

  const triggerWorkflowTool: Tool = {
    name: "github_trigger_workflow",
    description: "Trigger a GitHub Actions workflow run (e.g., CI/CD pipeline)",
    inputSchema: TriggerWorkflowInputSchema,
  };

  const getPullRequestTool: Tool = {
    name: "github_get_pull_request",
    description: "Fetch a pull request by its number in the configured repository",
    inputSchema: GetPullRequestInputSchema,
  };

  async function handleCreatePullRequest(args: unknown): Promise<unknown> {
    const parsed = z.object({
      title: z.string(),
      body: z.string().optional(),
      head: z.string(),
      base: z.string().default("main"),
      issueId: z.string().optional(),
      labelIds: z.array(z.string()).optional(),
    }).safeParse(args);
    if (!parsed.success) throw new Error(`Invalid args: ${parsed.error.message}`);
    const { title, body, head, base, issueId, labelIds } = parsed.data;
    const createParams: Record<string, unknown> = { owner: repoOwner, repo: repoName, title, head, base };
    if (body !== undefined) createParams.body = body;
    const { data: pr } = await octokit.pulls.create(createParams as Parameters<typeof octokit.pulls.create>[0]);
    if (labelIds && labelIds.length > 0) await octokit.issues.addLabels({ owner: repoOwner, repo: repoName, issue_number: pr.number, labels: labelIds });
    if (issueId) await octokit.issues.addLabels({ owner: repoOwner, repo: repoName, issue_number: pr.number, labels: [issueId] });
    publishLinearEvent("pr_created", { pullNumber: pr.number, htmlUrl: pr.html_url, head, base, issueId: issueId ?? undefined });
    return { id: String(pr.id), number: pr.number, title: pr.title, htmlUrl: pr.html_url, state: pr.state, createdAt: pr.created_at ? new Date(pr.created_at).getTime() : Date.now(), updatedAt: pr.updated_at ? new Date(pr.updated_at).getTime() : Date.now() };
  }

  async function handleTriggerWorkflow(args: unknown): Promise<unknown> {
    const parsed = z.object({
      workflowFilePath: z.string(),
      ref: z.string().default("main"),
      inputs: z.record(z.string(), z.string()).optional(),
    }).safeParse(args);
    if (!parsed.success) throw new Error(`Invalid args: ${parsed.error.message}`);
    const { workflowFilePath, ref, inputs } = parsed.data;
    const dispatchParams: Record<string, unknown> = { owner: repoOwner, repo: repoName, workflow_file_name: workflowFilePath, ref };
    if (inputs && Object.keys(inputs).length > 0) dispatchParams.inputs = inputs;
    const { data: run } = await octokit.actions.createWorkflowDispatch(dispatchParams as Parameters<typeof octokit.actions.createWorkflowDispatch>[0]);
    publishLinearEvent("action_triggered", { runId: run.id, workflowFile: workflowFilePath, ref, inputs: inputs ?? {} });
    return { id: run.id, workflowFile: workflowFilePath, ref, status: run.status, conclusion: run.conclusion, createdAt: run.created_at ? new Date(run.created_at).getTime() : Date.now() };
  }

  async function handleGetPullRequest(args: unknown): Promise<unknown> {
    const parsed = z.object({ pullNumber: z.number() }).safeParse(args);
    if (!parsed.success) throw new Error(`Invalid args: ${parsed.error.message}`);
    const { data: pr } = await octokit.pulls.get({ owner: repoOwner, repo: repoName, pull_number: parsed.data.pullNumber });
    return { id: String(pr.id), number: pr.number, title: pr.title, body: pr.body ?? undefined, state: pr.state, merged: pr.merged_at !== null, htmlUrl: pr.html_url, createdAt: pr.created_at ? new Date(pr.created_at).getTime() : Date.now(), updatedAt: pr.updated_at ? new Date(pr.updated_at).getTime() : Date.now(), mergeable: pr.mergeable ?? undefined, additions: pr.additions ?? undefined, deletions: pr.deletions ?? undefined, changedFiles: pr.changed_files ?? undefined };
  }

  // ─── Linear → GitHub sync hook (issue closed with release label triggers workflow) ──
  const { subscribeLinearEvent } = await import("./LinearMCP.js");
  const unsubscribeRelease = subscribeLinearEvent("issue_closed", async (event) => {
    try {
      const payload = event.payload as Record<string, unknown>;
      const labelIds = payload.labelIds as string[] | undefined;
      if (labelIds?.includes("release")) {
        await handleTriggerWorkflow({ workflowFilePath: ".github/workflows/release.yml", ref: "main", inputs: { issue_id: String(payload.issueId ?? ""), sprint_id: String(payload.sprintId ?? "") } });
      }
    } catch (err) { console.error("[GitHubMCP] Release sync hook failed:", err); }
  });

  // ─── Supabase → GitHub change stream (audit_logged events trigger deploy) ──
  const unsubscribeSupabase = subscribeLinearEvent("audit_logged", async (event) => {
    try {
      const payload = event.payload as Record<string, unknown>;
      if (payload.action === "issue_updated" && payload.details?.status === "completed") {
        await handleTriggerWorkflow({ workflowFilePath: ".github/workflows/deploy.yml", ref: "main", inputs: { issue_id: String(payload.entityId ?? ""), deploy_env: "staging" } });
      }
    } catch (err) { console.error("[GitHubMCP] Supabase change stream hook failed:", err); }
  });

  const server = new Server({ name: "github-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
      case "github_create_pull_request": return handleCreatePullRequest(request.params.arguments);
      case "github_trigger_workflow": return handleTriggerWorkflow(request.params.arguments);
      case "github_get_pull_request": return handleGetPullRequest(request.params.arguments);
      default: throw new Error(`Unknown tool: ${request.params.name}`);
    }
  });

  const shutdown = async (): Promise<void> => {
    unsubscribeRelease();
    unsubscribeSupabase();
    octokit.rest.reset();
    console.error("[GitHubMCP] Shutdown complete");
  };

  return { server, shutdown };
}
