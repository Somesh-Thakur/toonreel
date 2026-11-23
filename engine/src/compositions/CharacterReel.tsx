import type { Caption } from "@remotion/captions";
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { Character2D, type CharacterLook } from "../components/Character2D";
import { FilmLook, HookTitle, Particles, ProgressBar } from "../components/Overlays";
import { ReelCaptions, type CaptionStyle } from "../components/ReelCaptions";
import { Scenery, type SceneName } from "../components/Scenery";

export type CharacterReelProps = {
  voice: string; // path inside studio/public
  captions: Caption[];
  durationSec: number;
  hook?: string;
  hookSec?: number;
  scene?: SceneName;
  look?: CharacterLook;
  particles?: "snow" | "ash" | "none";
  music?: string;
  musicVolume?: number;
  captionStyle?: CaptionStyle;
};

/** "Faceless" 2D-character explainer / storyteller reel. */
export const CharacterReel: React.FC<CharacterReelProps> = ({
  voice,
  captions,
  hook,
  hookSec = 2.5,
  scene = "mountains",
  look,
  particles = "snow",
  music,
  musicVolume = 0.12,
  captionStyle,
}) => {
  const { fps } = useVideoConfig();
  const voiceSrc = staticFile(voice);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Scenery scene={scene} />
      {particles !== "none" && <Particles color={particles === "ash" ? "#bbb" : "#fff"} count={90} speed={0.8} seed="back" />}
      <Character2D audioSrc={voiceSrc} look={look} scale={0.95} x={540} y={1990} />
      {particles !== "none" && <Particles color={particles === "ash" ? "#999" : "#fff"} count={40} speed={1.4} seed="front" />}
      <FilmLook grain={0.07} vignette={0.45} />
      <ReelCaptions captions={captions} style={{ bottom: 1180, ...captionStyle }} />
      {hook && (
        <Sequence durationInFrames={Math.round(hookSec * fps)} name="Hook">
          <HookTitle text={hook} />
        </Sequence>
      )}
      <ProgressBar />
      <Audio src={voiceSrc} />
      {music && <Audio src={staticFile(music)} volume={musicVolume} loop />}
    </AbsoluteFill>
  );
};
