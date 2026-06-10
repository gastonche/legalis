interface Section {
  h: string;
  p: string;
}

const TERMS: Section[] = [
  {
    h: "What Legalis is",
    p: "Legalis is a research tool that provides legal information about Cameroon law: what legal texts say, which regime governs a topic, and citations to primary sources. It is operated as a beta service and provided as-is.",
  },
  {
    h: "Not legal advice",
    p: "Legalis does not provide legal advice, does not create a lawyer–client relationship, and is not a substitute for a qualified Cameroonian lawyer. Answers are generated from retrieved sources and may be incomplete, outdated, or wrong — including answers marked “Verified”, which reflects an automated check, not a lawyer's review. Do not act or refrain from acting based on Legalis output without consulting a lawyer.",
  },
  {
    h: "Acceptable use",
    p: "Use Legalis lawfully and for its intended purpose: understanding Cameroon law. Do not use it to generate filings or legal documents you present as professionally prepared, to mislead others about the law, or to attempt to extract advice the product is designed not to give.",
  },
  {
    h: "Accuracy and sources",
    p: "We verify corpus texts against official versions at ingestion and cite sources so you can check every claim. The law changes; texts get amended. The cited source — not the summary — is authoritative, and the official gazette version prevails over everything.",
  },
  {
    h: "Liability",
    p: "To the maximum extent permitted by law, Legalis and its operators accept no liability for decisions made on the basis of the service's output. Your sole remedy for dissatisfaction is to stop using the service.",
  },
  {
    h: "Changes",
    p: "We may update these terms as the beta evolves. Material changes will be announced on this page with the date below revised.",
  },
];

const PRIVACY: Section[] = [
  {
    h: "What we collect",
    p: "Conversations: the questions you ask and the answers generated, stored under a per-conversation identifier so your chat survives a refresh and the assistant remembers context within a conversation. We do not require an account during the beta.",
  },
  {
    h: "How conversations are used",
    p: "Your questions are sent to model providers (currently OpenAI) and a web-search provider (Tavily) to generate answers, subject to their processing terms. We may review anonymised conversations to improve grounding quality and the corpus.",
  },
  {
    h: "What we don't do",
    p: "We don't sell your data, we don't use your conversations for advertising, and we don't build marketing profiles. Legalis has no trackers beyond what is necessary to operate the service.",
  },
  {
    h: "A practical caution",
    p: "Treat the chat like a public-facing research tool: don't paste identity numbers, case files, or details that could prejudice a live matter. For anything sensitive, speak to a lawyer — communications with Legalis are not privileged.",
  },
  {
    h: "Retention and deletion",
    p: "Conversations are retained to operate the service during the beta. To request deletion of a conversation, write to privacy@legalis.cm with the conversation link (/c/…).",
  },
  {
    h: "Contact",
    p: "Privacy questions: privacy@legalis.cm.",
  },
];

export function Legal({ kind }: { kind: "terms" | "privacy" }) {
  const sections = kind === "terms" ? TERMS : PRIVACY;
  const title = kind === "terms" ? "Terms of use" : "Privacy";
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
      <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.28em] text-primary">Legal</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-ink">{title}</h1>
      <p className="mt-2 font-mono text-xs text-ink-faint">Beta · last updated June 2026</p>
      <div className="mt-8 space-y-8">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="font-serif text-xl font-semibold text-ink">{s.h}</h2>
            <p className="mt-2 leading-relaxed text-ink-soft">{s.p}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
