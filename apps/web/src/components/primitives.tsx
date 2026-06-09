import type { ReactNode } from "react";
import type { Regime } from "@legalis/contracts";

// Literal class maps — Tailwind cannot scan interpolated class names.
export type Tone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "brass"
  | "neutral"
  | "common"
  | "civil"
  | "ohada"
  | "mixed";

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

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold tracking-tight ${PILL[tone]}`}
    >
      {children}
    </span>
  );
}

export const REGIME: Record<Regime, { label: string; tone: Tone }> = {
  "common-law": { label: "Common law · Anglophone", tone: "common" },
  "civil-law": { label: "Civil law · Francophone", tone: "civil" },
  ohada: { label: "OHADA business law", tone: "ohada" },
  mixed: { label: "Mixed regime", tone: "mixed" },
  unclear: { label: "Regime unclear", tone: "neutral" },
};

/** Lightweight inline markdown: **bold** + [n] / [n:x] citation markers → superscripts. */
export function renderInline(text: string): ReactNode[] {
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

export function renderProse(text: string): ReactNode {
  return text.split(/\n{2,}/).map((para, i) => (
    <p key={i} className="mb-3 last:mb-0">
      {renderInline(para)}
    </p>
  ));
}
