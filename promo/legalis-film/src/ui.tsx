import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "./brand";

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

/** Settle-without-bounce spring progress (UI motion language). */
export const useSettle = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 200 } });
};

/** The notary-seal stamp: tight, slightly bouncy — reserved for trust moments. */
export const useStamp = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 200, mass: 0.7 } });
};

export const FadeUp: React.FC<{
  delay?: number;
  children: React.ReactNode;
  distance?: number;
  style?: React.CSSProperties;
}> = ({ delay = 0, children, distance = 26, style }) => {
  const p = useSettle(delay);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * distance}px)`, ...style }}>
      {children}
    </div>
  );
};

/** Word-by-word staggered serif statement. */
export const WordStagger: React.FC<{
  text: string;
  delay?: number;
  step?: number;
  style?: React.CSSProperties;
}> = ({ text, delay = 0, step = 4, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <span style={style}>
      {text.split(" ").map((word, i) => {
        const p = spring({ frame: frame - delay - i * step, fps, config: { damping: 200 } });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: p,
              transform: `translateY(${(1 - p) * 22}px)`,
              marginRight: "0.28em",
            }}
          >
            {word}
          </span>
        );
      })}
    </span>
  );
};

/** Frame-driven typewriter with blinking caret. */
export const Typewriter: React.FC<{
  text: string;
  start: number;
  charsPerFrame?: number;
  showCaret?: boolean;
  style?: React.CSSProperties;
}> = ({ text, start, charsPerFrame = 0.9, showCaret = true, style }) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.floor((frame - start) * charsPerFrame));
  const shown = text.slice(0, n);
  const caretOn = Math.floor(frame / 14) % 2 === 0;
  return (
    <span style={style}>
      {shown}
      {showCaret ? (
        <span style={{ color: C.brass, opacity: caretOn ? 1 : 0.15 }}>▍</span>
      ) : null}
    </span>
  );
};

export const Pill: React.FC<{
  children: React.ReactNode;
  bg: string;
  color: string;
  delay?: number;
  stamp?: boolean;
  size?: number;
}> = ({ children, bg, color, delay = 0, stamp = false, size = 24 }) => {
  const settle = useSettle(delay);
  const st = useStamp(delay);
  const p = stamp ? st : settle;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: bg,
        color,
        fontFamily: C.sans,
        fontWeight: 600,
        fontSize: size,
        letterSpacing: 0.2,
        borderRadius: 10,
        padding: `${size * 0.35}px ${size * 0.7}px`,
        opacity: Math.min(1, p * 1.4),
        transform: `scale(${stamp ? 0.6 + p * 0.4 : 0.92 + p * 0.08})`,
      }}
    >
      {children}
    </span>
  );
};

export const Panel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      background: C.surface,
      border: `1px solid ${C.lineStrong}`,
      borderRadius: 22,
      boxShadow: "0 1px 0 rgba(236,230,216,0.04) inset, 0 30px 70px -30px rgba(0,0,0,0.75)",
      ...style,
    }}
  >
    {children}
  </div>
);

/** The Legalis scale glyph. */
export const ScaleGlyph: React.FC<{ size?: number; color?: string }> = ({
  size = 44,
  color = C.onBrass,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v18M5 21h14M12 6h7M12 6H5" />
    <path d="M7 6l-2.8 6a3 3 0 0 0 5.6 0L7 6Z" />
    <path d="M17 6l-2.8 6a3 3 0 0 0 5.6 0L17 6Z" />
  </svg>
);

/** Citation superscript chip, as in the product. */
export const Cite: React.FC<{ n: number }> = ({ n }) => (
  <sup
    style={{
      background: C.brassSoft,
      color: C.brassInk,
      fontFamily: C.sans,
      fontWeight: 700,
      fontSize: "0.55em",
      borderRadius: 6,
      padding: "2px 7px",
      marginLeft: 4,
    }}
  >
    {n}
  </sup>
);

export const CheckIcon: React.FC<{ size?: number; color?: string }> = ({ size = 26, color = C.verdigris }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
);

export const fadeWindow = (
  frame: number,
  start: number,
  end: number,
  fadeIn = 10,
  fadeOut = 10,
): number =>
  interpolate(frame, [start, start + fadeIn, end - fadeOut, end], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
