import type { Caption } from "@remotion/captions";
import { Audio, Video } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FilmLook, HookTitle, ProgressBar } from "../components/Overlays";
import { ReelCaptions, type CaptionStyle } from "../components/ReelCaptions";

export type CaptionedReelProps = {
  video: string; // path inside studio/public
  captions: Caption[];
  durationSec: number;
  hook?: string;
  hookSec?: number;
  /** alternate 100% / 112% zoom every N seconds — fake "multi-cam" jump cuts */
  punchEverySec?: number;
  music?: string;
  musicVolume?: number;
  grade?: string; // CSS filter
  captionStyle?: CaptionStyle;
  progressBar?: boolean;
};

/** Your own talking / b-roll footage -> reel with captions, hook, punch-ins. */
export const CaptionedReel: React.FC<CaptionedReelProps> = ({
  video,
  captions,
  hook,
  hookSec = 2.5,
  punchEverySec = 3,
  music,
  musicVolume = 0.1,
  grade = "contrast(1.06) saturate(1.1)",
  captionStyle,
  progressBar = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const punched = punchEverySec > 0 && Math.floor(frame / (punchEverySec * fps)) % 2 === 1;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${punched ? 1.12 : 1})`, filter: grade }}>
        <Video src={staticFile(video)} objectFit="cover" style={{ width: "100%", height: "100%" }} />
      </AbsoluteFill>
      <FilmLook grain={0.04} vignette={0.35} />
      <ReelCaptions captions={captions} style={captionStyle} />
      {hook && (
        <Sequence durationInFrames={Math.round(hookSec * fps)} name="Hook">
          <HookTitle text={hook} />
        </Sequence>
      )}
      {progressBar && <ProgressBar />}
      {music && <Audio src={staticFile(music)} volume={musicVolume} loop />}
    </AbsoluteFill>
  );
};
