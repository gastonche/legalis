import type { RetrievedChunk } from "@legalis/contracts";
import type { EmbeddingProvider, SearchProvider, VectorStore, WebResult } from "./ports";
import type { RetrievalPlan } from "./plan";
import { ALLOWLIST, webResultsToChunks } from "./web";

export interface RetrievalDeps {
  embedder: EmbeddingProvider;
  store: VectorStore;
  search?: SearchProvider;
  topK?: number;
}

export interface FusedRetrieval {
  chunks: RetrievedChunk[];
  corpusCount: number;
  webCount: number;
}

const rank = (c: RetrievedChunk): number => (c.metadata.authority === "primary" ? 10 : 0) + c.score;

/** Fuse corpus + web chunks: dedupe, prefer primary authority, then score. */
function fuse(corpus: RetrievedChunk[], web: RetrievedChunk[], limit = 12): RetrievedChunk[] {
  const seen = new Set<string>();
  const out: RetrievedChunk[] = [];
  for (const c of [...corpus, ...web].sort((a, b) => rank(b) - rank(a))) {
    const key = `${c.metadata.sourceId}|${c.metadata.articleSection ?? c.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Retrieve from the corpus and (when the plan calls for it) allowlist-biased web
 * search, then fuse. FR + EN web queries are issued in parallel and deduped by URL.
 */
export async function retrieveFused(
  question: string,
  deps: RetrievalDeps,
  plan: RetrievalPlan,
): Promise<FusedRetrieval> {
  let corpus: RetrievedChunk[] = [];
  try {
    const [qv] = await deps.embedder.embed([plan.corpusQuery || question], "query");
    if (qv) corpus = await deps.store.query(qv, { topK: deps.topK ?? 8 });
  } catch {
    corpus = [];
  }

  let web: RetrievedChunk[] = [];
  if (deps.search && plan.needsWeb) {
    const search = deps.search;
    const queries = [...new Set([plan.webQueryEn, plan.webQueryFr].filter((q): q is string => Boolean(q)))];
    const batches = await Promise.all(
      queries.map((q) =>
        search.search(q, { maxResults: 4, allowlist: ALLOWLIST }).catch(() => [] as WebResult[]),
      ),
    );
    const byUrl = new Map<string, WebResult>();
    for (const r of batches.flat()) if (!byUrl.has(r.url)) byUrl.set(r.url, r);
    web = webResultsToChunks([...byUrl.values()]);
  }

  return { chunks: fuse(corpus, web), corpusCount: corpus.length, webCount: web.length };
}
