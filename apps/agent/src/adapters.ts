import type {
  EmbeddingProvider,
  VectorStore,
  VectorQueryOptions,
  VectorUpsertItem,
} from "@legalis/core";
import type { ChunkMetadata, RetrievedChunk } from "@legalis/contracts";

/** Workers AI embeddings (multilingual bge-m3) via the AI binding. */
export class WorkersAiEmbedding implements EmbeddingProvider {
  readonly name = "cf:@cf/baai/bge-m3";
  constructor(private ai: Ai) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = (await this.ai.run("@cf/baai/bge-m3", { text: texts })) as { data: number[][] };
    return res.data;
  }
}

type StoredMeta = ChunkMetadata & { text: string };

function toChunk(id: string, score: number, meta: StoredMeta): RetrievedChunk {
  const { text, ...metadata } = meta;
  return { id, text, score, metadata };
}

/** Cloudflare Vectorize via the binding. Chunk text rides in metadata.text. */
export class VectorizeStore implements VectorStore {
  constructor(private index: VectorizeIndex) {}

  async upsert(items: VectorUpsertItem[]): Promise<void> {
    if (items.length === 0) return;
    await this.index.upsert(
      items.map((i) => ({
        id: i.id,
        values: i.vector,
        metadata: i.metadata as Record<string, string>,
      })),
    );
  }

  async query(vector: number[], opts: VectorQueryOptions = {}): Promise<RetrievedChunk[]> {
    const res = await this.index.query(vector, {
      topK: opts.topK ?? 8,
      returnMetadata: "all",
      ...(opts.filter ? { filter: opts.filter } : {}),
    });
    return res.matches.map((m) => toChunk(m.id, m.score, m.metadata as unknown as StoredMeta));
  }
}

// --- Dev bridge: when no CF bindings are available, the Worker reaches a local
// Node retrieval sidecar (LocalEmbedding + LocalVectorStore over HTTP). ---

export class HttpEmbedding implements EmbeddingProvider {
  readonly name = "http:dev-bridge";
  constructor(private base: string) {}
  async embed(texts: string[], kind: "query" | "passage" = "passage"): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await fetch(`${this.base}/embed`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ texts, kind }),
    });
    if (!res.ok) throw new Error(`dev-bridge embed ${res.status}`);
    return ((await res.json()) as { vectors: number[][] }).vectors;
  }
}

export class HttpVectorStore implements VectorStore {
  constructor(private base: string) {}
  async upsert(): Promise<void> {
    throw new Error("dev-bridge vector store is read-only");
  }
  async query(vector: number[], opts: VectorQueryOptions = {}): Promise<RetrievedChunk[]> {
    const res = await fetch(`${this.base}/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ vector, topK: opts.topK ?? 8, filter: opts.filter }),
    });
    if (!res.ok) throw new Error(`dev-bridge query ${res.status}`);
    return ((await res.json()) as { chunks: RetrievedChunk[] }).chunks;
  }
}
