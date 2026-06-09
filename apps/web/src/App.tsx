import { useState } from "react";
import { useLegalisStream } from "./lib/useLegalisStream";
import { ComponentRenderer } from "./components/ComponentRenderer";
import { ChevronIcon, InfoIcon, ScaleIcon, SparkIcon } from "./components/icons";

const SAMPLES = [
  "How do I register a small business in Cameroon?",
  "Can my employer dismiss me without notice?",
  "What law governs a commercial company in Douala?",
];

const STEP: Record<string, { label: string; dot: string }> = {
  understand: { label: "Understand", dot: "bg-primary" },
  plan: { label: "Plan", dot: "bg-mixed" },
  retrieve: { label: "Retrieve", dot: "bg-ohada" },
  reflect: { label: "Reflect", dot: "bg-civil" },
  synthesize: { label: "Synthesize", dot: "bg-brass" },
  "self-eval": { label: "Self-check", dot: "bg-success" },
};

export function App() {
  const { state, ask } = useLegalisStream();
  const [question, setQuestion] = useState("");
  const [showTrace, setShowTrace] = useState(false);

  const busy = state.status === "connecting" || state.status === "streaming";
  const hasAnswerCard = state.components.some((c) => c.component === "answer");

  const submit = (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    setQuestion(text);
    void ask(text);
  };

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6">
      {/* ---------- header ---------- */}
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-white shadow-card">
            <ScaleIcon className="size-5" />
          </span>
          <div>
            <h1 className="font-serif text-2xl font-semibold leading-none text-ink">Legalis</h1>
            <p className="mt-1 text-sm text-ink-faint">
              Grounded research assistant for Cameroon law
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-card border border-line bg-surface px-3.5 py-2.5 shadow-card">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-brass" />
          <p className="text-sm text-ink-soft">
            <span className="font-semibold text-ink">Legal information, not legal advice.</span>{" "}
            Every claim is cited to a source and the answer flags which regime applies
            (Anglophone common law · Francophone civil law · OHADA). For your situation, consult a
            qualified Cameroonian lawyer.
          </p>
        </div>
      </header>

      {/* ---------- ask ---------- */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(question);
        }}
        className="flex flex-col gap-2.5"
      >
        <div className="flex gap-2">
          <label htmlFor="ask" className="sr-only">
            Ask a question about Cameroon law
          </label>
          <input
            id="ask"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask in plain language — e.g. “Can I be fired without notice?”"
            autoComplete="off"
            className="min-h-12 flex-1 rounded-card border border-line-strong bg-surface px-4 text-ink shadow-card transition-colors placeholder:text-ink-faint focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-card bg-primary px-5 font-medium text-white shadow-card transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Working…" : "Ask"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="self-center text-xs text-ink-faint">Try:</span>
          {SAMPLES.map((s) => (
            <button
              key={s}
              type="button"
              data-testid="sample"
              onClick={() => submit(s)}
              disabled={busy}
              className="rounded-chip border border-line bg-surface px-2.5 py-1 text-xs text-ink-soft transition-colors hover:border-primary hover:text-primary-ink disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      </form>

      {/* ---------- body ---------- */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <main className="flex min-w-0 flex-col gap-4">
          {state.status === "idle" ? (
            <div className="rounded-card border border-dashed border-line-strong bg-surface/60 px-5 py-8 text-center">
              <SparkIcon className="mx-auto size-6 text-ink-faint" />
              <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft">
                Ask a question to watch the assistant work: live narration of each step, adaptive
                cards (sources, clarifying questions, the cited answer), and a verification banner —
                all streamed over SSE.
              </p>
              <p className="mt-2 text-xs text-ink-faint">
                Milestone 1 · the agent loop is a scripted stub.
              </p>
            </div>
          ) : null}

          {/* narration timeline */}
          {state.narration.length > 0 ? (
            <section className="rounded-card border border-line bg-surface px-4 py-3.5 shadow-card">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                What the assistant is doing
              </p>
              <ol className="relative ml-1 space-y-3 border-l border-line pl-4">
                {state.narration.map((n, i) => {
                  const meta = STEP[n.step] ?? { label: n.step, dot: "bg-mixed" };
                  return (
                    <li key={i} className="animate-rise relative">
                      <span
                        className={`absolute -left-[1.3rem] top-1.5 size-2.5 rounded-full ring-4 ring-surface ${meta.dot}`}
                      />
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-faint">
                        {meta.label}
                      </span>
                      <p className="text-sm text-ink-soft">{n.text}</p>
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}

          {/* live answer draft (before the final answer card arrives) */}
          {state.answer && !hasAnswerCard ? (
            <section className="animate-rise rounded-card border border-dashed border-primary/40 bg-primary-soft/40 px-4 py-3.5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary-ink">
                Drafting answer
              </p>
              <p className="caret-pulse max-w-[68ch] font-serif text-[1.0625rem] leading-relaxed text-ink-soft">
                {state.answer}
              </p>
            </section>
          ) : null}

          {/* adaptive components */}
          {state.components.map((directive, i) => (
            <ComponentRenderer key={i} directive={directive} onChip={(label) => submit(label)} />
          ))}

          {state.status === "error" ? (
            <p
              role="alert"
              className="rounded-card border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              {state.error ?? "Something went wrong."} — is the Worker running on :8787?
            </p>
          ) : null}
        </main>

        {/* trace panel (developer-facing, distinct from narration) */}
        <aside className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowTrace((v) => !v)}
            aria-expanded={showTrace}
            className="inline-flex min-h-9 items-center justify-between gap-2 rounded-card border border-line bg-surface px-3 text-xs font-semibold text-ink-soft shadow-card transition-colors hover:border-line-strong"
          >
            <span>Technical trace · {state.trace.length}</span>
            <ChevronIcon className={`size-4 transition-transform ${showTrace ? "rotate-180" : ""}`} />
          </button>
          {showTrace ? (
            <div className="max-h-[34rem] overflow-auto rounded-card border border-line bg-ink p-3 font-mono text-[11px] leading-relaxed text-paper/80 shadow-card">
              {state.trace.length === 0 ? (
                <p className="text-paper/40">No events yet.</p>
              ) : (
                state.trace.map((ev, i) => (
                  <div key={i} className="border-b border-white/5 py-0.5 last:border-0">
                    <span className="text-sky-300">{ev.type}</span>
                    {ev.type === "trace" ? (
                      <span>
                        {" "}
                        <span className="text-amber-300">{ev.step}</span>
                        <span className="text-paper/40">/{ev.phase}</span>{" "}
                        <span className={ev.status === "ok" ? "text-emerald-300" : "text-rose-300"}>
                          {ev.status}
                        </span>
                        {ev.detail ? <span className="text-paper/40"> — {ev.detail}</span> : null}
                      </span>
                    ) : null}
                    {ev.type === "narration" ? (
                      <span className="text-paper/40"> {ev.step}</span>
                    ) : null}
                    {ev.type === "component" ? (
                      <span className="text-violet-300"> {ev.directive.component}</span>
                    ) : null}
                    {ev.type === "answer-token" ? (
                      <span className="text-paper/30"> {JSON.stringify(ev.token)}</span>
                    ) : null}
                    {ev.type === "control" ? (
                      <span className="text-paper/50"> {ev.phase}</span>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
