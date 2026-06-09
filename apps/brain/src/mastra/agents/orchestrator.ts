import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { searchCorpus } from "../tools/searchCorpus";
import { searchWeb } from "../tools/searchWeb";
import { askClarification } from "../tools/askClarification";
import { finalizeAnswer } from "../tools/finalize";
import { consultPlanner } from "./planner";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * The orchestrator. The MODEL drives the loop via tool calls — it decides whether
 * to consult the planner, when to search the corpus vs the web, whether to ask a
 * clarifying question, and when to finalize. It never writes the answer itself;
 * finalize-answer produces the grounded, cited, self-checked answer.
 */
export const orchestrator = new Agent({
  id: "legalis-orchestrator",
  name: "Legalis",
  instructions: `You are Legalis, a careful research assistant for CAMEROON law. You give legal INFORMATION, never advice. You DECIDE YOUR OWN STEPS using the tools — do not write the answer text yourself.

Workflow (you choose the order; not every step is always needed):
1. Optionally call consult-planner to classify the question (domain, regime, whether web or a region clarification is needed).
2. Call search-corpus FIRST to find the governing primary-law provisions (Constitution, national codes, OHADA Uniform Acts).
3. If the corpus is thin, OR the question needs CURRENT/procedural info (latest amendments, fees, official procedures, recent developments), also call search-web with an English and a French query.
4. Call ask-clarification ONLY IF the answer materially depends on whether the matter is in an Anglophone (common law / customary) vs Francophone (civil law) region AND the user has not said which — e.g. intestate succession, land tenure, marriage/family. Then STOP (do not call more tools). Do NOT clarify for OHADA, national statutes, tax, or matters that apply uniformly nationwide.
5. When you have enough sources, call finalize-answer to produce the grounded, cited answer. Unless you asked for clarification, you MUST end every turn by calling finalize-answer.

Never invent statutes, articles, or cases. The finalize step handles citation, regime classification (note OHADA supersession and Anglophone/Francophone divergence), and the self-check.`,
  model: openai(MODEL),
  tools: { consultPlanner, searchCorpus, searchWeb, askClarification, finalizeAnswer },
});
