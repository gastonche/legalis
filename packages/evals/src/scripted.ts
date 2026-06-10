import type { LLMCompletionInput, LLMProvider } from "@legalis/core";

/**
 * Deterministic LLMs for offline evals. They route on the REAL system prompts the
 * pipeline sends (synthesis vs judge) and parse the REAL source blocks, so the
 * whole grounded pipeline — retrieval formatting, citation validation, the
 * self-eval gate — runs end-to-end with zero keys and stable outputs.
 */

interface ParsedSource {
  n: number;
  sourceId: string;
  title: string;
  locator: string;
  authority: string;
  language: string;
  text: string;
}

/** Parse the numbered SOURCES blocks produced by core's formatSources(). */
function parseSources(prompt: string): ParsedSource[] {
  const marker = prompt.indexOf("SOURCES");
  const body = marker >= 0 ? prompt.slice(prompt.indexOf("\n", marker) + 1) : prompt;
  const out: ParsedSource[] = [];
  for (const block of body.split("\n\n---\n\n")) {
    const m = block.match(
      /\[(\d+)\] \(sourceId: ([^)]+)\) (.*?) \[(primary|secondary)\/(en|fr)\/[^\]]*\]\n([\s\S]*)/,
    );
    if (!m) continue;
    // "Title — locator"; titles may themselves contain em-dashes, so split on the LAST one.
    const titleLoc = m[3];
    const lastDash = titleLoc.lastIndexOf(" — ");
    out.push({
      n: Number(m[1]),
      sourceId: m[2],
      title: (lastDash > 0 ? titleLoc.slice(0, lastDash) : titleLoc).trim(),
      locator: lastDash > 0 ? titleLoc.slice(lastDash + 3).trim() : "",
      authority: m[4],
      language: m[5],
      text: m[6].trim(),
    });
  }
  return out;
}

const isJudge = (input: LLMCompletionInput): boolean => input.system.includes("STRICT auditor");
const isStructure = (input: LLMCompletionInput): boolean => input.system.includes("DRAFT ANSWER");

const STOP = new Set([
  "cameroon", "cameroun", "what", "does", "this", "that", "with", "their", "shall",
  "article", "section", "under", "have", "from", "been", "when", "which", "loi",
  "quelle", "comment", "dans", "pour", "elle", "sont", "être",
]);

const contentTokens = (s: string): Set<string> =>
  new Set(
    (s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(/[a-z]{4,}/g) ?? []).filter(
      (t) => !STOP.has(t),
    ),
  );

/** A source is citable only if it shares ≥2 content words with the question. */
function isRelevant(question: string, sourceText: string): boolean {
  const q = contentTokens(question);
  const s = contentTokens(sourceText);
  let overlap = 0;
  for (const t of q) if (s.has(t)) overlap++;
  return overlap >= 2;
}

/** Keyword → regime classification, deterministic. */
function classify(question: string): { applies: string; ohadaSupersedes: boolean } {
  const q = question.toLowerCase();
  if (/(company|société|commerce|business|registre|rccm|commercial)/.test(q))
    return { applies: "ohada", ohadaSupersedes: true };
  if (/(dismiss|employ|notice|labour|labor|licenci)/.test(q)) return { applies: "mixed", ohadaSupersedes: false };
  if (/(tax|impôt|imp[oô]t)/.test(q)) return { applies: "mixed", ohadaSupersedes: false };
  if (/(constitution|president|state)/.test(q)) return { applies: "mixed", ohadaSupersedes: false };
  return { applies: "unclear", ohadaSupersedes: false };
}

function questionFrom(prompt: string): string {
  const m = prompt.match(/QUESTION[^:]*:\n([^\n]+)/);
  return m ? m[1] : prompt.slice(0, 120);
}

/** A verbatim quote: the first 12+ words of the source text (passes validateCitations). */
const quoteFrom = (text: string): string => text.split(/\s+/).slice(0, 14).join(" ");

function passVerdict(): string {
  return JSON.stringify({
    groundedness: { score: 0.9, pass: true, notes: "scripted: claims mirror cited sources" },
    citationValidity: { pass: true, invalid: [] },
    jurisdictionCorrect: { pass: true, notes: "scripted" },
    uncertaintyHonest: { pass: true, notes: "scripted" },
    overall: "pass",
    action: "show",
    iteration: 0,
  });
}

function failVerdict(reason: string): string {
  return JSON.stringify({
    groundedness: { score: 0.2, pass: false, notes: reason },
    citationValidity: { pass: false, invalid: [] },
    jurisdictionCorrect: { pass: true, notes: "" },
    uncertaintyHonest: { pass: false, notes: reason },
    overall: "downgrade",
    action: "downgrade",
    iteration: 0,
  });
}

/** Judge behavior shared by both LLMs: pass iff the draft actually has citations. */
function judge(input: LLMCompletionInput): string {
  const noCitations = /DRAFT CITATIONS:\n\(none\)/.test(input.prompt);
  return noCitations ? failVerdict("draft cites nothing from the sources") : passVerdict();
}

/** Grounded scripted model: cites the top sources with verbatim quotes. */
export class ScriptedLLM implements LLMProvider {
  readonly name = "eval:scripted";

  async complete(input: LLMCompletionInput): Promise<string> {
    if (isJudge(input)) return judge(input);
    const sources = parseSources(input.prompt);
    const question = questionFrom(input.prompt);
    const regime = classify(question);
    const picks = sources
      .filter((s) => s.text.length > 60 && isRelevant(question, s.text))
      .slice(0, 2);
    if (picks.length === 0) {
      return JSON.stringify({
        answer: "I can't ground this in the available sources, so I won't guess. Please consult a qualified Cameroonian lawyer.",
        citations: [],
        regime: { applies: "unclear", rationale: "No grounded sources retrieved." },
        confidence: "low",
        scopeNote: "Legal information, not legal advice.",
        language: "en",
      });
    }
    return JSON.stringify({
      answer:
        picks.map((s, i) => `According to ${s.title} (${s.locator || "the text"}), the retrieved provision governs this question [${i + 1}].`).join(" ") +
        " For your specific situation, consult a qualified Cameroonian lawyer.",
      citations: picks.map((s, i) => ({
        marker: `[${i + 1}]`,
        sourceId: s.sourceId,
        sourceTitle: s.title,
        locator: s.locator || "n/a",
        quote: quoteFrom(s.text),
        authority: s.authority,
        language: s.language,
      })),
      regime: { ...regime, rationale: "Scripted keyword classification over the question." },
      confidence: "high",
      scopeNote: "Legal information, not legal advice — consult a qualified Cameroonian lawyer.",
      language: "en",
    });
  }

  async *stream(input: LLMCompletionInput): AsyncIterable<string> {
    yield await this.complete(input);
  }
}

/**
 * Adversarial scripted model: fabricates citations (invented sourceId + quote not
 * present in any source). The pipeline's citation-integrity layer must strip them
 * and the gate must downgrade — this is what the integrity suite asserts.
 */
export class FabricatingLLM implements LLMProvider {
  readonly name = "eval:fabricator";

  async complete(input: LLMCompletionInput): Promise<string> {
    if (isJudge(input)) return judge(input);
    if (isStructure(input)) return new ScriptedLLM().complete(input);
    const question = questionFrom(input.prompt);
    return JSON.stringify({
      answer:
        "Article 999 of the Cameroon Code of Imaginary Obligations clearly resolves this in your favour [1]. You may also rely on the 2031 Supreme Court decision in Ngono v. State [2].",
      citations: [
        {
          marker: "[1]",
          sourceId: "imaginary-code-2099",
          sourceTitle: "Code of Imaginary Obligations",
          locator: "Article 999",
          quote: "any person may rely on imaginary obligations to resolve disputes",
          authority: "primary",
          language: "en",
        },
        {
          marker: "[2]",
          sourceId: "fake-case-2031",
          sourceTitle: "Ngono v. State (2031)",
          locator: "p. 12",
          quote: "the court finds entirely in favour of the appellant on all grounds",
          authority: "primary",
          language: "en",
        },
      ],
      regime: { applies: "unclear", rationale: `Fabricated for: ${question.slice(0, 60)}` },
      confidence: "high",
      scopeNote: "Legal information, not legal advice.",
      language: "en",
    });
  }

  async *stream(input: LLMCompletionInput): AsyncIterable<string> {
    yield await this.complete(input);
  }
}
