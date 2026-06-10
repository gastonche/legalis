import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadInterTight } from "@remotion/google-fonts/InterTight";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";

const fraunces = loadFraunces("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });
const frauncesItalic = loadFraunces("italic", { weights: ["600"], subsets: ["latin"] });
const interTight = loadInterTight("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });
const mono = loadJetBrainsMono("normal", { weights: ["500"], subsets: ["latin"] });

/** The Counsel design system, as used by the Legalis product. */
export const C = {
  paper: "#14130f",
  surface: "#1c1a14",
  surface2: "#232019",
  sunken: "#0c0b08",
  ink: "#ece6d8",
  inkSoft: "#bcb4a0",
  inkFaint: "#938b77",
  line: "#2b2820",
  lineStrong: "#3c372c",
  brass: "#c9a96a",
  brassBright: "#dcc088",
  brassSoft: "#2c2617",
  brassInk: "#e6c98c",
  onBrass: "#14130f",
  verdigris: "#6cc7ad",
  verdigrisSoft: "#15302a",
  amber: "#e2b25c",
  amberSoft: "#322810",
  serif: fraunces.fontFamily,
  serifItalic: frauncesItalic.fontFamily,
  sans: interTight.fontFamily,
  mono: mono.fontFamily,
};

/** Ambient brass glow + vignette, matching the product canvas. */
export const canvasBackground = `radial-gradient(1200px 900px at 88% -12%, rgba(201,169,106,0.10), transparent 60%),
 radial-gradient(1000px 900px at -12% 112%, rgba(108,199,173,0.05), transparent 58%),
 radial-gradient(2000px 1600px at 50% 50%, transparent 55%, rgba(0,0,0,0.4)),
 ${C.paper}`;
