import React from "react";
import { AbsoluteFill, Sequence, interpolate, random, useCurrentFrame } from "remotion";
import { C } from "./brand";
import {
  CheckIcon,
  Cite,
  EASE_OUT,
  FadeUp,
  Panel,
  Pill,
  ScaleGlyph,
  Typewriter,
  WordStagger,
  fadeWindow,
  useSettle,
  useStamp,
} from "./ui";

const PAD = 92;

// ---------------------------------------------------------------------------
// S1 · The noise — contradictory "advice" fragments, building then blurring.
// ---------------------------------------------------------------------------
const RUMOURS = [
  "“They can't fire you without 3 months pay”",
  "“Non, c'est faux —”",
  "“my uncle said the land is automatically yours”",
  "“that law changed in 2016”",
  "“just sign it, it's standard”",
  "“au Cameroun ça ne marche pas comme ça”",
  "“you need a lawyer for everything”",
  "“OHADA only applies in Douala”",
  "“customary law decides, full stop”",
  "“someone at the ministry told me…”",
  "“pas besoin de préavis”",
  "“the notice period is negotiable”",
];

export const SceneNoise: React.FC = () => {
  const frame = useCurrentFrame();
  const blur = interpolate(frame, [130, 178], [0, 9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ filter: `blur(${blur}px)` }}>
        {RUMOURS.map((text, i) => {
          const from = 6 + i * 13;
          const o = fadeWindow(frame, from, from + 85, 6, 22);
          const x = 60 + random(`x-${i}`) * 700;
          const y = 160 + random(`y-${i}`) * 1480;
          const rot = (random(`r-${i}`) - 0.5) * 10;
          const size = 30 + random(`s-${i}`) * 26;
          const jitter = Math.sin((frame + i * 31) / 3.1) * (frame > 110 ? 2.4 : 0.8);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: y + jitter,
                maxWidth: 760,
                transform: `rotate(${rot}deg)`,
                opacity: o * 0.92,
                color: i % 3 === 2 ? C.inkFaint : C.inkSoft,
                fontFamily: C.sans,
                fontWeight: i % 4 === 0 ? 600 : 400,
                fontSize: size,
                lineHeight: 1.3,
              }}
            >
              {text}
            </div>
          );
        })}
      </AbsoluteFill>
      <Sequence from={108} layout="none">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <FadeUp>
            <div
              style={{
                fontFamily: C.sans,
                fontWeight: 600,
                fontSize: 30,
                letterSpacing: 8,
                color: C.inkFaint,
                textTransform: "uppercase",
              }}
            >
              Everyone knows someone…
            </div>
          </FadeUp>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// S2 · The cut — silence, one statement.
// ---------------------------------------------------------------------------
export const SceneStatement: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: PAD }}>
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: C.serif, fontWeight: 600, fontSize: 84, color: C.ink, lineHeight: 1.12 }}>
        <WordStagger text="The law has an answer." />
      </div>
      <div
        style={{
          marginTop: 28,
          fontFamily: C.serifItalic,
          fontStyle: "italic",
          fontWeight: 600,
          fontSize: 84,
          color: C.brassInk,
          lineHeight: 1.12,
        }}
      >
        <WordStagger text="Rumour isn't it." delay={26} />
      </div>
    </div>
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------
// S3 · The question — the product composer, typed live.
// ---------------------------------------------------------------------------
export const SceneQuestion: React.FC<{ sendAt?: number }> = ({ sendAt = 138 }) => {
  const press = useStamp(sendAt);
  const sendScale = 1 - Math.sin(Math.min(1, Math.max(0, press)) * Math.PI) * 0.12;
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: PAD }}>
      <FadeUp>
        <div
          style={{
            fontFamily: C.mono,
            fontSize: 26,
            letterSpacing: 7,
            color: C.brass,
            textTransform: "uppercase",
            marginBottom: 36,
          }}
        >
          Ask in your own words
        </div>
        <Panel style={{ padding: "40px 44px", display: "flex", alignItems: "flex-end", gap: 24 }}>
          <div style={{ flex: 1, fontFamily: C.sans, fontSize: 44, lineHeight: 1.45, color: C.ink, minHeight: 190 }}>
            <Typewriter text="Can my employer dismiss me without notice?" start={28} charsPerFrame={0.55} />
          </div>
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: 24,
              background: C.brass,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${sendScale})`,
            }}
          >
            <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke={C.onBrass} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M6 11l6-6 6 6" />
            </svg>
          </div>
        </Panel>
        <div style={{ marginTop: 26, fontFamily: C.sans, fontSize: 26, color: C.inkFaint, textAlign: "center" }}>
          Legal information, not legal advice.
        </div>
      </FadeUp>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// S4 · The law arrives — streamed answer, then the citation seal.
// ---------------------------------------------------------------------------
const ANSWER_WORDS: { t: string; bold?: boolean; cite?: number }[] = [
  { t: "In Cameroon, an employer can dismiss without notice " },
  { t: "only for serious misconduct", bold: true },
  { t: ", confirmed by a competent court", cite: 1 },
  { t: ". In every other case, " },
  { t: "notice — or pay in its place — is owed", bold: true },
  { t: ", and wrongful dismissal can carry damages", cite: 2 },
  { t: "." },
];

export const SceneAnswer: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [120, 330], [0, -120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  let wordIndex = 0;
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: PAD }}>
      <div style={{ transform: `translateY(${drift}px)` }}>
        <Panel style={{ padding: "52px 56px" }}>
          <div style={{ display: "flex", gap: 14, marginBottom: 30 }}>
            <Pill bg={C.brassSoft} color={C.brassInk} delay={4} size={22}>
              Mixed regime
            </Pill>
            <Pill bg={C.verdigrisSoft} color={C.verdigris} delay={10} size={22}>
              high confidence
            </Pill>
          </div>
          <div style={{ fontFamily: C.serif, fontWeight: 500, fontSize: 46, lineHeight: 1.5, color: C.ink }}>
            {ANSWER_WORDS.map((seg, i) => {
              const words = seg.t.split(" ").filter(Boolean);
              return (
                <span key={i} style={{ fontWeight: seg.bold ? 700 : 500, color: seg.bold ? C.ink : C.ink }}>
                  {words.map((w, j) => {
                    const idx = wordIndex++;
                    const o = interpolate(frame, [16 + idx * 3.4, 24 + idx * 3.4], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    });
                    return (
                      <span key={j} style={{ opacity: o }}>
                        {w}{" "}
                      </span>
                    );
                  })}
                  {seg.cite ? (
                    <span style={{ opacity: interpolate(frame, [16 + wordIndex * 3.4, 26 + wordIndex * 3.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
                      <Cite n={seg.cite} />
                    </span>
                  ) : null}
                </span>
              );
            })}
          </div>
        </Panel>

        <Sequence from={170} layout="none">
          <FadeUp delay={0} distance={46}>
            <Panel style={{ marginTop: 34, padding: "44px 52px", borderColor: C.line }}>
              <div style={{ fontFamily: C.mono, fontSize: 24, letterSpacing: 6, color: C.inkFaint, textTransform: "uppercase", marginBottom: 22 }}>
                Citations
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 18, flexWrap: "wrap" }}>
                <span style={{ fontFamily: C.sans, fontWeight: 600, fontSize: 36, color: C.ink }}>
                  Labour Code — Law No. 92/007
                </span>
                <span style={{ fontFamily: C.serifItalic, fontStyle: "italic", fontSize: 32, color: C.inkFaint }}>
                  Section 36
                </span>
                <Pill bg={C.brass} color={C.onBrass} delay={26} stamp size={24}>
                  primary
                </Pill>
              </div>
              <div
                style={{
                  marginTop: 24,
                  borderLeft: `3px solid ${C.lineStrong}`,
                  paddingLeft: 26,
                  fontFamily: C.serifItalic,
                  fontStyle: "italic",
                  fontSize: 30,
                  lineHeight: 1.55,
                  color: C.inkSoft,
                }}
              >
                “…a contract may be terminated without notice in cases of serious misconduct, subject
                to the findings of the competent court…”
              </div>
            </Panel>
          </FadeUp>
        </Sequence>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// S5 · Checked before showing — the four ticks + the Verified seal.
// ---------------------------------------------------------------------------
const CHECKS = ["Grounded in sources", "Citations valid", "Regime correct", "Uncertainty surfaced"];

export const SceneChecks: React.FC = () => {
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: PAD }}>
      <FadeUp>
        <div style={{ fontFamily: C.serif, fontWeight: 600, fontSize: 64, color: C.ink, marginBottom: 14 }}>
          Checked before showing.
        </div>
        <div style={{ fontFamily: C.sans, fontSize: 32, color: C.inkSoft, marginBottom: 48 }}>
          A second model grades every answer — before you see it.
        </div>
      </FadeUp>
      <Panel style={{ padding: "44px 52px", background: C.verdigrisSoft, borderColor: "rgba(108,199,173,0.25)" }}>
        {CHECKS.map((label, i) => {
          const delay = 20 + i * 14;
          return (
            <CheckRow key={label} label={label} delay={delay} last={i === CHECKS.length - 1} />
          );
        })}
        <div style={{ marginTop: 38, display: "flex", justifyContent: "flex-end" }}>
          <Pill bg={C.verdigris} color={C.sunken} delay={86} stamp size={30}>
            ✓&nbsp; Verified
          </Pill>
        </div>
      </Panel>
    </AbsoluteFill>
  );
};

const CheckRow: React.FC<{ label: string; delay: number; last: boolean }> = ({ label, delay, last }) => {
  const p = useSettle(delay);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 22,
        padding: "20px 0",
        borderBottom: last ? "none" : `1px solid rgba(108,199,173,0.15)`,
        opacity: p,
        transform: `translateX(${(1 - p) * 24}px)`,
      }}
    >
      <CheckIcon size={38} />
      <span style={{ fontFamily: C.sans, fontWeight: 500, fontSize: 38, color: C.ink }}>{label}</span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// S6 · The refusal — honesty as the feature.
// ---------------------------------------------------------------------------
export const SceneRefusal: React.FC = () => {
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: PAD }}>
      <FadeUp>
        <Panel style={{ padding: "36px 44px", marginBottom: 36 }}>
          <div style={{ fontFamily: C.sans, fontSize: 38, color: C.ink }}>
            <Typewriter text="What's the inheritance tax in Germany?" start={8} charsPerFrame={1.1} />
          </div>
        </Panel>
      </FadeUp>
      <Sequence from={66} layout="none">
        <FadeUp distance={36}>
          <Panel style={{ padding: "48px 52px", background: C.amberSoft, borderColor: "rgba(226,178,92,0.3)" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 26 }}>
              <span style={{ color: C.amber, fontSize: 42 }}>⚠</span>
              <span style={{ fontFamily: C.mono, fontSize: 24, letterSpacing: 5, color: C.amber, textTransform: "uppercase" }}>
                Outside my sources
              </span>
            </div>
            <div style={{ fontFamily: C.serif, fontWeight: 500, fontSize: 52, lineHeight: 1.4, color: C.ink }}>
              “I can't ground this in my sources — so I won't guess.”
            </div>
          </Panel>
        </FadeUp>
      </Sequence>
      <Sequence from={128} layout="none">
        <div style={{ marginTop: 44, textAlign: "center" }}>
          <span style={{ fontFamily: C.serifItalic, fontStyle: "italic", fontWeight: 600, fontSize: 56, color: C.brassInk }}>
            <WordStagger text="That's the point." />
          </span>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// S7 · Both Cameroons — FR question + OHADA, then the region chips.
// ---------------------------------------------------------------------------
export const SceneBilingual: React.FC = () => {
  const frame = useCurrentFrame();
  const slide = interpolate(frame, [108, 132], [0, -1080], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: PAD, overflow: "hidden" }}>
      <div style={{ display: "flex", width: 2160 - PAD * 2, transform: `translateX(${slide}px)`, gap: PAD * 2 }}>
        {/* beat 1: FR question → OHADA */}
        <div style={{ width: 1080 - PAD * 2, flexShrink: 0 }}>
          <FadeUp>
            <Panel style={{ padding: "40px 46px" }}>
              <div style={{ fontFamily: C.sans, fontSize: 40, color: C.ink }}>
                <Typewriter text="Quelle loi régit ma société à Douala ?" start={10} charsPerFrame={0.85} />
              </div>
            </Panel>
            <div style={{ display: "flex", gap: 16, marginTop: 30 }}>
              <Pill bg={C.brass} color={C.onBrass} delay={62} stamp size={28}>
                OHADA business law
              </Pill>
              <Pill bg={C.brassSoft} color={C.brassInk} delay={74} size={28}>
                supersedes national law
              </Pill>
            </div>
          </FadeUp>
        </div>
        {/* beat 2: the bijural chips */}
        <div style={{ width: 1080 - PAD * 2, flexShrink: 0 }}>
          <div style={{ fontFamily: C.serif, fontWeight: 600, fontSize: 60, color: C.ink, marginBottom: 40 }}>
            <WordStagger text="Built for both our legal traditions." delay={138} step={3} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {["Anglophone — common law (NW / SW)", "Francophone — droit civil", "OHADA — droit des affaires"].map(
              (label, i) => (
                <Pill key={label} bg={C.surface2} color={C.ink} delay={158 + i * 10} size={32}>
                  {label}
                </Pill>
              ),
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// S8 · The boundary.
// ---------------------------------------------------------------------------
export const SceneBoundary: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: PAD }}>
    <div style={{ position: "absolute", opacity: 0.05, transform: "scale(11)" }}>
      <ScaleGlyph size={64} color={C.brass} />
    </div>
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: C.serif, fontWeight: 700, fontSize: 92, color: C.ink, lineHeight: 1.1 }}>
        <WordStagger text="Information first." />
      </div>
      <div
        style={{
          marginTop: 30,
          fontFamily: C.serifItalic,
          fontStyle: "italic",
          fontWeight: 600,
          fontSize: 92,
          color: C.brassInk,
          lineHeight: 1.1,
        }}
      >
        <WordStagger text="Lawyers where it matters." delay={30} />
      </div>
    </div>
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------
// S9 · Outro — seal, wordmark, CTA.
// ---------------------------------------------------------------------------
export const SceneOutro: React.FC = () => {
  const stamp = useStamp(10);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: PAD }}>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 168,
            height: 168,
            borderRadius: 42,
            background: C.brass,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
            transform: `scale(${0.5 + stamp * 0.5})`,
            opacity: Math.min(1, stamp * 1.5),
            boxShadow: "0 30px 80px -20px rgba(201,169,106,0.35)",
          }}
        >
          <ScaleGlyph size={92} />
        </div>
        <FadeUp delay={26}>
          <div style={{ marginTop: 44, fontFamily: C.serif, fontWeight: 700, fontSize: 110, color: C.ink }}>
            Legalis
          </div>
          <div style={{ marginTop: 10, fontFamily: C.sans, fontSize: 38, color: C.inkSoft }}>
            Know where the law stands.
          </div>
        </FadeUp>
        <FadeUp delay={48}>
          <div style={{ marginTop: 56, fontFamily: C.mono, fontSize: 40, color: C.brassBright, letterSpacing: 2 }}>
            legalis.cm
          </div>
          <div style={{ marginTop: 22 }}>
            <Pill bg={C.brassSoft} color={C.brassInk} delay={64} size={26}>
              Free during beta
            </Pill>
          </div>
        </FadeUp>
        <FadeUp delay={86}>
          <div style={{ marginTop: 64, display: "inline-flex", alignItems: "center", gap: 14 }}>
            <CheckIcon size={30} />
            <span style={{ fontFamily: C.sans, fontSize: 26, color: C.inkFaint }}>
              Every answer cited &amp; self-checked
            </span>
          </div>
        </FadeUp>
      </div>
    </AbsoluteFill>
  );
};
