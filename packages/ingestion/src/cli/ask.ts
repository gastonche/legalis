import path from "node:path";
import { MockLLM, OpenAIProvider, groundedAnswer, type LLMProvider } from "@legalis/core";
import { defaultCorpusDir } from "../manifest";
import { resolveEmbedding } from "../embeddings";
import { LocalVectorStore } from "../vectorstore";

// Single-step grounded slice (Node demo): question → local retrieval → OpenAI
// synthesized, cited, regime-aware answer with scope note + honest refusal.
const question = process.argv.slice(2).join(" ").trim() || "How do I register a business in Cameroon?";
const dir = defaultCorpusDir();

const { provider: embedder } = resolveEmbedding();
const store = new LocalVectorStore(path.join(dir, ".chunks", "local-index.json"));
const key = process.env.OPENAI_API_KEY;
const llm: LLMProvider = key ? new OpenAIProvider(key, process.env.OPENAI_MODEL) : new MockLLM();

console.log(`LLM: ${llm.name}\n`);
const result = await groundedAnswer(question, { embedder, store, llm, topK: 8 });
const a = result.answer;

console.log(`Q: ${question}\n`);
console.log(
  `REGIME: ${a.regime.applies}${a.regime.ohadaSupersedes ? " (OHADA supersedes)" : ""} — ${a.regime.rationale}`,
);
console.log(`CONFIDENCE: ${a.confidence}   GROUNDED: ${result.grounded}\n`);
console.log(`${a.answer}\n`);
console.log(`CITATIONS (${a.citations.length}):`);
for (const c of a.citations) {
  console.log(`  ${c.marker} ${c.sourceTitle} — ${c.locator} [${c.authority}/${c.language}]`);
  if (c.quote) console.log(`      “${c.quote.replace(/\s+/g, " ").slice(0, 140)}”`);
}
if (result.invalidCitations.length) {
  console.log(`\nREJECTED by citation-validation: ${result.invalidCitations.map((i) => `${i.marker} (${i.reason})`).join("; ")}`);
}
console.log(`\nSCOPE: ${a.scopeNote}`);
console.log(`\nRETRIEVED: ${result.chunks.map((c) => `${c.metadata.sourceId}/${c.metadata.articleSection ?? "?"}`).slice(0, 8).join(", ")}`);
