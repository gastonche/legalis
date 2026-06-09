import path from "node:path";
import type { VectorStore } from "@legalis/core";
import { defaultCorpusDir } from "../manifest";
import { resolveEmbedding } from "../embeddings";
import { LocalVectorStore, VectorizeRestStore } from "../vectorstore";

// Retrieval smoke test: embed a question, query the store, print grounded hits.
const query = process.argv.slice(2).join(" ").trim() || "How do I register a business in Cameroon?";
const dir = defaultCorpusDir();

const { provider } = resolveEmbedding();
const acct = process.env.CF_ACCOUNT_ID;
const token = process.env.CF_API_TOKEN;
const index = process.env.VECTORIZE_INDEX;
const store: VectorStore =
  acct && token && index
    ? new VectorizeRestStore(acct, token, index)
    : new LocalVectorStore(path.join(dir, ".chunks", "local-index.json"));

const [vector] = await provider.embed([query], "query");
if (!vector) throw new Error("embedding failed");
const results = await store.query(vector, { topK: 6 });

console.log(`\nQ: ${query}\n`);
results.forEach((r, i) => {
  const m = r.metadata;
  const tags = [m.sourceType, m.language, m.authority].join("/");
  console.log(`${i + 1}. [${r.score.toFixed(3)}] ${m.citation ?? m.title}  (${tags})`);
  if (m.headingPath) console.log(`     ${m.headingPath}`);
  console.log(`     ${r.text.replace(/\s+/g, " ").slice(0, 200)}…\n`);
});
