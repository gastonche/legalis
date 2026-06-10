import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RetrievedChunk } from "@legalis/contracts";
import type { EmbeddingProvider, VectorQueryOptions, VectorStore } from "@legalis/core";

/**
 * Deterministic, keyless retrieval for offline evals: a hashed bag-of-words
 * embedding + a cosine store over committed fixture chunks (real corpus excerpts).
 * Crude as semantics, but stable — "dismiss without notice" reliably ranks the
 * Labour Code fixtures first, which is all behavior tests need.
 */
const DIM = 256;

// High-frequency tokens that would otherwise dominate raw term-frequency cosine.
const STOP = new Set([
  "the", "and", "that", "with", "shall", "this", "for", "from", "are", "was", "were",
  "has", "have", "had", "been", "being", "not", "any", "all", "may", "its", "their",
  "such", "other", "upon", "into", "also", "des", "les", "une", "est", "sont", "dans",
  "par", "aux", "sur", "qui", "que", "pour", "ses", "ces", "ainsi", "tout", "tous",
]);

const tokenize = (s: string): string[] =>
  (s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .match(/[a-z]{3,}/g) ?? []).filter((t) => !STOP.has(t));

function hashToken(t: string): number {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % DIM;
}

function embedText(text: string): number[] {
  const v = new Array<number>(DIM).fill(0);
  for (const t of tokenize(text)) v[hashToken(t)] += 1;
  // sqrt damping so repeated common words don't drown discriminative terms
  for (let i = 0; i < DIM; i++) v[i] = Math.sqrt(v[i]);
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

export class HashEmbedding implements EmbeddingProvider {
  readonly name = "eval:hash-bow";
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(embedText);
  }
}

interface FixtureChunk {
  id: string;
  text: string;
  metadata: RetrievedChunk["metadata"];
}

const here = path.dirname(fileURLToPath(import.meta.url));

export function loadFixtures(): FixtureChunk[] {
  return JSON.parse(readFileSync(path.join(here, "..", "fixtures", "chunks.json"), "utf8")) as FixtureChunk[];
}

export const FIXTURE_SOURCE_IDS = new Set(loadFixtures().map((c) => c.metadata.sourceId));

export class FixtureStore implements VectorStore {
  private entries = loadFixtures().map((c) => ({ chunk: c, vector: embedText(c.text) }));

  async upsert(): Promise<void> {
    throw new Error("fixture store is read-only");
  }

  async query(vector: number[], opts: VectorQueryOptions = {}): Promise<RetrievedChunk[]> {
    const scored = this.entries.map(({ chunk, vector: v }) => ({
      chunk,
      score: v.reduce((s, x, i) => s + x * (vector[i] ?? 0), 0),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, opts.topK ?? 8).map(({ chunk, score }) => ({
      id: chunk.id,
      text: chunk.text,
      score,
      metadata: chunk.metadata,
    }));
  }
}
