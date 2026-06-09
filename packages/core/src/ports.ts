import type { RetrievedChunk } from "@legalis/contracts";

/**
 * Ports (interfaces) for the swappable infrastructure layers. Implementations
 * live in apps/agent (Workers AI, Vectorize, OpenAI, Tavily); the agent loop and
 * evals depend only on these interfaces. Model/store/search are all swappable.
 */

export interface LLMCompletionInput {
  system: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  /** Ask the provider for a JSON object response (used by classify + judge). */
  json?: boolean;
}

/** Frontier LLM for synthesis and the judge. Default impl = OpenAI; Anthropic swappable. */
export interface LLMProvider {
  readonly name: string;
  complete(input: LLMCompletionInput): Promise<string>;
  stream(input: LLMCompletionInput): AsyncIterable<string>;
}

/** Edge embeddings (Workers AI, multilingual e.g. @cf/baai/bge-m3). */
export interface EmbeddingProvider {
  readonly name: string;
  embed(texts: string[]): Promise<number[][]>;
}

export interface VectorQueryOptions {
  topK?: number;
  /** Equality filters over ChunkMetadata fields (e.g. { language: "fr" }). */
  filter?: Record<string, string>;
}

export interface VectorUpsertItem {
  id: string;
  vector: number[];
  metadata: Record<string, unknown>;
}

/** Vector store (Cloudflare Vectorize). */
export interface VectorStore {
  query(vector: number[], opts?: VectorQueryOptions): Promise<RetrievedChunk[]>;
  upsert(items: VectorUpsertItem[]): Promise<void>;
}

export interface WebResult {
  title: string;
  url: string;
  snippet: string;
}

/** Allowlist-biased web search (Tavily). */
export interface SearchProvider {
  search(query: string, opts?: { maxResults?: number; allowlist?: string[] }): Promise<WebResult[]>;
}
