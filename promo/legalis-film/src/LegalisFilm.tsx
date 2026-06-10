import React from "react";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { canvasBackground } from "./brand";
import {
  SceneAnswer,
  SceneBilingual,
  SceneBoundary,
  SceneChecks,
  SceneNoise,
  SceneOutro,
  SceneQuestion,
  SceneRefusal,
  SceneStatement,
} from "./scenes";

/**
 * "Where the Law Stands" — 60s vertical hero film. No voiceover by design:
 * the serif statements carry the narrative; a generated drone + the free
 * remotion.media SFX carry the emotion. Engineered silence at S2 and S6.
 *
 * Frame map (30fps): S1 0–180 noise · S2 180–270 statement · S3 270–450
 * question · S4 450–780 answer+citation · S5 780–960 checks · S6 960–1140
 * refusal · S7 1140–1380 bilingual · S8 1380–1620 boundary · S9 1620–1800 CTA.
 */
export const LegalisFilm: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: canvasBackground }}>
      <Sequence durationInFrames={180}>
        <SceneNoise />
      </Sequence>
      <Sequence from={180} durationInFrames={90}>
        <SceneStatement />
      </Sequence>
      <Sequence from={270} durationInFrames={180}>
        <SceneQuestion />
      </Sequence>
      <Sequence from={450} durationInFrames={330}>
        <SceneAnswer />
      </Sequence>
      <Sequence from={780} durationInFrames={180}>
        <SceneChecks />
      </Sequence>
      <Sequence from={960} durationInFrames={180}>
        <SceneRefusal />
      </Sequence>
      <Sequence from={1140} durationInFrames={240}>
        <SceneBilingual />
      </Sequence>
      <Sequence from={1380} durationInFrames={240}>
        <SceneBoundary />
      </Sequence>
      <Sequence from={1620} durationInFrames={180}>
        <SceneOutro />
      </Sequence>

      {/* ---- sound design: generated drone + free remotion.media SFX ---- */}
      {/* S1 tension drone, hard-cut at the S2 silence */}
      <Sequence durationInFrames={180}>
        <Audio src={staticFile("drone.wav")} volume={() => 0.85} />
      </Sequence>
      {/* S3 send press */}
      <Sequence from={405} durationInFrames={40}>
        <Audio src={staticFile("mouse-click.wav")} volume={0.6} />
      </Sequence>
      {/* S4 the statute arrives */}
      <Sequence from={612} durationInFrames={50}>
        <Audio src={staticFile("page-turn.wav")} volume={0.5} />
      </Sequence>
      {/* S5 four rising ticks + the Verified chime */}
      {[798, 812, 826, 840].map((f, i) => (
        <Sequence key={f} from={f} durationInFrames={30}>
          <Audio src={staticFile("switch.wav")} volume={() => 0.32 + i * 0.04} />
        </Sequence>
      ))}
      <Sequence from={862} durationInFrames={70}>
        <Audio src={staticFile("ding.wav")} volume={0.45} />
      </Sequence>
      {/* S7 slide between the two beats */}
      <Sequence from={1244} durationInFrames={40}>
        <Audio src={staticFile("whoosh.wav")} volume={0.5} />
      </Sequence>
      {/* S9 the earned callback chime, softer */}
      <Sequence from={1626} durationInFrames={70}>
        <Audio src={staticFile("ding.wav")} volume={0.3} />
      </Sequence>
    </AbsoluteFill>
  );
};
