import type { AnswerPayload, VerificationBannerProps } from "@legalis/contracts";
import { Pill, REGIME, renderProse } from "./primitives";
import { ExternalIcon, ShieldCheckIcon } from "./icons";

const TRUST: Record<VerificationBannerProps["status"], { label: string; tone: "success" | "warning" | "danger" }> = {
  verified: { label: "Verified", tone: "success" },
  partial: { label: "Partly grounded", tone: "warning" },
  downgraded: { label: "Unverified", tone: "danger" },
};

export function Answer({
  answer,
  verification,
}: {
  answer: AnswerPayload;
  verification?: VerificationBannerProps;
}) {
  const r = REGIME[answer.regime.applies];
  const trust = verification ? TRUST[verification.status] : null;
  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        <Pill tone={r.tone}>{r.label}</Pill>
        {answer.regime.ohadaSupersedes ? <Pill tone="ohada">OHADA supersedes national law</Pill> : null}
        <Pill
          tone={
            answer.confidence === "high" ? "success" : answer.confidence === "medium" ? "warning" : "danger"
          }
        >
          {answer.confidence} confidence
        </Pill>
        {trust ? (
          <span className="inline-flex items-center gap-1" title={verification?.message}>
            <ShieldCheckIcon className="size-3.5 text-ink-faint" />
            <Pill tone={trust.tone}>{trust.label}</Pill>
          </span>
        ) : null}
      </div>

      <div className="max-w-[68ch] font-serif text-[1.0625rem] leading-relaxed text-ink">
        {renderProse(answer.answer)}
      </div>

      {answer.regime.rationale ? (
        <p className="mt-3 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-faint">
          <span className="font-semibold text-ink-soft">Why this regime: </span>
          {answer.regime.rationale}
        </p>
      ) : null}

      {answer.citations.length > 0 ? (
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Citations</p>
          <ol className="space-y-2.5">
            {answer.citations.map((c) => (
              <li key={c.marker} className="flex gap-2 text-sm">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-primary-soft text-[0.7rem] font-bold text-primary-ink">
                  {c.marker.replace(/[^\d]/g, "")}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className="font-medium text-ink">{c.sourceTitle}</span>
                    <span className="italic text-ink-faint">{c.locator}</span>
                    <Pill tone={c.authority === "primary" ? "brass" : "neutral"}>{c.authority}</Pill>
                  </div>
                  {c.quote ? (
                    <blockquote className="mt-1 border-l-2 border-line-strong pl-2 text-xs italic text-ink-faint">
                      “{c.quote}”
                    </blockquote>
                  ) : null}
                  {c.url ? (
                    <a
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalIcon className="size-3.5" /> Source
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-ink-faint">
        {answer.scopeNote}
      </p>
    </div>
  );
}
