import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createLinearMcpServer } from "./tools/LinearMCP.js";
import { createSupabaseMcpServer } from "./tools/SupabaseMCP.js";
import { createGitHubMcpServer } from "./tools/GitHubMCP.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ─── Idempotency: PID file per process name ──────────────────────────────────

function ensureSingleInstance(processName: string): void {
  const pidFilePath = path.join(os.tmpdir(), `mcp-${processName}.pid`);
  if (fs.existsSync(pidFilePath)) {
    const existingPid = parseInt(fs.readFileSync(pidFilePath, "utf8"), 10);
    try {
      process.kill(existingPid, "SIGTERM");
      setTimeout(() => { if (!isProcessAlive(existingPid)) fs.unlinkSync(pidFilePath); }, 500);
    } catch {
      fs.unlinkSync(pidFilePath);
    }
  }
  fs.writeFileSync(pidFilePath, String(process.pid), "utf8");
}

function isProcessAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

// ─── Graceful teardown ───────────────────────────────────────────────────────

const shutdownHandlers = new Set<() => Promise<void>>();

function registerShutdown(fn: () => Promise<void>): void { shutdownHandlers.add(fn); }

async function gracefulShutdown(signal: string): Promise<void> {
  console.error(`[pipeline] Received ${signal}, shutting down...`);
  await Promise.allSettled(Array.from(shutdownHandlers).map((fn) => fn().catch((err) => console.error("[pipeline] Shutdown error:", err))));
  for (const name of ["linear-mcp", "supabase-mcp", "github-mcp"]) {
    try { fs.unlinkSync(path.join(os.tmpdir(), `mcp-${name}.pid`)); } catch {}
  }
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ─── Bootstrap each tier ─────────────────────────────────────────────────────

async function bootLinear(): Promise<void> {
  ensureSingleInstance("linear-mcp");
  const { server, shutdown } = createLinearMcpServer();
  registerShutdown(shutdown);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[pipeline] Linear MCP server booted on stdio");
}

async function bootSupabase(): Promise<void> {
  ensureSingleInstance("supabase-mcp");
  const { server, shutdown } = createSupabaseMcpServer();
  registerShutdown(shutdown);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[pipeline] Supabase MCP server booted on stdio");
}

async function bootGitHub(): Promise<void> {
  ensureSingleInstance("github-mcp");
  const { server, shutdown } = createGitHubMcpServer();
  registerShutdown(shutdown);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[pipeline] GitHub MCP server booted on stdio");
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.error("[pipeline] Starting three-tier MCP pipeline...");
  console.error("[pipeline] Chain: Linear -> Supabase -> GitHub");
  await Promise.allSettled([bootLinear(), bootSupabase(), bootGitHub()]);
  await new Promise<void>(() => { const tick = () => setTimeout(tick, 60000); tick(); });
}

main().catch((err) => { console.error("[pipeline] Fatal error:", err); process.exit(1); });
