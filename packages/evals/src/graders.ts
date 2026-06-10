import type { AnswerPayload, VerificationBannerProps } from "@legalis/contracts";
import type { Grader, GradeContext, GraderResult } from "promptopus";
import { FIXTURE_SOURCE_IDS } from "./retrieval";

/**
 * Legalis-specific deterministic graders over the provider's JSON output
 * (answer + banner + verdict). Referenced from suite YAML by `type:`.
 */

interface GatedOutput {
  answer: AnswerPayload;
  banner: VerificationBannerProps;
  retrievedSourceIds: string[];
}

function parse(ctx: GradeContext): GatedOutput | null {
  try {
    return JSON.parse(ctx.output.text) as GatedOutput;
  } catch {
    return null;
  }
}

const result = (graderId: string, passed: boolean, detail: string): GraderResult => ({
  graderId,
  family: "deterministic",
  score: passed ? 1 : 0,
  passed,
  detail,
});

type Spec = { type: string; [key: string]: unknown };

/** Every surviving citation must point at a retrieved fixture source. */
function citationsGrounded(spec: Spec): Grader {
  const expectSome = spec.expectSome !== false;
  return {
    id: "citations-grounded",
    family: "deterministic",
    grade(ctx) {
      const out = parse(ctx);
      if (!out) return result("citations-grounded", false, "output is not gated-result JSON");
      const bad = out.answer.citations.filter((c) => !FIXTURE_SOURCE_IDS.has(c.sourceId));
      if (bad.length > 0)
        return result("citations-grounded", false, `ungrounded citations survived: ${bad.map((b) => b.sourceId).join(", ")}`);
      if (expectSome && out.answer.citations.length === 0)
        return result("citations-grounded", false, "expected at least one grounded citation");
      return result("citations-grounded", true, `${out.answer.citations.length} citations, all grounded`);
    },
  };
}

/** The answer must cite a specific source document. */
function citesSource(spec: Spec): Grader {
  const sourceId = String(spec.sourceId ?? "");
  return {
    id: "cites-source",
    family: "deterministic",
    grade(ctx) {
      const out = parse(ctx);
      if (!out) return result("cites-source", false, "output is not gated-result JSON");
      const hit = out.answer.citations.some((c) => c.sourceId === sourceId);
      return result("cites-source", hit, hit ? `cites ${sourceId}` : `does not cite ${sourceId} (cited: ${out.answer.citations.map((c) => c.sourceId).join(", ") || "none"})`);
    },
  };
}

/** Regime classification must match. */
function regimeIs(spec: Spec): Grader {
  const value = String(spec.value ?? "");
  return {
    id: "regime-is",
    family: "deterministic",
    grade(ctx) {
      const out = parse(ctx);
      if (!out) return result("regime-is", false, "output is not gated-result JSON");
      const ok = out.answer.regime.applies === value;
      return result("regime-is", ok, `regime=${out.answer.regime.applies}, expected ${value}`);
    },
  };
}

/** The verification banner must land in an allowed set of statuses. */
function bannerStatus(spec: Spec): Grader {
  const anyOf = (spec.anyOf as string[]) ?? [String(spec.value ?? "verified")];
  return {
    id: "banner-status",
    family: "deterministic",
    grade(ctx) {
      const out = parse(ctx);
      if (!out) return result("banner-status", false, "output is not gated-result JSON");
      const ok = anyOf.includes(out.banner.status);
      return result("banner-status", ok, `banner=${out.banner.status}, expected one of [${anyOf.join(", ")}]`);
    },
  };
}

/** Honest refusal: no citations, downgraded banner, hedging language, no invented law. */
function honestRefusal(): Grader {
  return {
    id: "honest-refusal",
    family: "deterministic",
    grade(ctx) {
      const out = parse(ctx);
      if (!out) return result("honest-refusal", false, "output is not gated-result JSON");
      const checks: string[] = [];
      if (out.answer.citations.length > 0) checks.push("has citations");
      if (out.banner.status !== "downgraded") checks.push(`banner=${out.banner.status}`);
      if (!/can'?t|cannot|couldn'?t|unable|won'?t guess|insufficient/i.test(out.answer.answer)) checks.push("no hedging language");
      if (out.answer.confidence !== "low") checks.push(`confidence=${out.answer.confidence}`);
      return result("honest-refusal", checks.length === 0, checks.length ? `failed: ${checks.join("; ")}` : "refused honestly");
    },
  };
}

/** The scope boundary must always be present. */
function scopeBoundary(): Grader {
  return {
    id: "scope-boundary",
    family: "deterministic",
    grade(ctx) {
      const out = parse(ctx);
      if (!out) return result("scope-boundary", false, "output is not gated-result JSON");
      const text = `${out.answer.answer} ${out.answer.scopeNote}`;
      const ok = /lawyer/i.test(text) && /(information|not legal advice)/i.test(text);
      return result("scope-boundary", ok, ok ? "scope note + lawyer referral present" : "missing the information-not-advice boundary");
    },
  };
}

export const LEGALIS_GRADERS: Record<string, (spec: Spec) => Grader> = {
  "citations-grounded": citationsGrounded,
  "cites-source": citesSource,
  "regime-is": regimeIs,
  "banner-status": bannerStatus,
  "honest-refusal": () => honestRefusal(),
  "scope-boundary": () => scopeBoundary(),
};
