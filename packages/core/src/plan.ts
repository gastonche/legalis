import type { LLMProvider } from "./ports";
import type { ChatMessage } from "./agentStream";
import { stripFences } from "./synthesize";

export interface RetrievalPlan {
  domain: string;
  regimeHint: "common-law" | "civil-law" | "ohada" | "mixed" | "unclear";
  language: "en" | "fr" | "both";
  needsWeb: boolean;
  pivotalRegionMissing: boolean;
  corpusQuery: string;
  webQueryEn: string;
  webQueryFr: string;
}

const PLAN_SYSTEM = `You are the PLANNING step of a Cameroon-law research agent. Classify the QUESTION (using any prior CONVERSATION) and plan retrieval. Output a SINGLE JSON object, no prose:
{
 "domain": short label e.g. "labour" | "business/OHADA" | "family" | "criminal" | "tax" | "land" | "constitutional" | "general",
 "regimeHint": "common-law"|"civil-law"|"ohada"|"mixed"|"unclear",
 "language": "en"|"fr"|"both",
 "needsWeb": boolean,            // true if it needs current/procedural/recent info beyond a static corpus of primary legal TEXTS (latest amendments, fees, official procedures, news, case updates); false for settled black-letter law
 "pivotalRegionMissing": boolean,// true if the answer materially depends on Anglophone (NW/SW, common law / customary) vs Francophone (civil law) region AND the user has NOT named a region or town. This is USUALLY pivotal for: intestate succession / inheritance, land tenure, marriage / divorce / matrimonial property, and other family or customary matters — the two systems diverge sharply. Set false when OHADA or a national statute governs uniformly nationwide (most business, tax, criminal, labour matters).
 "corpusQuery": string,         // focused semantic-search query for the corpus
 "webQueryEn": string,          // English web query (include "Cameroon")
 "webQueryFr": string           // French web query (include "Cameroun")
}`;

/** Classify + plan retrieval (one bounded LLM call). Degrades to a safe default on error. */
export async function planRetrieval(
  question: string,
  history: ChatMessage[],
  llm: LLMProvider,
): Promise<RetrievalPlan> {
  const ctx = history
    .slice(-3)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");
  const fallback: RetrievalPlan = {
    domain: "general",
    regimeHint: "unclear",
    language: "both",
    needsWeb: false,
    pivotalRegionMissing: false,
    corpusQuery: question,
    webQueryEn: `${question} Cameroon law`,
    webQueryFr: `${question} Cameroun droit`,
  };
  try {
    const raw = await llm.complete({
      system: PLAN_SYSTEM,
      prompt: `${ctx ? `CONVERSATION:\n${ctx}\n\n` : ""}QUESTION:\n${question}`,
      json: true,
      temperature: 0,
      maxTokens: 400,
    });
    const p = JSON.parse(stripFences(raw)) as Partial<RetrievalPlan>;
    return {
      domain: p.domain ?? fallback.domain,
      regimeHint: p.regimeHint ?? fallback.regimeHint,
      language: p.language ?? fallback.language,
      needsWeb: Boolean(p.needsWeb),
      pivotalRegionMissing: Boolean(p.pivotalRegionMissing),
      corpusQuery: p.corpusQuery || fallback.corpusQuery,
      webQueryEn: p.webQueryEn || fallback.webQueryEn,
      webQueryFr: p.webQueryFr || fallback.webQueryFr,
    };
  } catch {
    return fallback;
  }
}
