import React from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { titleFont } from "./fonts";

/** Big hook text in the first seconds — the most important 2s of a reel. */
export const HookTitle: React.FC<{ text: string; top?: number; color?: string; accent?: string }> = ({
  text,
  top = 260,
  color = "#fff",
  accent = "#FFD400",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 12, stiffness: 180 } });
  const out = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Words wrapped in *stars* get the accent color.
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: top, opacity: out }}>
      <div
        style={{
          width: 940,
          textAlign: "center",
          fontFamily: titleFont,
          fontSize: 104,
          lineHeight: 1.02,
          color,
          textTransform: "uppercase",
          transform: `translateY(${(1 - s) * -60}px) scale(${0.9 + 0.1 * s})`,
          opacity: s,
          WebkitTextStroke: "12px black",
          paintOrder: "stroke fill",
          textShadow: "0 10px 30px rgba(0,0,0,.6)",
        }}
      >
        {parts.map((p, i) =>
          p.startsWith("*") ? (
            <span key={i} style={{ color: accent }}>
              {p.slice(1, -1)}
            </span>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
      </div>
    </AbsoluteFill>
  );
};

/** Cinematic look: grain + vignette + optional letterbox bars. */
export const FilmLook: React.FC<{ grain?: number; vignette?: number; letterbox?: number }> = ({
  grain = 0.08,
  vignette = 0.55,
  letterbox = 0,
}) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2); // grain changes every 2 frames, like film
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {grain > 0 && (
        <svg width="100%" height="100%" style={{ position: "absolute", opacity: grain, mixBlendMode: "overlay" }}>
          <filter id={`g${seed}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#g${seed})`} />
        </svg>
      )}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${vignette}) 100%)`,
        }}
      />
      {letterbox > 0 && (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: letterbox, background: "#000" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: letterbox, background: "#000" }} />
        </>
      )}
    </AbsoluteFill>
  );
};

/** Falling snow / ash / dust particles. */
export const Particles: React.FC<{ count?: number; color?: string; speed?: number; seed?: string }> = ({
  count = 120,
  color = "#fff",
  speed = 1,
  seed = "snow",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {new Array(count).fill(0).map((_, i) => {
        const r = (k: string) => random(`${seed}-${i}-${k}`);
        const size = 3 + r("s") * 9;
        const v = (0.6 + r("v") * 1.6) * speed * (size / 6);
        const y = ((r("y") * height + frame * v * 3) % (height + 40)) - 20;
        const x = r("x") * width + Math.sin(frame / (20 + r("w") * 30) + i) * 25;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: color,
              opacity: 0.35 + r("o") * 0.5,
              filter: size > 9 ? "blur(2px)" : undefined,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Thin progress bar at top — boosts watch-through. */
export const ProgressBar: React.FC<{ color?: string }> = ({ color = "#FFD400" }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: 10,
        width: `${(frame / durationInFrames) * 100}%`,
        background: color,
      }}
    />
  );
};
