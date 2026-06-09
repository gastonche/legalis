import type { AgentNamespace } from "agents";
import type { LegalisAgent } from "./agent";

/**
 * Worker bindings. Secrets (OPENAI_API_KEY) are server-side only. Retrieval uses
 * the local dev bridge (DEV_RETRIEVAL_URL) when set, otherwise the AI + VECTORIZE
 * bindings (uncomment them in wrangler.jsonc and create the index for deploy).
 */
export interface Env {
  AGENT: AgentNamespace<LegalisAgent>;
  OPENAI_API_KEY: string;
  OPENAI_MODEL?: string;
  /** Allowlist-biased web search (Tavily). When unset, the agent runs corpus-only. */
  TAVILY_API_KEY?: string;
  DEV_RETRIEVAL_URL?: string;
  AI?: Ai;
  VECTORIZE?: VectorizeIndex;
  // milestone 7+: DB (D1), KV
}
