import { answerWithSelfEval, type LLMProvider } from "@legalis/core";
import type { Provider } from "promptopus";
import { FixtureStore, HashEmbedding } from "./retrieval";

/**
 * The Legalis pipeline as a promptopus Provider: the case prompt is the user
 * question; the "output" is the JSON of the gated result (answer + verdict +
 * banner), which the custom graders inspect. Keyless by default (scripted LLMs +
 * fixture retrieval); pass an OpenAIProvider-backed llm for real-model suites.
 */
export function legalisProvider(name: string, model: string, llm: LLMProvider): Provider {
  const embedder = new HashEmbedding();
  const store = new FixtureStore();
  return {
    name,
    model,
    async generate(prompt: string) {
      const started = Date.now();
      const result = await answerWithSelfEval(prompt, { embedder, store, llm, topK: 8, maxIterations: 2 });
      const text = JSON.stringify({
        answer: result.answer,
        banner: result.banner,
        verdict: result.verdict,
        iterations: result.iterations,
        retrievedSourceIds: [...new Set(result.chunks.map((c) => c.metadata.sourceId))],
      });
      return {
        text,
        tokensIn: Math.ceil(prompt.length / 4),
        tokensOut: Math.ceil(text.length / 4),
        latencyMs: Date.now() - started,
        costUsd: 0,
      };
    },
  };
}
