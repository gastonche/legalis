import type { AnswerPayload, ComponentDirective, StreamEvent } from "@legalis/contracts";

/**
 * Milestone-1 scripted stream. Pure function of the question — no LLM, no I/O —
 * so the stub Worker/DO exercises the REAL contracts + core code end-to-end and
 * the SPA can render every channel (trace, narration, answer tokens) and every
 * component in the registry. Replaced by the real agent loop in later milestones.
 */

const SCOPE_NOTE =
  "This is general legal information, not legal advice. Cameroon law differs by region " +
  "(Anglophone common law vs Francophone civil law), and OHADA rules can override national law " +
  "on business matters. For your specific situation, consult a qualified Cameroonian lawyer.";

export function demoStream(question: string): StreamEvent[] {
  const q = question.trim() || "How do I register a small business in Cameroon?";

  const sources: ComponentDirective = {
    component: "sources",
    props: {
      items: [
        {
          id: "audcg-2010-fr",
          title: "OHADA — Acte uniforme portant sur le droit commercial général (2010)",
          authority: "primary",
          sourceType: "ohada",
          language: "fr",
          locator: "Art. 25–44 (RCCM)",
        },
        {
          id: "audcg-2010-en",
          title: "OHADA — Uniform Act on General Commercial Law (2010)",
          authority: "primary",
          sourceType: "ohada",
          language: "en",
          locator: "Arts. 25–44 (RCCM)",
        },
      ],
    },
  };

  const answerPayload: AnswerPayload = {
    answer:
      "To run a business in Cameroon you normally register in the **Trade and Personal Property " +
      "Credit Register (RCCM / Registre du Commerce et du Crédit Mobilier)** at the registry of the " +
      "competent first-instance court for your area [1]. A sole trader registers as a *commerçant*; " +
      "a company registers after its statutes are finalised. This requirement comes from OHADA " +
      "business law, which applies uniformly across Cameroon [1].",
    citations: [
      {
        marker: "[1]",
        sourceId: "audcg-2010-fr",
        sourceTitle: "OHADA Uniform Act on General Commercial Law (2010)",
        locator: "Arts. 25–44",
        quote:
          "Toute personne physique ayant la qualité de commerçant … est tenue de requérir son " +
          "immatriculation au registre du commerce et du crédit mobilier.",
        authority: "primary",
        language: "fr",
      },
    ],
    regime: {
      applies: "ohada",
      rationale:
        "Business registration is governed by the OHADA Uniform Act on General Commercial Law, " +
        "which supersedes national commercial provisions in member states, including Cameroon.",
      ohadaSupersedes: true,
    },
    confidence: "medium",
    scopeNote: SCOPE_NOTE,
    language: "en",
  };

  const clarify: ComponentDirective = {
    component: "clarifying-question",
    props: {
      question: "Which part of Cameroon is this about? It can change which rules apply.",
      kind: "region",
      options: [
        { id: "anglophone", label: "North-West / South-West", hint: "Common-law regions" },
        { id: "francophone", label: "Other regions", hint: "Civil-law regions" },
        { id: "unsure", label: "I'm not sure" },
      ],
    },
  };

  const banner: ComponentDirective = {
    component: "verification-banner",
    props: {
      status: "verified",
      message:
        "Checked before showing: every legal claim is backed by a cited source, and the OHADA " +
        "business-law regime was confirmed.",
      checks: [
        { name: "Grounded in sources", passed: true },
        { name: "Citations valid", passed: true },
        { name: "Regime correct (OHADA)", passed: true },
        { name: "Uncertainty surfaced", passed: true },
      ],
    },
  };

  const lawyer: ComponentDirective = {
    component: "talk-to-a-lawyer",
    props: {
      message:
        "For your specific situation — especially anything time-sensitive — a qualified Cameroonian " +
        "lawyer can confirm how this applies to you.",
      jurisdictionNote:
        "Business registration is OHADA-wide, but related formalities can differ by region.",
    },
  };

  const answerTokens = answerPayload.answer.match(/\S+\s*/g) ?? [answerPayload.answer];

  return [
    { type: "control", phase: "open" },

    { type: "trace", step: "understand", phase: "start", status: "ok" },
    {
      type: "narration",
      step: "understand",
      text: `Got it — let me work through “${q}”. First, which region's law applies…`,
    },
    {
      type: "trace",
      step: "understand",
      phase: "end",
      status: "ok",
      detail: "domain=business; regime candidate=OHADA",
    },
    { type: "component", directive: clarify },

    { type: "trace", step: "retrieve", phase: "start", status: "ok" },
    {
      type: "narration",
      step: "retrieve",
      text: "Pulling the controlling texts from the Cameroon corpus and OHADA…",
    },
    { type: "trace", step: "retrieve", phase: "end", status: "ok", detail: "2 primary sources" },
    { type: "component", directive: sources },

    {
      type: "narration",
      step: "synthesize",
      text: "Here's the plain-language answer, with each point tied to a source.",
    },
    ...answerTokens.map((token): StreamEvent => ({ type: "answer-token", token })),

    { type: "trace", step: "self-eval", phase: "start", status: "ok" },
    {
      type: "narration",
      step: "self-eval",
      text: "Before I show this, let me check it's grounded and the regime is right…",
    },
    {
      type: "trace",
      step: "self-eval",
      phase: "end",
      status: "ok",
      detail: "groundedness=0.9; citations valid",
    },
    { type: "component", directive: banner },
    { type: "component", directive: { component: "answer", props: answerPayload } },
    { type: "component", directive: lawyer },

    { type: "control", phase: "done" },
  ];
}
