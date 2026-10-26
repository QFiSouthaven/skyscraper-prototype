import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Tool, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { LinearClient } from "@linear/sdk";
import dotenvSafe from "dotenv-safe";
import { z } from "zod";

// ─── Env Schema ──────────────────────────────────────────────────────────────

const LinearEnvSchema = z.object({
  LINEAR_API_KEY: z.string().min(1),
  LINEAR_WORKSPACE_ID: z.string().optional(),
});

type LinearEnv = z.infer<typeof LinearEnvSchema>;

// ─── Tool Input Schemas (JSON Schema format for MCP) ────────────────────────

const ListIssuesInputSchema: { $schema?: string; type: "object"; properties?: Record<string, object>; required?: string[] } = {
  type: "object",
  properties: {
    workspaceId: { type: "string" },
    projectId: { type: "string" },
    assigneeId: { type: "string" },
    labelIds: { type: "array", items: { type: "string" } },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
  },
};

const CreateSprintInputSchema: { $schema?: string; type: "object"; properties?: Record<string, object>; required?: string[] } = {
  type: "object",
  properties: {
    projectId: { type: "string" },
    title: { type: "string" },
    startDate: { type: "string" },
    endDate: { type: "string" },
    issueIds: { type: "array", items: { type: "string" } },
  },
};

const GetIssueInputSchema: { $schema?: string; type: "object"; properties?: Record<string, object>; required?: string[] } = {
  type: "object",
  properties: { id: { type: "string" } },
};

// ─── In-Process Event Bus ─────────────────────────────────────────────────────

type EventListener = (event: { kind: string; payload: Record<string, unknown> }) => void;
const eventListeners = new Map<string, Set<EventListener>>();

export function publishLinearEvent(kind: string, payload: Record<string, unknown>): void {
  const listeners = eventListeners.get(kind);
  if (listeners) {
    for (const fn of listeners) {
      try { fn({ kind, payload }); } catch (err) { console.error(`[LinearMCP] Event listener error:`, err); }
    }
  }
}

export function subscribeLinearEvent(kind: string, listener: EventListener): () => void {
  if (!eventListeners.has(kind)) eventListeners.set(kind, new Set<EventListener>());
  eventListeners.get(kind)!.add(listener);
  return () => eventListeners.get(kind)!.delete(listener);
}

// ─── MCP Server Factory ──────────────────────────────────────────────────────

export function createLinearMcpServer(): { server: Server; shutdown: () => Promise<void> } {
  dotenvSafe.config(); // loads .env into process.env at import time
  const env = LinearEnvSchema.parse(process.env);
  const client = new LinearClient({ apiKey: env.LINEAR_API_KEY });

  const listIssuesTool: Tool = {
    name: "linear_list_issues",
    description: "List issues from Linear with optional filters (workspace, project, assignee, labels)",
    inputSchema: ListIssuesInputSchema,
  };

  const createSprintTool: Tool = {
    name: "linear_create_sprint",
    description: "Create a new sprint (cycle) in Linear and publish a sync event downstream",
    inputSchema: CreateSprintInputSchema,
  };

  const getIssueTool: Tool = {
    name: "linear_get_issue",
    description: "Fetch a single issue by its Linear ID",
    inputSchema: GetIssueInputSchema,
  };

  async function handleListIssues(args: unknown): Promise<unknown[]> {
    const parsed = z.object({
      workspaceId: z.string().optional(),
      projectId: z.string().optional(),
      assigneeId: z.string().optional(),
      labelIds: z.array(z.string()).optional(),
      limit: z.number().min(1).max(100).default(20),
    }).safeParse(args);
    if (!parsed.success) throw new Error(`Invalid args: ${parsed.error.message}`);
    const { workspaceId, projectId, assigneeId, labelIds, limit } = parsed.data;
    const filter: Record<string, unknown> = {};
    if (workspaceId) filter.workspaceId = { eq: workspaceId };
    if (projectId) filter.projectId = { eq: projectId };
    if (assigneeId) filter.assigneeId = { eq: assigneeId };
    if (labelIds && labelIds.length > 0) filter.labelIds = { anyOf: labelIds };
    const issues = await client.issues({ filter, first: limit });
    return issues.nodes.map((i) => ({
      id: i.id, identifier: i.identifier ?? undefined, title: i.title ?? undefined,
      description: i.description ?? undefined, status: (i as any).status?.name ?? undefined,
      priority: i.priority ?? undefined,
      createdAt: i.createdAt ? new Date(i.createdAt).getTime() : undefined,
      updatedAt: i.updatedAt ? new Date(i.updatedAt).getTime() : undefined,
    }));
  }

  async function handleCreateSprint(args: unknown): Promise<unknown> {
    const parsed = z.object({
      projectId: z.string(),
      title: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      issueIds: z.array(z.string()).optional(),
    }).safeParse(args);
    if (!parsed.success) throw new Error(`Invalid args: ${parsed.error.message}`);
    const { projectId, title, startDate, endDate, issueIds } = parsed.data;
    // Linear SDK v99+ uses projectIds (plural) for createCycle
    const cycleParams: Record<string, unknown> = { projectId, title };
    if (startDate) cycleParams.startsAt = startDate;
    if (endDate) cycleParams.endsAt = endDate;
    if (issueIds && issueIds.length > 0) cycleParams.issueIds = issueIds;
    const result = await client.createCycle(cycleParams as Parameters<typeof client.createCycle>[0]);
    publishLinearEvent("sprint_started", { cycleId: result.cycleId, title, projectId, startDate, endDate });
    return { id: result.cycleId, title, projectId };
  }

  async function handleGetIssue(args: unknown): Promise<unknown> {
    const parsed = z.object({ id: z.string() }).safeParse(args);
    if (!parsed.success) throw new Error(`Invalid args: ${parsed.error.message}`);
    const issue = await client.issue(parsed.data.id);
    if (!issue) throw new Error(`Issue not found: ${parsed.data.id}`);
    return {
      id: issue.id, identifier: issue.identifier ?? undefined, title: issue.title ?? undefined,
      description: issue.description ?? undefined, status: (issue as any).status?.name ?? undefined,
      priority: issue.priority ?? undefined, assigneeId: issue.assignee?.id ?? undefined,
      projectId: issue.project?.id ?? undefined,
      labelIds: issue.labels?.map((l: { id: string }) => l.id) ?? [],
      createdAt: issue.createdAt ? new Date(issue.createdAt).getTime() : undefined,
      updatedAt: issue.updatedAt ? new Date(issue.updatedAt).getTime() : undefined,
    };
  }

  const server = new Server({ name: "linear-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });

  (server as any).setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
      case "linear_list_issues": return handleListIssues(request.params.arguments);
      case "linear_create_sprint": return handleCreateSprint(request.params.arguments);
      case "linear_get_issue": return handleGetIssue(request.params.arguments);
      default: throw new Error(`Unknown tool: ${request.params.name}`);
    }
  });

  const shutdown = async (): Promise<void> => {
    eventListeners.clear();
    console.error("[LinearMCP] Shutdown complete");
  };

  return { server, shutdown };
}
