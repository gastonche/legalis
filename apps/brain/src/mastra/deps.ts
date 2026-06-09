import path from "node:path";
import { OpenAIProvider, TavilySearch, type AgentDeps } from "@legalis/core";
import { LocalVectorStore, defaultCorpusDir, resolveEmbedding } from "@legalis/ingestion";

/**
 * The retrieval + LLM dependencies, built once at module load from env. In the
 * Node brain these run IN-PROCESS: local e5 embeddings + the file-backed corpus
 * index (no dev HTTP bridge). For a Cloudflare deploy these would swap to Workers
 * AI + Vectorize via the existing @legalis/ingestion REST adapters.
 */
function buildDeps(): AgentDeps {
  const { provider: embedder } = resolveEmbedding();
  const store = new LocalVectorStore(path.join(defaultCorpusDir(), ".chunks", "local-index.json"));
  const llm = new OpenAIProvider(process.env.OPENAI_API_KEY ?? "", process.env.OPENAI_MODEL);
  const search = process.env.TAVILY_API_KEY ? new TavilySearch(process.env.TAVILY_API_KEY) : undefined;
  return { embedder, store, llm, search, topK: 8 };
}

export const deps: AgentDeps = buildDeps();
