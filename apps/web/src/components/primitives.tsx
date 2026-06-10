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

/**
 * Streaming-safe markdown cleanup for the live token stream: close an
 * in-progress **bold** span (so it renders bold while typing instead of showing
 * raw asterisks) and hide a half-typed citation marker like "[1".
 */
export function tidyStreamingTail(text: string): string {
  let t = text.replace(/\[(?:n:)?\d*$/, "");
  if (t.endsWith("*") && !t.endsWith("**")) t = t.slice(0, -1);
  const boldMarks = (t.match(/\*\*/g) ?? []).length;
  if (boldMarks % 2 === 1) t += "**";
  return t;
}
