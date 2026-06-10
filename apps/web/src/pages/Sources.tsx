import { ExternalIcon } from "../components/icons";
import { Pill } from "../components/primitives";
import { CORPUS, CORPUS_COUNT, type CorpusEntry } from "./corpusData";

const GROUPS: { type: CorpusEntry["type"]; label: string; blurb: string }[] = [
  {
    type: "constitution",
    label: "Constitutional texts",
    blurb: "The Constitution and its major revisions — the foundation every other text answers to.",
  },
  {
    type: "uniform-act",
    label: "OHADA Uniform Acts",
    blurb: "Regional business law that supersedes national law on most commercial matters across 17 member states.",
  },
  { type: "code", label: "National codes", blurb: "The major codifications: penal, labour, civil status, taxation, customs and more." },
  { type: "ordinance", label: "Ordinances", blurb: "Key ordinances with the force of law, including the 1974 land-tenure regime." },
  { type: "statute", label: "Statutes", blurb: "Individual laws governing commerce, family, procedure and rights." },
];

export function Sources() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6">
      <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.28em] text-primary">Sources</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-ink">
        The corpus, <span className="italic text-primary-ink">in full</span>
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-soft">
        Every answer is grounded in these {CORPUS_COUNT} verified primary texts — each one checked
        against the official version before ingestion, chunked article-by-article, in English and
        French where both exist. No secondary commentary is treated as law.
      </p>

      {GROUPS.map((g) => {
        const items = CORPUS.filter((c) => c.type === g.type);
        if (items.length === 0) return null;
        return (
          <section key={g.type} aria-labelledby={`g-${g.type}`} className="mt-12">
            <div className="flex items-baseline gap-3">
              <h2 id={`g-${g.type}`} className="font-serif text-2xl font-semibold text-ink">
                {g.label}
              </h2>
              <span className="font-mono text-xs text-ink-faint">{items.length}</span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-ink-faint">{g.blurb}</p>
            <ul className="mt-4 divide-y divide-line rounded-card border border-line bg-surface shadow-card">
              {items.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3">
                  <span className="min-w-0 flex-1 text-sm text-ink">{c.title}</span>
                  <span className="flex items-center gap-1.5">
                    {c.languages.map((l) => (
                      <Pill key={l} tone="neutral">{l.toUpperCase()}</Pill>
                    ))}
                    {c.type === "uniform-act" ? <Pill tone="ohada">OHADA</Pill> : <Pill tone="brass">primary</Pill>}
                    {c.url ? (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open official source for ${c.title}`}
                        className="inline-flex size-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary-soft"
                      >
                        <ExternalIcon className="size-4" />
                      </a>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <p className="mt-12 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink-faint">
        Spotted an outdated version, or a text we should add? Write to{" "}
        <a className="text-primary hover:underline" href="mailto:corpus@legalis.cm">corpus@legalis.cm</a> — corpus
        corrections ship with priority.
      </p>
    </div>
  );
}
