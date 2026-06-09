import path from "node:path";
import { readFile } from "node:fs/promises";
import type { VectorStore, VectorUpsertItem } from "@legalis/core";
import { defaultCorpusDir } from "../manifest";
import { resolveEmbedding } from "../embeddings";
import { LocalVectorStore, VectorizeRestStore } from "../vectorstore";

interface RawChunk {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
}

const dir = process.argv[2] ?? defaultCorpusDir();
const chunksPath = path.join(dir, ".chunks", "chunks.jsonl");

let raw: string;
try {
  raw = await readFile(chunksPath, "utf8");
} catch {
  console.error(`No chunks at ${chunksPath} — run \`pnpm --filter @legalis/ingestion chunk\` first.`);
  process.exit(1);
}
const chunks = raw
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l) as RawChunk);

const { provider, dimensions, model } = resolveEmbedding();

const acct = process.env.CF_ACCOUNT_ID;
const token = process.env.CF_API_TOKEN;
const index = process.env.VECTORIZE_INDEX;
const useVectorize = Boolean(acct && token && index);
const store: VectorStore = useVectorize
  ? new VectorizeRestStore(acct!, token!, index!)
  : new LocalVectorStore(path.join(dir, ".chunks", "local-index.json"));

console.log(
  `Ingesting ${chunks.length} chunks · embed=${model} (${dimensions}d) · store=${useVectorize ? `Vectorize(${index})` : "local"}`,
);

// embed in batches (keep request/model batches small), collect items
const EMBED_BATCH = 16;
const items: VectorUpsertItem[] = [];
for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
  const batch = chunks.slice(i, i + EMBED_BATCH);
  const vectors = await provider.embed(
    batch.map((c) => c.text),
    "passage",
  );
  batch.forEach((c, j) => {
    const vector = vectors[j];
    if (vector) items.push({ id: c.id, vector, metadata: { ...c.metadata, text: c.text } });
  });
  if ((i / EMBED_BATCH) % 25 === 0 || i + EMBED_BATCH >= chunks.length) {
    console.log(`  embedded ${Math.min(i + EMBED_BATCH, chunks.length)}/${chunks.length}`);
  }
}

// upsert: one write locally; batched for Vectorize
if (store instanceof LocalVectorStore) {
  await store.upsert(items);
} else {
  const UPSERT_BATCH = 500;
  for (let i = 0; i < items.length; i += UPSERT_BATCH) {
    await store.upsert(items.slice(i, i + UPSERT_BATCH));
    console.log(`  upserted ${Math.min(i + UPSERT_BATCH, items.length)}/${items.length}`);
  }
}

console.log(`Ingest complete: ${items.length} vectors → ${useVectorize ? "Vectorize" : "local index"}`);
