import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { VectorStore, VectorQueryOptions, VectorUpsertItem } from "@legalis/core";
import type { ChunkMetadata, RetrievedChunk } from "@legalis/contracts";

/** Chunk text is stored alongside the vector in metadata.text so query() can return it. */
type StoredMeta = ChunkMetadata & { text: string };

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

function toChunk(id: string, score: number, meta: StoredMeta): RetrievedChunk {
  const { text, ...metadata } = meta;
  return { id, text, score, metadata };
}

function matchesFilter(meta: StoredMeta, filter?: Record<string, string>): boolean {
  if (!filter) return true;
  return Object.entries(filter).every(([k, v]) => (meta as Record<string, unknown>)[k] === v);
}

/** File-backed vector store with cosine search — runs offline for dev/CI/demo. */
export class LocalVectorStore implements VectorStore {
  private records = new Map<string, { vector: number[]; metadata: StoredMeta }>();
  private loaded = false;

  constructor(private filePath: string) {}

  private async load() {
    if (this.loaded) return;
    try {
      const raw = await readFile(this.filePath, "utf8");
      const arr = JSON.parse(raw) as { id: string; vector: number[]; metadata: StoredMeta }[];
      for (const r of arr) this.records.set(r.id, { vector: r.vector, metadata: r.metadata });
    } catch {
      /* fresh store */
    }
    this.loaded = true;
  }

  async upsert(items: VectorUpsertItem[]): Promise<void> {
    await this.load();
    for (const it of items) {
      this.records.set(it.id, { vector: it.vector, metadata: it.metadata as StoredMeta });
    }
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const arr = [...this.records].map(([id, r]) => ({ id, vector: r.vector, metadata: r.metadata }));
    await writeFile(this.filePath, JSON.stringify(arr), "utf8");
  }

  async query(vector: number[], opts: VectorQueryOptions = {}): Promise<RetrievedChunk[]> {
    await this.load();
    const topK = opts.topK ?? 8;
    const scored: RetrievedChunk[] = [];
    for (const [id, r] of this.records) {
      if (!matchesFilter(r.metadata, opts.filter)) continue;
      scored.push(toChunk(id, cosine(vector, r.vector), r.metadata));
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  get size(): number {
    return this.records.size;
  }
}

/** Cloudflare Vectorize (v2) over the REST API — used by the ingest CLI when creds are set. */
export class VectorizeRestStore implements VectorStore {
  private base: string;
  constructor(
    accountId: string,
    private apiToken: string,
    indexName: string,
  ) {
    this.base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${indexName}`;
  }

  async upsert(items: VectorUpsertItem[]): Promise<void> {
    if (items.length === 0) return;
    const ndjson =
      items
        .map((it) => JSON.stringify({ id: it.id, values: it.vector, metadata: it.metadata }))
        .join("\n") + "\n";
    const res = await fetch(`${this.base}/upsert`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiToken}`, "content-type": "application/x-ndjson" },
      body: ndjson,
    });
    if (!res.ok) throw new Error(`Vectorize upsert failed: ${res.status} ${await res.text()}`);
  }

  async query(vector: number[], opts: VectorQueryOptions = {}): Promise<RetrievedChunk[]> {
    const res = await fetch(`${this.base}/query`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        vector,
        topK: opts.topK ?? 8,
        returnMetadata: "all",
        ...(opts.filter ? { filter: opts.filter } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Vectorize query failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as {
      result?: { matches?: { id: string; score: number; metadata: StoredMeta }[] };
    };
    return (json.result?.matches ?? []).map((m) => toChunk(m.id, m.score, m.metadata));
  }
}
