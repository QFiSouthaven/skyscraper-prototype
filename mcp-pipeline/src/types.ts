import { z } from "zod";

// ─── Shared Config Schema ───────────────────────────────────────────────────

export const McpServerConfigSchema = z.object({
  serviceName: z.string(),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;

// ─── Event Bus Types ────────────────────────────────────────────────────────

export const SdlcEventKindSchema = z.enum([
  "issue_created",
  "issue_updated",
  "issue_closed",
  "sprint_started",
  "sprint_completed",
  "release_published",
  "audit_logged",
  "metrics_recorded",
  "pr_created",
  "pr_merged",
  "action_triggered",
]);

export type SdlcEventKind = z.infer<typeof SdlcEventKindSchema>;

export const SdlcEventSchema = z.object({
  id: z.string(),
  kind: SdlcEventKindSchema,
  timestamp: z.number(),
  source: z.string(),
  payload: z.record(z.string(), z.unknown()),
});

export type SdlcEvent = z.infer<typeof SdlcEventSchema>;

// ─── Linear-Specific Types ──────────────────────────────────────────────────

export const LinearIssueStatusSchema = z.enum([
  "triage",
  "todo",
  "in_progress",
  "completed",
  "canceled",
]);

export type LinearIssueStatus = z.infer<typeof LinearIssueStatusSchema>;

export const LinearSyncHookSchema = z.object({
  eventId: z.string(),
  issueId: z.string(),
  workspaceId: z.string(),
  memberId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type LinearSyncHook = z.infer<typeof LinearSyncHookSchema>;

// ─── Supabase-Specific Types ────────────────────────────────────────────────

export const AuditLogSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  sourceTool: z.string(),
  action: z.string(),
  entityId: z.string().optional(),
  entityKind: z.string().optional(),
  details: z.record(z.string(), z.unknown()),
  createdAt: z.number(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

export const MetricPointSchema = z.object({
  id: z.string(),
  metricName: z.string(),
  metricValue: z.number(),
  tags: z.record(z.string(), z.string()),
  recordedAt: z.number(),
});

export type MetricPoint = z.infer<typeof MetricPointSchema>;

// ─── GitHub-Specific Types ──────────────────────────────────────────────────

export const GitHubPrSyncSchema = z.object({
  id: z.string(),
  auditEventId: z.string(),
  repoOwner: z.string(),
  repoName: z.string(),
  branchName: z.string(),
  title: z.string(),
  body: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  createdAt: z.number(),
});

export type GitHubPrSync = z.infer<typeof GitHubPrSyncSchema>;

export const GitHubActionInputSchema = z.object({
  id: z.string(),
  workflowFilePath: z.string(),
  ref: z.string(),
  inputs: z.record(z.string(), z.string()),
  triggeredAt: z.number(),
});

export type GitHubActionInput = z.infer<typeof GitHubActionInputSchema>;
