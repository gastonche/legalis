import type { AgentNamespace } from "agents";
import type { LegalisAgent } from "./agent";

/**
 * Worker bindings. Secrets (OPENAI_API_KEY, etc.) are injected server-side only.
 * Milestone-2+ bindings (AI, VECTORIZE, DB, KV) are added as the resources land.
 */
export interface Env {
  AGENT: AgentNamespace<LegalisAgent>;
  AI: Ai;
  VECTORIZE: VectorizeIndex;
  OPENAI_API_KEY: string;
  OPENAI_MODEL?: string;
  // milestone 6+:
  // DB: D1Database;
  // KV: KVNamespace;
  // TAVILY_API_KEY?: string;
}
