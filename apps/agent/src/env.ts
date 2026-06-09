import type { AgentNamespace } from "agents";
import type { LegalisAgent } from "./agent";

/**
 * Worker bindings. Secrets (OPENAI_API_KEY, etc.) are injected server-side only.
 * Milestone-2+ bindings (AI, VECTORIZE, DB, KV) are added as the resources land.
 */
export interface Env {
  AGENT: AgentNamespace<LegalisAgent>;
  // AI: Ai;
  // VECTORIZE: VectorizeIndex;
  // DB: D1Database;
  // KV: KVNamespace;
  // OPENAI_API_KEY: string;
  // LLM_PROVIDER?: string;
  // ANTHROPIC_API_KEY?: string;
  // TAVILY_API_KEY?: string;
}
