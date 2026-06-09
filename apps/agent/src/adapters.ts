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
