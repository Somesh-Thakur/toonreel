import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

export type SceneName = "mountains" | "night" | "sunset" | "plain";

const palettes: Record<SceneName, { sky: [string, string]; far: string; mid: string; near: string; snow: string }> = {
  mountains: { sky: ["#8FB8DE", "#DCEBF5"], far: "#9AAFC4", mid: "#6E849B", near: "#4B5D70", snow: "#F4F8FB" },
  night: { sky: ["#0B1430", "#28365E"], far: "#2A3858", mid: "#1D2843", near: "#131B30", snow: "#B9C6E0" },
  sunset: { sky: ["#F39C5A", "#FBD38D"], far: "#C77D6A", mid: "#8F5560", near: "#5A3A4E", snow: "#FFE8D2" },
  plain: { sky: ["#1E1E24", "#33333D"], far: "#2A2A33", mid: "#24242C", near: "#1C1C22", snow: "#666" },
};

/** Flat 2D parallax background (slow camera drift) — pure SVG. */
export const Scenery: React.FC<{ scene?: SceneName }> = ({ scene = "mountains" }) => {
  const frame = useCurrentFrame();
  const p = palettes[scene];
  const drift = (k: number) => -frame * 0.15 * k;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(${p.sky[0]}, ${p.sky[1]})` }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute" }}>
        {scene === "night" &&
          new Array(60).fill(0).map((_, i) => (
            <circle key={i} cx={(i * 197) % 1080} cy={(i * 131) % 900} r={(i % 3) + 1.5} fill="#fff"
              opacity={0.4 + 0.5 * Math.abs(Math.sin(frame / 20 + i))} />
          ))}
        {scene === "sunset" && <circle cx={760} cy={760} r={140} fill="#FFE29A" opacity={0.9} />}
        <g transform={`translate(${drift(1)} 0)`}>
          <path d="M-200 1100 L80 720 L260 930 L470 640 L700 940 L900 700 L1150 1000 L1400 760 L1400 1920 L-200 1920 Z" fill={p.far} />
          <path d="M80 720 L140 800 L110 810 L80 780 L50 815 L30 790 Z M470 640 L530 720 L490 735 L470 700 L440 740 L410 720 Z M900 700 L960 780 L925 790 L900 760 L870 795 L850 770 Z" fill={p.snow} />
        </g>
        <g transform={`translate(${drift(2.2)} 0)`}>
          <path d="M-300 1300 L0 980 L240 1180 L520 900 L820 1230 L1050 1020 L1400 1300 L1400 1920 L-300 1920 Z" fill={p.mid} />
          <path d="M520 900 L590 975 L545 985 L520 955 L490 990 L455 970 Z M0 980 L60 1040 L20 1050 L0 1025 L-25 1055 Z" fill={p.snow} />
        </g>
        <g transform={`translate(${drift(4)} 0)`}>
          <path d="M-400 1560 Q100 1400 500 1500 Q900 1600 1500 1450 L1500 1920 L-400 1920 Z" fill={p.near} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
