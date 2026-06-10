import { BookIcon, CheckIcon, PinIcon, ScaleIcon, ShieldCheckIcon, SparkIcon } from "../components/icons";
import { CORPUS_COUNT } from "./corpusData";

const PIPELINE = [
  {
    icon: SparkIcon,
    title: "An agent plans the research",
    body: "Legalis is an agent, not a search box. For each question it decides its own steps: classify the area of law, search the corpus, widen to official web sources when something current is needed, or stop and ask you a clarifying question when the answer genuinely depends on it.",
  },
  {
    icon: BookIcon,
    title: "Retrieval from verified primary law",
    body: `The core of every answer is retrieval from ${CORPUS_COUNT} verified primary texts — constitutional texts, national codes and statutes, and the OHADA Uniform Acts — chunked article-by-article in English and French. Web results are restricted to an allowlist of official and scholarly sources (government portals, OHADA, ILO, WIPO, law-library guides).`,
  },
  {
    icon: PinIcon,
    title: "The bijural question, taken seriously",
    body: "Cameroon operates two legal traditions: English common law in the North-West and South-West, civil law elsewhere — with OHADA superseding national law on most business matters. Every answer states which regime it relies on. When your region changes the answer (succession, land, family), Legalis asks instead of guessing.",
  },
  {
    icon: ShieldCheckIcon,
    title: "A verification gate, before you see anything",
    body: "Every draft is graded by a second model on four checks: is each claim grounded in a retrieved source, are the citations real and quoted accurately, is the regime classification right, and is uncertainty surfaced honestly. Failing answers are visibly downgraded — you'll see “Unverified” rather than confident-sounding fiction.",
  },
];

const FAQ = [
  {
    q: "Is this legal advice?",
    a: "No. Legalis provides legal information — what the law says, which texts govern, how the regimes differ. It does not apply the law to your specific facts, and it consistently recommends a qualified Cameroonian lawyer for decisions. This boundary is enforced in the product's behaviour, not just stated here.",
  },
  {
    q: "Where do the answers come from?",
    a: "From retrieval, not memory. Each claim must be supported by a passage in the verified corpus or an allowlisted official web source, and is cited so you can open the text yourself. When the sources don't support an answer, Legalis says so.",
  },
  {
    q: "What does the “Verified” badge mean?",
    a: "It means the answer passed the self-check: claims grounded in retrieved sources, citations quoted accurately, regime classification confirmed, and uncertainty surfaced. “Partly grounded” and “Unverified” mean exactly what they say — treat those as starting points, not conclusions.",
  },
  {
    q: "English or French?",
    a: "Both. The corpus holds official versions in both languages where they exist, retrieval is cross-lingual (an English question can ground in a French text), and answers flag the language of each source.",
  },
  {
    q: "What does it cost?",
    a: "Legalis is free during the beta. We'll be transparent about pricing well before that changes.",
  },
];

export function HowItWorks() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
      <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.28em] text-primary">How it works</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-ink">
        Grounded by design, <span className="italic text-primary-ink">checked before shown</span>
      </h1>
      <p className="mt-4 text-lg text-ink-soft">
        Legal questions deserve a higher standard than confident text generation. This page explains
        the four mechanisms behind every Legalis answer — so you can decide how much to trust it.
      </p>

      <ol className="mt-12 space-y-8">
        {PIPELINE.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <s.icon className="size-5" />
              </span>
              {i < PIPELINE.length - 1 ? <span className="mt-2 w-px flex-1 bg-line" /> : null}
            </div>
            <div className="pb-2">
              <h2 className="font-serif text-xl font-semibold text-ink">{s.title}</h2>
              <p className="mt-2 leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 rounded-card border border-line bg-surface p-6 shadow-card">
        <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-ink">
          <ScaleIcon className="size-5 text-primary" /> The boundary
        </h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Legalis tells you <em>where the law stands</em>. It does not tell you what to do. Applying
          the law to your facts — deadlines, evidence, strategy, filings — is legal advice, and that
          belongs with a qualified Cameroonian lawyer who is accountable for it. Every answer carries
          this scope note, and answers in lawyer-critical areas point you to one explicitly.
        </p>
      </div>

      <h2 className="mt-14 font-serif text-2xl font-semibold text-ink">Frequently asked</h2>
      <dl className="mt-6 space-y-6">
        {FAQ.map((f) => (
          <div key={f.q} className="border-b border-line pb-6 last:border-0">
            <dt className="flex items-start gap-2 font-medium text-ink">
              <CheckIcon className="mt-1 size-4 shrink-0 text-primary" /> {f.q}
            </dt>
            <dd className="mt-2 pl-6 text-sm leading-relaxed text-ink-soft">{f.a}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
