import type { EmbeddingProvider } from "@legalis/core";

/**
 * Two embedding backends behind the shared EmbeddingProvider interface:
 *  - LocalEmbedding: Transformers.js multilingual model, runs offline (dev/CI/demo).
 *  - CloudflareRestEmbedding: Workers AI @cf/baai/bge-m3 via REST (when provisioned).
 * Query-time embeddings inside the Worker use the AI binding directly (apps/agent).
 */

export interface EmbeddingInfo {
  provider: EmbeddingProvider;
  dimensions: number;
  model: string;
}

// multilingual-e5 is instruction-tuned: it needs "query:" / "passage:" prefixes,
// which markedly improves cross-lingual (EN↔FR) retrieval over plain MiniLM.
const LOCAL_MODEL = "Xenova/multilingual-e5-small"; // 384-dim, FR+EN
const LOCAL_DIMS = 384;
const CF_MODEL = "@cf/baai/bge-m3"; // 1024-dim, multilingual (prefix-free)
const CF_DIMS = 1024;

export class LocalEmbedding implements EmbeddingProvider {
  readonly name = `local:${LOCAL_MODEL}`;
  // lazy — the model (~120MB) downloads on first use
  private pipe: Promise<(texts: string[], opts: object) => Promise<{ tolist(): number[][] }>> | null =
    null;

  private async getPipe() {
    if (!this.pipe) {
      this.pipe = import("@huggingface/transformers").then(async (t) => {
        const p = await t.pipeline("feature-extraction", LOCAL_MODEL);
        return (texts: string[], opts: object) =>
          p(texts, opts) as Promise<{ tolist(): number[][] }>;
      });
    }
    return this.pipe;
  }

  async embed(texts: string[], kind: "query" | "passage" = "passage"): Promise<number[][]> {
    if (texts.length === 0) return [];
    const prefix = kind === "query" ? "query: " : "passage: ";
    const pipe = await this.getPipe();
    const out = await pipe(
      texts.map((t) => prefix + t),
      { pooling: "mean", normalize: true },
    );
    return out.tolist();
  }
}

export class CloudflareRestEmbedding implements EmbeddingProvider {
  readonly name = `cf:${CF_MODEL}`;
  constructor(
    private accountId: string,
    private apiToken: string,
  ) {}

  // bge-m3 is prefix-free; `kind` is accepted for interface parity and ignored.
  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${CF_MODEL}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ text: texts }),
      },
    );
    if (!res.ok) {
      throw new Error(`Workers AI embedding failed: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as { result?: { data?: number[][] }; errors?: unknown };
    const data = json.result?.data;
    if (!data) throw new Error(`Workers AI embedding: no data (${JSON.stringify(json.errors)})`);
    return data;
  }
}

/** Pick the backend from the environment. Cloudflare if creds present, else local. */
export function resolveEmbedding(): EmbeddingInfo {
  const acct = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_API_TOKEN;
  if (acct && token) {
    return { provider: new CloudflareRestEmbedding(acct, token), dimensions: CF_DIMS, model: CF_MODEL };
  }
  return { provider: new LocalEmbedding(), dimensions: LOCAL_DIMS, model: LOCAL_MODEL };
}
