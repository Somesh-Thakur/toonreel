import { Audio, Video } from "@remotion/media";
import { fade } from "@remotion/transitions/fade";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import React from "react";
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { captionFont } from "../components/fonts";
import { FilmLook, Particles } from "../components/Overlays";

/** Color grades used by cinematic AI-story trends (zombie, war, memory flashback...). */
export const GRADES: Record<string, string> = {
  none: "none",
  cold: "saturate(0.6) contrast(1.15) brightness(0.9) hue-rotate(-8deg)",
  zombie: "saturate(0.35) contrast(1.25) brightness(0.82) hue-rotate(35deg)",
  war: "sepia(0.3) saturate(0.7) contrast(1.2) brightness(0.9)",
  warm: "sepia(0.2) saturate(1.25) brightness(1.05)",
  memory: "sepia(0.35) saturate(1.3) brightness(1.12) contrast(0.92) blur(0.4px)",
  bw: "grayscale(1) contrast(1.2)",
};

export const FADE_FRAMES = 12;

export type StoryClip = {
  src: string; // path inside studio/public
  durationSec: number;
  /** skip this many seconds at the clip start */
  trimSec?: number;
  text?: string;
  textPos?: "top" | "center" | "bottom";
  grade?: keyof typeof GRADES | string;
  /** how this clip enters */
  transition?: "cut" | "fade" | "flash";
  /** slow push-in, Ken Burns */
  push?: boolean;
  /** keep the clip's own audio */
  keepAudio?: boolean;
};

export type StoryReelProps = {
  clips: StoryClip[];
  durationSec: number;
  music?: string;
  musicVolume?: number;
  letterbox?: number;
  grain?: number;
  particles?: "snow" | "ash" | "none";
};

const ClipView: React.FC<{ clip: StoryClip; frames: number }> = ({ clip, frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const grade = GRADES[clip.grade ?? "none"] ?? clip.grade;
  const push = clip.push ? interpolate(frame, [0, frames], [1, 1.12]) : 1;
  const flash = clip.transition === "flash" ? interpolate(frame, [0, 9], [1, 0], { extrapolateRight: "clamp" }) : 0;
  const textIn = interpolate(frame, [6, 18, frames - 10, frames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pos = clip.textPos ?? "bottom";
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${push})`, filter: grade }}>
        <Video objectFit="cover"
          src={staticFile(clip.src)}
          trimBefore={Math.round((clip.trimSec ?? 0) * fps)}
          muted={!clip.keepAudio}
          style={{ width: "100%", height: "100%" }}
        />
      </AbsoluteFill>
      {clip.text && (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: pos === "top" ? "flex-start" : pos === "center" ? "center" : "flex-end",
            padding: pos === "center" ? 0 : "330px 0",
          }}
        >
          <div
            style={{
              width: 880,
              textAlign: "center",
              fontFamily: captionFont,
              fontWeight: 800,
              fontSize: 64,
              color: "#fff",
              opacity: textIn,
              transform: `translateY(${(1 - textIn) * 20}px)`,
              textShadow: "0 4px 18px rgba(0,0,0,.9)",
            }}
          >
            {clip.text}
          </div>
        </AbsoluteFill>
      )}
      {flash > 0 && <AbsoluteFill style={{ background: "#fff", opacity: flash }} />}
    </AbsoluteFill>
  );
};

/** Stitch AI-generated (or any) clips into a cinematic story reel. */
export const StoryReel: React.FC<StoryReelProps> = ({
  clips,
  music,
  musicVolume = 0.8,
  letterbox = 0,
  grain = 0.09,
  particles = "none",
}) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <TransitionSeries>
        {clips.flatMap((clip, i) => {
          const frames = Math.round(clip.durationSec * fps);
          const parts = [];
          if (i > 0 && clip.transition === "fade") {
            parts.push(
              <TransitionSeries.Transition
                key={`t${i}`}
                presentation={fade()}
                timing={linearTiming({ durationInFrames: FADE_FRAMES })}
              />,
            );
          }
          parts.push(
            <TransitionSeries.Sequence key={`s${i}`} durationInFrames={frames} name={`Clip ${i + 1}`}>
              <ClipView clip={clip} frames={frames} />
            </TransitionSeries.Sequence>,
          );
          return parts;
        })}
      </TransitionSeries>
      {particles !== "none" && <Particles color={particles === "ash" ? "#aaa" : "#fff"} count={70} />}
      <FilmLook grain={grain} vignette={0.5} letterbox={letterbox} />
      {music && <Audio src={staticFile(music)} volume={musicVolume} />}
    </AbsoluteFill>
  );
};

export const storyDurationSec = (clips: StoryClip[]) =>
  clips.reduce((t, c, i) => t + c.durationSec - (i > 0 && c.transition === "fade" ? FADE_FRAMES / 30 : 0), 0);
