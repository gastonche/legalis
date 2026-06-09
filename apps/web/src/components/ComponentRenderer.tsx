import type { ReactNode } from "react";
import type {
  AnswerCardProps,
  ClarifyingQuestionProps,
  ComponentDirective,
  Regime,
  RegionSelectorProps,
  SourcesProps,
  TalkToLawyerProps,
  VerificationBannerProps,
} from "@legalis/contracts";
import {
  BookIcon,
  BriefcaseIcon,
  CheckIcon,
  ExternalIcon,
  HelpIcon,
  PinIcon,
  ScaleIcon,
  ShieldCheckIcon,
  XIcon,
  type IconProps,
} from "./icons";

/** Maps a typed, zod-validated directive from the fixed registry to a real component. */
export function ComponentRenderer({
  directive,
  onChip,
}: {
  directive: ComponentDirective;
  onChip?: (label: string) => void;
}) {
  switch (directive.component) {
    case "clarifying-question":
      return <ClarifyingQuestion {...directive.props} onChip={onChip} />;
    case "region-selector":
      return <RegionSelector {...directive.props} onChip={onChip} />;
    case "sources":
      return <Sources {...directive.props} />;
    case "answer":
      return <AnswerCard {...directive.props} />;
    case "verification-banner":
      return <VerificationBanner {...directive.props} />;
    case "talk-to-a-lawyer":
      return <TalkToLawyer {...directive.props} />;
    default:
      return null;
  }
}

/* ---------- shared primitives ---------- */

type Tone = "primary" | "success" | "warning" | "danger" | "brass" | "neutral" | "common" | "civil" | "ohada" | "mixed";

// Literal classes only — Tailwind cannot scan interpolated class names.
const PILL: Record<Tone, string> = {
  neutral: "bg-ink/[0.06] text-ink-soft",
  primary: "bg-primary-soft text-primary-ink",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  brass: "bg-brass-soft text-brass",
  common: "bg-common/10 text-common",
  civil: "bg-civil/10 text-civil",
  ohada: "bg-ohada/10 text-ohada",
  mixed: "bg-mixed/10 text-mixed",
};

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold tracking-tight ${PILL[tone]}`}
    >
      {children}
    </span>
  );
}

function Card({
  icon: Icon,
  title,
  tone = "neutral",
  children,
}: {
  icon: (p: IconProps) => ReactNode;
  title: string;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <section className="animate-rise rounded-card border border-line bg-surface shadow-card">
      <header className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <span className={`flex size-7 items-center justify-center rounded-lg ${PILL[tone]}`}>
          <Icon className="size-4" />
        </span>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </header>
      <div className="px-4 py-3.5">{children}</div>
    </section>
  );
}

function Chip({ label, hint, onClick }: { label: string; hint?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className="inline-flex min-h-9 items-center rounded-chip border border-line-strong bg-paper px-3 text-sm text-ink transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary-ink"
    >
      {label}
    </button>
  );
}

/* ---------- inline markdown (bold + [n] citation markers) ---------- */

function renderInline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|\[(?:n:)?\d+\])/g)
    .filter(Boolean)
    .map((part, i) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) {
        return (
          <strong key={i} className="font-semibold text-ink">
            {part.slice(2, -2)}
          </strong>
        );
      }
      const cite = part.match(/^\[(?:n:)?(\d+)\]$/);
      if (cite) {
        return (
          <sup
            key={i}
            className="ml-0.5 rounded bg-primary-soft px-1 text-[0.62em] font-bold text-primary-ink"
          >
            {cite[1]}
          </sup>
        );
      }
      return <span key={i}>{part}</span>;
    });
}

function renderProse(text: string): ReactNode {
  return text.split(/\n{2,}/).map((para, i) => (
    <p key={i} className="mb-3 last:mb-0">
      {renderInline(para)}
    </p>
  ));
}

/* ---------- regime + authority semantics ---------- */

const REGIME: Record<Regime, { label: string; tone: Tone }> = {
  "common-law": { label: "Common law · Anglophone", tone: "common" },
  "civil-law": { label: "Civil law · Francophone", tone: "civil" },
  ohada: { label: "OHADA business law", tone: "ohada" },
  mixed: { label: "Mixed regime", tone: "mixed" },
  unclear: { label: "Regime unclear", tone: "neutral" },
};

/* ---------- registry components ---------- */

function ClarifyingQuestion({
  question,
  options,
  onChip,
}: ClarifyingQuestionProps & { onChip?: (label: string) => void }) {
  return (
    <Card icon={HelpIcon} title="A quick question" tone="primary">
      <p className="text-ink">{question}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o.id} label={o.label} hint={o.hint} onClick={() => onChip?.(o.label)} />
        ))}
      </div>
    </Card>
  );
}

function RegionSelector({
  reason,
  regions,
  onChip,
}: RegionSelectorProps & { onChip?: (label: string) => void }) {
  return (
    <Card icon={PinIcon} title="Which region applies?" tone="civil">
      <p className="text-ink-soft">{reason}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {regions.map((r) => (
          <Chip key={r.id} label={r.label} onClick={() => onChip?.(r.label)} />
        ))}
      </div>
    </Card>
  );
}

function Sources({ items }: SourcesProps) {
  return (
    <Card icon={BookIcon} title={`Sources (${items.length})`}>
      <ul className="divide-y divide-line">
        {items.map((s) => (
          <li key={s.id} className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Pill tone={s.authority === "primary" ? "brass" : "neutral"}>
                {s.authority === "primary" ? "primary authority" : "secondary"}
              </Pill>
              <Pill tone="primary">{s.sourceType}</Pill>
              <Pill tone="neutral">{s.language.toUpperCase()}</Pill>
            </div>
            <span className="text-sm font-medium text-ink">{s.title}</span>
            {s.locator ? <span className="text-xs text-ink-faint">{s.locator}</span> : null}
            {s.url ? (
              <a
                className="inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover hover:underline"
                href={s.url}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalIcon className="size-3.5" />
                View source
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AnswerCard({ answer, citations, regime, confidence, scopeNote }: AnswerCardProps) {
  const r = REGIME[regime.applies];
  return (
    <Card icon={ScaleIcon} title="Answer" tone="primary">
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Pill tone={r.tone}>{r.label}</Pill>
        {regime.ohadaSupersedes ? <Pill tone="ohada">OHADA supersedes national law</Pill> : null}
        <Pill tone={confidence === "high" ? "success" : confidence === "medium" ? "warning" : "danger"}>
          {confidence} confidence
        </Pill>
      </div>

      <div className="max-w-[68ch] font-serif text-[1.0625rem] leading-relaxed text-ink-soft">
        {renderProse(answer)}
      </div>

      {regime.rationale ? (
        <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-xs text-ink-faint">
          <span className="font-semibold text-ink-soft">Why this regime: </span>
          {regime.rationale}
        </p>
      ) : null}

      {citations.length > 0 ? (
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Citations
          </p>
          <ol className="space-y-2.5">
            {citations.map((c) => (
              <li key={c.marker} className="flex gap-2 text-sm">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-primary-soft text-[0.7rem] font-bold text-primary-ink">
                  {c.marker.replace(/[[\]]/g, "")}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className="font-medium text-ink">{c.sourceTitle}</span>
                    <span className="italic text-ink-faint">{c.locator}</span>
                    <Pill tone={c.authority === "primary" ? "brass" : "neutral"}>{c.authority}</Pill>
                  </div>
                  <blockquote className="mt-1 border-l-2 border-line-strong pl-2 text-xs italic text-ink-faint">
                    “{c.quote}”
                  </blockquote>
                  {c.url ? (
                    <a
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalIcon className="size-3.5" />
                      Source
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-ink-faint">
        {scopeNote}
      </p>
    </Card>
  );
}

const BANNER: Record<
  VerificationBannerProps["status"],
  { tone: Tone; box: string; label: string }
> = {
  verified: { tone: "success", box: "border-success/30 bg-success-soft", label: "Verified" },
  partial: { tone: "warning", box: "border-warning/30 bg-warning-soft", label: "Partly grounded" },
  downgraded: { tone: "danger", box: "border-danger/30 bg-danger-soft", label: "Downgraded" },
};

function VerificationBanner({ status, message, checks }: VerificationBannerProps) {
  const b = BANNER[status];
  return (
    <section
      className={`animate-rise rounded-card border px-4 py-3 ${b.box}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-2.5">
        <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-ink-soft" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink">Checked before showing</span>
            <Pill tone={b.tone}>{b.label}</Pill>
          </div>
          <p className="mt-0.5 text-sm text-ink-soft">{message}</p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {checks.map((c) => (
              <li key={c.name} className="flex items-center gap-1 text-xs text-ink-soft">
                {c.passed ? (
                  <CheckIcon className="size-3.5 text-success" />
                ) : (
                  <XIcon className="size-3.5 text-danger" />
                )}
                {c.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function TalkToLawyer({ message, jurisdictionNote }: TalkToLawyerProps) {
  return (
    <Card icon={BriefcaseIcon} title="Talk to a lawyer" tone="brass">
      <p className="text-ink-soft">{message}</p>
      {jurisdictionNote ? (
        <p className="mt-1.5 text-xs text-ink-faint">{jurisdictionNote}</p>
      ) : null}
    </Card>
  );
}
