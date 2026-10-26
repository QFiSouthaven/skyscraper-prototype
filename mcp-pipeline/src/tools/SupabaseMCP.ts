import { createClient } from "@supabase/supabase-js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Tool, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import dotenvSafe from "dotenv-safe";
import { z } from "zod";
import { SdlcEventKindSchema } from "../types.js";
import { subscribeLinearEvent, publishLinearEvent } from "./LinearMCP.js";

// ─── Env Schema ──────────────────────────────────────────────────────────────

const SupabaseEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_AUDIT_TABLE: z.string().default("sdlc_audit_logs"),
  SUPABASE_METRICS_TABLE: z.string().default("sdlc_metrics"),
});

type SupabaseEnv = z.infer<typeof SupabaseEnvSchema>;

// ─── Tool Input Schemas (JSON Schema format for MCP) ────────────────────────

const WriteAuditLogInputSchema: { $schema?: string; type: "object"; properties?: Record<string, object>; required?: string[] } = {
  type: "object",
  properties: {
    eventId: { type: "string" },
    sourceTool: { type: "string" },
    action: { type: "string" },
    entityId: { type: "string" },
    entityKind: { type: "string" },
    details: { type: "object", additionalProperties: true },
  },
};

const RecordMetricInputSchema: { $schema?: string; type: "object"; properties?: Record<string, object>; required?: string[] } = {
  type: "object",
  properties: {
    metricName: { type: "string" },
    metricValue: { type: "number" },
    tags: { type: "object", additionalProperties: { type: "string" } },
  },
};

const QueryAuditLogsInputSchema: { $schema?: string; type: "object"; properties?: Record<string, object>; required?: string[] } = {
  type: "object",
  properties: {
    eventId: { type: "string" },
    sourceTool: { type: "string" },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    offset: { type: "integer", default: 0 },
  },
};

const QueryMetricsInputSchema: { $schema?: string; type: "object"; properties?: Record<string, object>; required?: string[] } = {
  type: "object",
  properties: {
    metricName: { type: "string" },
    fromTime: { type: "number" },
    toTime: { type: "number" },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
  },
};

// ─── MCP Server Factory ──────────────────────────────────────────────────────

export function createSupabaseMcpServer(): { server: Server; shutdown: () => Promise<void> } {
  dotenvSafe.config(); // loads .env into process.env at import time
  const env = SupabaseEnvSchema.parse(process.env);
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const writeAuditLogTool: Tool = {
    name: "supabase_write_audit_log",
    description: "Write an audit log entry for SDLC tracking (Linear → Supabase sync target)",
    inputSchema: WriteAuditLogInputSchema,
  };

  const recordMetricTool: Tool = {
    name: "supabase_record_metric",
    description: "Record a metric point for SDLC observability and compliance reporting",
    inputSchema: RecordMetricInputSchema,
  };

  const queryAuditLogsTool: Tool = {
    name: "supabase_query_audit_logs",
    description: "Query audit logs with optional event/source filters (paginated)",
    inputSchema: QueryAuditLogsInputSchema,
  };

  const queryMetricsTool: Tool = {
    name: "supabase_query_metrics",
    description: "Query metric points with optional time-range and name filters",
    inputSchema: QueryMetricsInputSchema,
  };

  async function handleWriteAuditLog(args: unknown): Promise<unknown> {
    const parsed = z.object({
      eventId: z.string(),
      sourceTool: z.string(),
      action: z.string(),
      entityId: z.string().optional(),
      entityKind: z.string().optional(),
      details: z.record(z.string(), z.unknown()).optional(),
    }).safeParse(args);
    if (!parsed.success) throw new Error(`Invalid args: ${parsed.error.message}`);
    const { eventId, sourceTool, action, entityId, entityKind, details } = parsed.data;
    const { data, error } = await supabase
      .from(env.SUPABASE_AUDIT_TABLE)
      .insert({ event_id: eventId, source_tool: sourceTool, action, entity_id: entityId ?? null, entity_kind: entityKind ?? null, details: details ?? {}, created_at: Math.floor(Date.now() / 1000) })
      .select()
      .single();
    if (error) throw new Error(`Supabase insert error: ${error.message}`);
    return { id: data.id, eventId: data.event_id, sourceTool: data.source_tool, action: data.action, entityId: data.entity_id ?? undefined, entityKind: data.entity_kind ?? undefined, details: data.details ?? {}, createdAt: (data.created_at ?? 0) * 1000 };
  }

  async function handleRecordMetric(args: unknown): Promise<unknown> {
    const parsed = z.object({
      metricName: z.string(),
      metricValue: z.number(),
      tags: z.record(z.string(), z.string()).optional(),
    }).safeParse(args);
    if (!parsed.success) throw new Error(`Invalid args: ${parsed.error.message}`);
    const { metricName, metricValue, tags } = parsed.data;
    const { data, error } = await supabase
      .from(env.SUPABASE_METRICS_TABLE)
      .insert({ metric_name: metricName, metric_value: metricValue, tags: tags ?? {}, recorded_at: Math.floor(Date.now() / 1000) })
      .select()
      .single();
    if (error) throw new Error(`Supabase insert error: ${error.message}`);
    return { id: data.id, metricName: data.metric_name, metricValue: data.metric_value, tags: data.tags ?? {}, recordedAt: (data.recorded_at ?? 0) * 1000 };
  }

  async function handleQueryAuditLogs(args: unknown): Promise<unknown[]> {
    const parsed = z.object({
      eventId: z.string().optional(),
      sourceTool: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().default(0),
    }).safeParse(args);
    if (!parsed.success) throw new Error(`Invalid args: ${parsed.error.message}`);
    const { eventId, sourceTool, limit, offset } = parsed.data;
    let query = supabase.from(env.SUPABASE_AUDIT_TABLE).select("*").order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (eventId) query = query.eq("event_id", eventId);
    if (sourceTool) query = query.eq("source_tool", sourceTool);
    const { data, error } = await query;
    if (error) throw new Error(`Supabase query error: ${error.message}`);
    return (data ?? []).map((row) => ({ id: row.id, eventId: row.event_id, sourceTool: row.source_tool, action: row.action, entityId: row.entity_id ?? undefined, entityKind: row.entity_kind ?? undefined, details: row.details ?? {}, createdAt: (row.created_at ?? 0) * 1000 }));
  }

  async function handleQueryMetrics(args: unknown): Promise<unknown[]> {
    const parsed = z.object({
      metricName: z.string().optional(),
      fromTime: z.number().optional(),
      toTime: z.number().optional(),
      limit: z.number().min(1).max(100).default(20),
    }).safeParse(args);
    if (!parsed.success) throw new Error(`Invalid args: ${parsed.error.message}`);
    const { metricName, fromTime, toTime, limit } = parsed.data;
    let query = supabase.from(env.SUPABASE_METRICS_TABLE).select("*").order("recorded_at", { ascending: false }).range(0, limit - 1);
    if (metricName) query = query.eq("metric_name", metricName);
    if (fromTime) query = query.gte("recorded_at", fromTime / 1000);
    if (toTime) query = query.lte("recorded_at", toTime / 1000);
    const { data, error } = await query;
    if (error) throw new Error(`Supabase query error: ${error.message}`);
    return (data ?? []).map((row) => ({ id: row.id, metricName: row.metric_name, metricValue: row.metric_value, tags: row.tags ?? {}, recordedAt: (row.recorded_at ?? 0) * 1000 }));
  }

  // ─── Linear → Supabase sync hook (issue_updated events trigger audit writes) ──
  const unsubscribeLinear = subscribeLinearEvent("issue_updated", async (event) => {
    try {
      const payload = event.payload as Record<string, unknown>;
      await handleWriteAuditLog({
        eventId: String(payload.eventId ?? Date.now()),
        sourceTool: "linear-mcp",
        action: "issue_updated",
        entityId: String(payload.issueId ?? ""),
        entityKind: "Issue",
        details: { status: payload.status, labelIds: payload.labelIds },
      });
    } catch (err) { console.error("[SupabaseMCP] Linear sync hook failed:", err); }
  });

  const unsubscribeSprint = subscribeLinearEvent("sprint_started", async (event) => {
    try {
      const payload = event.payload as Record<string, unknown>;
      await handleRecordMetric({ metricName: "sprints_created_total", metricValue: 1, tags: { projectId: String(payload.projectId ?? "") } });
    } catch (err) { console.error("[SupabaseMCP] Sprint sync hook failed:", err); }
  });

  const server = new Server({ name: "supabase-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });

  (server as any).setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
      case "supabase_write_audit_log": return handleWriteAuditLog(request.params.arguments);
      case "supabase_record_metric": return handleRecordMetric(request.params.arguments);
      case "supabase_query_audit_logs": return handleQueryAuditLogs(request.params.arguments);
      case "supabase_query_metrics": return handleQueryMetrics(request.params.arguments);
      default: throw new Error(`Unknown tool: ${request.params.name}`);
    }
  });

  const shutdown = async (): Promise<void> => {
    unsubscribeLinear();
    unsubscribeSprint();
    console.error("[SupabaseMCP] Shutdown complete");
  };

  return { server, shutdown };
}
