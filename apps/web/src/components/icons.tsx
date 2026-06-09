import type { SVGProps } from "react";

// One icon family, 1.6 stroke, currentColor, sized via className (h-/w-). Decorative by default.
function Svg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}

export type IconProps = SVGProps<SVGSVGElement>;

export const ScaleIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="12" y1="3" x2="12" y2="21" />
    <line x1="6.5" y1="21" x2="17.5" y2="21" />
    <line x1="4" y1="7" x2="20" y2="7" />
    <path d="M4 7 1.6 12a3 3 0 0 0 4.8 0L4 7Z" />
    <path d="M20 7l-2.4 5a3 3 0 0 0 4.8 0L20 7Z" />
  </Svg>
);

export const InfoIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="11" x2="12" y2="16" />
    <circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 13l4 4L19 7" />
  </Svg>
);

export const XIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const BookIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 4a1 1 0 0 1 1-1h13v15H6a1 1 0 0 0-1 1V4Z" />
    <path d="M19 18H6a1 1 0 0 0-1 1v0a1 1 0 0 0 1 1h13" />
  </Svg>
);

export const ExternalIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4l-8.5 8.5" />
    <path d="M18 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4.5" />
  </Svg>
);

export const ShieldCheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l7 3v5.5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3Z" />
    <path d="M9 12l2.2 2.2L15.5 10" />
  </Svg>
);

export const HelpIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.4 9a2.6 2.6 0 1 1 3.7 2.4c-.9.4-1.1 1-1.1 1.8" />
    <circle cx="12" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
  </Svg>
);

export const PinIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z" />
    <circle cx="12" cy="11" r="2.2" />
  </Svg>
);

export const BriefcaseIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
    <path d="M3 12h18" />
  </Svg>
);

export const ChevronIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);

export const SparkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </Svg>
);
