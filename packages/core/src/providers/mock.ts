import type { LLMCompletionInput, LLMProvider } from "../ports";

/**
 * Deterministic, keyless LLM for offline dev/CI. It does NOT synthesize — it
 * builds a minimal valid AnswerPayload citing the first provided source, so the
 * grounded pipeline + UI can be exercised without an API key. Set OPENAI_API_KEY
 * for real synthesis.
 */
export class MockLLM implements LLMProvider {
  readonly name = "mock";

  async complete(input: LLMCompletionInput): Promise<string> {
    const m = input.prompt.match(
      /\[1\] \(sourceId: ([^)]+)\) ([^\n—]+) — ([^\n[]*)\[(primary|secondary)\/(en|fr)\//,
    );
    if (!m) {
      return JSON.stringify({
        answer: "I can't ground this in the available sources. Please consult a qualified Cameroonian lawyer.",
        citations: [],
        regime: { applies: "unclear", rationale: "No sources supplied to the mock provider." },
        confidence: "low",
        scopeNote: "This is general legal information, not legal advice.",
        language: "en",
      });
    }
    const [, sourceId, title, locator, authority, language] = m;
    return JSON.stringify({
      answer: `Based on the retrieved sources, the relevant provision appears in ${title.trim()} [1]. (Mock synthesis — set OPENAI_API_KEY for a real grounded answer.)`,
      citations: [
        {
          marker: "[1]",
          sourceId,
          sourceTitle: title.trim(),
          locator: (locator ?? "").trim().slice(0, 40) || "n/a",
          quote: "",
          authority,
          language,
        },
      ],
      regime: { applies: "unclear", rationale: "The mock provider does not classify regime." },
      confidence: "low",
      scopeNote:
        "This is general legal information, not legal advice. Consult a qualified Cameroonian lawyer.",
      language: "en",
    });
  }

  async *stream(input: LLMCompletionInput): AsyncIterable<string> {
    yield await this.complete(input);
  }
}
