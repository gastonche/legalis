import { useEffect, useState } from "react";
import type { ComponentDirective, StreamEvent } from "@legalis/contracts";
import { BookIcon, CheckIcon, ChevronIcon, ExternalIcon, SparkIcon, XIcon } from "./icons";
import { Pill } from "./primitives";

const STEP_DOT: Record<string, string> = {
  understand: "bg-primary",
  plan: "bg-mixed",
  retrieve: "bg-ohada",
  reflect: "bg-civil",
  synthesize: "bg-brass",
  "self-eval": "bg-success",
};

function traceLine(ev: StreamEvent): string {
  switch (ev.type) {
    case "trace":
      return `trace ${ev.step}/${ev.phase} ${ev.status}${ev.detail ? ` — ${ev.detail}` : ""}`;
    case "narration":
      return `narration ${ev.step}`;
    case "component":
      return `component ${ev.directive.component}`;
    case "answer-token":
      return `answer-token ${JSON.stringify(ev.token)}`;
    case "control":
      return `control ${ev.phase}`;
    default:
      return "";
  }
}

/** The agent's process — visually subordinate to the answer, collapsible. */
export function Thinking({
  narration,
  sources,
  verification,
  trace,
  streaming,
}: {
  narration: { step: string; text: string }[];
  sources?: ComponentDirective;
  verification?: ComponentDirective;
  trace: StreamEvent[];
  streaming: boolean;
}) {
  const [open, setOpen] = useState(streaming);
  const [rawOpen, setRawOpen] = useState(false);
  // expand live while thinking; auto-collapse once the answer is ready
  useEffect(() => setOpen(streaming), [streaming]);

  const srcItems = sources?.component === "sources" ? sources.props.items : [];
  const checks = verification?.component === "verification-banner" ? verification.props.checks : [];
  const summary = streaming
    ? "Thinking…"
    : `Thought · ${narration.length} steps${srcItems.length ? ` · ${srcItems.length} source${srcItems.length > 1 ? "s" : ""}` : ""}`;

  return (
    <div className="rounded-xl border border-line bg-paper/50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-9 w-full items-center gap-2 px-3 text-left text-xs font-medium text-ink-faint hover:text-ink-soft"
      >
        <SparkIcon
          className={`size-3.5 ${streaming ? "animate-pulse text-primary motion-reduce:animate-none" : ""}`}
        />
        <span className="flex-1">{summary}</span>
        <ChevronIcon className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="space-y-3 border-t border-line px-3 py-3">
          <ol className="relative ml-1 space-y-2 border-l border-line pl-3.5">
            {narration.map((n, i) => (
              <li key={i} className="animate-rise relative">
                <span
                  className={`absolute -left-[1.18rem] top-1 size-2 rounded-full ring-4 ring-paper ${STEP_DOT[n.step] ?? "bg-mixed"}`}
                />
                <span className="text-[0.625rem] font-semibold uppercase tracking-wide text-ink-faint">
                  {n.step}
                </span>
                <p className="text-xs text-ink-soft">{n.text}</p>
              </li>
            ))}
          </ol>

          {srcItems.length > 0 ? (
            <div>
              <p className="mb-1 flex items-center gap-1 text-[0.625rem] font-semibold uppercase tracking-wide text-ink-faint">
                <BookIcon className="size-3" /> Sources
              </p>
              <ul className="space-y-1.5">
                {srcItems.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-ink">{s.title}</span>
                    {s.locator ? <span className="text-ink-faint">· {s.locator}</span> : null}
                    <Pill tone={s.authority === "primary" ? "brass" : "neutral"}>{s.authority}</Pill>
                    <Pill tone="neutral">{s.language.toUpperCase()}</Pill>
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open source"
                        className="inline-flex items-center text-primary hover:text-primary-hover"
                      >
                        <ExternalIcon className="size-3.5" />
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {checks.length > 0 ? (
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {checks.map((c) => (
                <li key={c.name} className="flex items-center gap-1 text-[0.6875rem] text-ink-soft">
                  {c.passed ? (
                    <CheckIcon className="size-3 text-success" />
                  ) : (
                    <XIcon className="size-3 text-danger" />
                  )}
                  {c.name}
                </li>
              ))}
            </ul>
          ) : null}

          <div>
            <button
              type="button"
              onClick={() => setRawOpen((o) => !o)}
              className="text-[0.625rem] font-medium text-ink-faint hover:text-ink-soft"
            >
              {rawOpen ? "Hide" : "Show"} raw trace ({trace.length})
            </button>
            {rawOpen ? (
              <div className="mt-1 max-h-56 overflow-auto rounded-lg bg-ink p-2 font-mono text-[10px] leading-relaxed text-paper/80">
                {trace.map((ev, i) => (
                  <div key={i}>{traceLine(ev)}</div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
