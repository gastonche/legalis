import path from "node:path";
import {
  MockLLM,
  OpenAIProvider,
  answerWithSelfEval,
  type LLMProvider,
} from "@legalis/core";
import { defaultCorpusDir } from "../manifest";
import { resolveEmbedding } from "../embeddings";
import { LocalVectorStore } from "../vectorstore";

// Grounded slice + self-eval gate (M3+M4): retrieve → synthesize → judge →
// show / revise / re-retrieve / honest-downgrade, with the verification banner.
const question = process.argv.slice(2).join(" ").trim() || "How do I register a business in Cameroon?";
const dir = defaultCorpusDir();

const { provider: embedder } = resolveEmbedding();
const store = new LocalVectorStore(path.join(dir, ".chunks", "local-index.json"));
const key = process.env.OPENAI_API_KEY;
const llm: LLMProvider = key ? new OpenAIProvider(key, process.env.OPENAI_MODEL) : new MockLLM();

console.log(`LLM: ${llm.name}\n`);
const { answer: a, verdict: v, banner, chunks, iterations } = await answerWithSelfEval(question, {
  embedder,
  store,
  llm,
  topK: 8,
  maxIterations: 2,
});

console.log(`Q: ${question}\n`);
console.log(
  `REGIME: ${a.regime.applies}${a.regime.ohadaSupersedes ? " (OHADA supersedes)" : ""} — ${a.regime.rationale}`,
);
console.log(`CONFIDENCE: ${a.confidence}\n`);
console.log(`${a.answer}\n`);
console.log(`CITATIONS (${a.citations.length}):`);
for (const c of a.citations) {
  console.log(`  ${c.marker} ${c.sourceTitle} — ${c.locator} [${c.authority}/${c.language}]`);
  if (c.quote) console.log(`      “${c.quote.replace(/\s+/g, " ").slice(0, 130)}”`);
}

console.log(`\n── SELF-EVAL GATE (${iterations} revision${iterations === 1 ? "" : "s"}) ──`);
console.log(`  groundedness   ${v.groundedness.pass ? "✓" : "✗"} (${v.groundedness.score})  ${v.groundedness.notes}`);
console.log(`  citations      ${v.citationValidity.pass ? "✓" : "✗"}  ${v.citationValidity.invalid.map((i) => `${i.marker}:${i.reason}`).join("; ")}`);
console.log(`  jurisdiction   ${v.jurisdictionCorrect.pass ? "✓" : "✗"}  ${v.jurisdictionCorrect.notes}`);
console.log(`  uncertainty    ${v.uncertaintyHonest.pass ? "✓" : "✗"}  ${v.uncertaintyHonest.notes}`);
console.log(`  → overall=${v.overall} action=${v.action}`);
console.log(`\nBANNER [${banner.status}]: ${banner.message}`);
console.log(`  ${banner.checks.map((c) => `${c.passed ? "✓" : "✕"} ${c.name}`).join("   ")}`);
console.log(`\nSCOPE: ${a.scopeNote}`);
console.log(`RETRIEVED: ${chunks.map((c) => c.metadata.sourceId).slice(0, 8).join(", ")}`);
