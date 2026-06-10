import { Composer } from "../components/Composer";
import { BookIcon, CheckIcon, PinIcon, ShieldCheckIcon } from "../components/icons";
import { CORPUS_COUNT } from "./corpusData";

const SAMPLES = [
  "Can my employer dismiss me without notice?",
  "How do I register a small business?",
  "What are the grounds for divorce?",
];

const STEPS = [
  {
    icon: BookIcon,
    title: "Retrieves the law",
    body: `Your question is searched against ${CORPUS_COUNT} verified primary texts — the Constitution, national codes, and OHADA Uniform Acts — plus official web sources when something current is needed.`,
  },
  {
    icon: PinIcon,
    title: "Flags the regime",
    body: "Cameroon is bijural. Every answer states whether Anglophone common law, Francophone civil law, or OHADA business law governs — and asks rather than guesses when your region is pivotal.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Checks before showing",
    body: "A second model grades every draft for grounding, citation accuracy, and jurisdiction before you see it. Weakly-supported answers are labelled honestly — never dressed up.",
  },
];

export function Home({ ask, busy, navigate }: { ask: (q: string) => void; busy: boolean; navigate: (to: string) => void }) {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto w-full max-w-3xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
        <p className="mb-4 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-primary">
          Grounded legal research · Cameroon
        </p>
        <h1 className="mx-auto max-w-2xl font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-[3.4rem]">
          Know where the law stands, <span className="italic text-primary-ink">before you act</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">
          Ask a question in plain language. Legalis answers from cited primary sources, flags which
          legal regime applies, and self-checks every answer before you see it.
        </p>
        <div className="mx-auto mt-8 max-w-2xl text-left">
          <Composer onSubmit={ask} busy={busy} variant="hero" />
          <p className="mt-2.5 text-center text-xs text-ink-faint">
            Free during beta · Legal information, not legal advice.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-primary hover:text-primary-ink"
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="how" className="border-t border-line/60 bg-surface/30">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
          <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.28em] text-primary">How it works</p>
          <h2 id="how" className="mt-2 max-w-lg font-serif text-3xl font-semibold leading-tight text-ink">
            Built so you can check its work
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.title} className="rounded-card border border-line bg-surface p-5 shadow-card">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <s.icon className="size-4.5" />
                </span>
                <h3 className="mt-4 font-serif text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <a
              href="/how-it-works"
              onClick={(e) => { e.preventDefault(); navigate("/how-it-works"); window.scrollTo(0, 0); }}
              className="text-sm font-medium text-primary hover:text-primary-hover"
            >
              Read how grounding and verification work →
            </a>
          </div>
        </div>
      </section>

      {/* Corpus transparency */}
      <section aria-labelledby="corpus" className="border-t border-line/60">
        <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-16 sm:grid-cols-2 sm:px-6">
          <div>
            <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.28em] text-primary">The corpus</p>
            <h2 id="corpus" className="mt-2 font-serif text-3xl font-semibold leading-tight text-ink">
              {CORPUS_COUNT} verified primary texts. Nothing invented.
            </h2>
            <p className="mt-4 text-ink-soft">
              Every legal claim is cited to a source you can open: the Constitution and its revisions,
              the Penal, Labour, Civil-Status and Tax codes, the OHADA Uniform Acts that govern business
              across the region, and more — in English and French. If the sources don't support an
              answer, Legalis says so instead of guessing.
            </p>
            <a
              href="/sources"
              onClick={(e) => { e.preventDefault(); navigate("/sources"); window.scrollTo(0, 0); }}
              className="mt-5 inline-block text-sm font-medium text-primary hover:text-primary-hover"
            >
              Browse every source →
            </a>
          </div>
          <ul className="space-y-2.5 self-center">
            {[
              "Constitution of Cameroon (1972, rev. 1996/2008)",
              "Labour Code — Law No. 92/007",
              "Penal Code — Law No. 2016/007",
              "OHADA Uniform Act on Commercial Companies",
              "Code Général des Impôts (édition 2024)",
              "General Code of Decentralised Local Authorities",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-soft">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Boundary + CTA */}
      <section className="border-t border-line/60 bg-surface/30">
        <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="font-serif text-3xl font-semibold leading-tight text-ink">
            Information first. <span className="italic text-primary-ink">Lawyers where it matters.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-ink-soft">
            Legalis helps you understand where the law stands — what the Labour Code actually says,
            which regime governs your case, what OHADA requires. For decisions about your specific
            situation, it consistently points you to a qualified Cameroonian lawyer. That boundary is
            built into the product, not buried in fine print.
          </p>
          <a
            href="/chat"
            onClick={(e) => { e.preventDefault(); navigate("/chat"); window.scrollTo(0, 0); }}
            className="mt-8 inline-flex min-h-11 items-center rounded-xl bg-primary px-6 text-base font-semibold text-on-primary transition-colors hover:bg-primary-hover"
          >
            Ask your first question
          </a>
        </div>
      </section>
    </>
  );
}
