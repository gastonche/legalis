import "./index.css";
import React from "react";
import { Composition } from "remotion";
import { LegalisFilm } from "./LegalisFilm";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 60s vertical master — WhatsApp / TikTok / Reels */}
      <Composition
        id="LegalisFilm"
        component={LegalisFilm}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
