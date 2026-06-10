import { CORPUS_COUNT } from "./corpusData";

export function About() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
      <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.28em] text-primary">About</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-ink">
        The law shouldn't be <span className="italic text-primary-ink">a guessing game</span>
      </h1>

      <div className="mt-8 space-y-6 text-lg leading-relaxed text-ink-soft">
        <p>
          In Cameroon, finding out what the law actually says is hard. Texts are scattered across
          gazettes, portals and PDFs; official versions exist in two languages; and two legal
          traditions — English common law in the North-West and South-West, civil law everywhere else —
          coexist with OHADA, a regional regime that quietly supersedes national law on most business
          matters. For most people, "what does the law say?" is answered by rumour.
        </p>
        <p>
          Legalis exists to make the first step — <em>knowing where the law stands</em> — fast,
          grounded, and honest. We collected and verified {CORPUS_COUNT} primary texts against their
          official versions, built retrieval that works across English and French, and put a
          verification gate in front of every answer so the system says "I can't ground this" instead
          of inventing an article number.
        </p>
        <p>
          We are equally clear about what Legalis is not: it is not a lawyer, and it will not pretend
          to be one. Applying the law to your situation — strategy, deadlines, filings — belongs with
          a qualified Cameroonian lawyer. Legalis gets you to that conversation informed.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          { n: CORPUS_COUNT.toString(), label: "verified primary texts" },
          { n: "2", label: "languages, official versions" },
          { n: "3", label: "legal regimes flagged" },
        ].map((s) => (
          <div key={s.label} className="rounded-card border border-line bg-surface p-5 text-center shadow-card">
            <p className="font-serif text-4xl font-semibold text-primary-ink">{s.n}</p>
            <p className="mt-1 text-sm text-ink-faint">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-card border border-line bg-surface p-6 shadow-card">
        <h2 className="font-serif text-xl font-semibold text-ink">Contact</h2>
        <p className="mt-2 text-ink-soft">
          Questions, corrections, partnerships — including bar associations and legal-aid
          organisations we should be working with:
        </p>
        <p className="mt-3">
          <a className="font-medium text-primary hover:underline" href="mailto:hello@legalis.cm">
            hello@legalis.cm
          </a>
        </p>
      </div>
    </div>
  );
}
