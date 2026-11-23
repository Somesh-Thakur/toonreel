import { useAudioData, visualizeAudio } from "@remotion/media-utils";
import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export type CharacterLook = {
  skin?: string;
  outfit?: string;
  outfitDark?: string;
  hat?: "helmet" | "cap" | "beret" | "chef" | "none";
  hatColor?: string;
  hair?: string;
  mustache?: boolean;
  eyes?: string;
  /** uniform = army shirt with pockets; suit = blazer, shirt and tie; kurti = round neck with border */
  style?: "uniform" | "suit" | "kurti" | "chef" | "hoodie";
  tie?: string;
  glasses?: boolean;
  /** only used when hat = "none" */
  hairStyle?: "short" | "long" | "bun";
  /** lashes, coloured lips, earrings */
  female?: boolean;
  lips?: string;
};

export type CharacterPose = {
  /** jump height in px (0 = none) */
  jump?: number;
  /** offset so a crowd doesn't move in sync */
  phase?: number;
  /** both arms up, waving */
  cheer?: boolean;
  /** force right-arm angle (deg). -130 = point up-right, -165 = hand raised */
  armAngle?: number;
  /** force left-arm angle (deg). 130 = point up-left */
  leftArmAngle?: number;
};

type CharProps = {
  audioSrc?: string;
  look?: CharacterLook;
  scale?: number;
  x?: number;
  y?: number;
  /** turn toward camera-left (-1) or right (1) slightly */
  lean?: number;
  pose?: CharacterPose;
  /** loudness gain for lip-sync (default 9) */
  gain?: number;
  /** mouth level 0..1 when there is no audio (preview mode) */
  talkLevel?: number;
};

/**
 * Original flat-2D cartoon character. Pure SVG, no assets needed.
 * - Lip-sync: mouth opens from the voice track's loudness (lowfreq bins)
 * - Auto blink, breathing, head-bob while talking, hand gestures on loud words
 * - Poses: jump, cheer, point, raise hand
 */
export const Character2D: React.FC<CharProps> = (p) =>
  p.audioSrc ? <Talking {...p} audioSrc={p.audioSrc} /> : <Figure {...p} talk={p.talkLevel ?? 0} />;

const Talking: React.FC<CharProps & { audioSrc: string }> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audio = useAudioData(p.audioSrc);
  let loud = 0;
  if (audio) {
    const bins = visualizeAudio({ fps, frame, audioData: audio, numberOfSamples: 32, smoothing: true });
    loud = bins.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
  }
  return <Figure {...p} talk={Math.min(1, loud * (p.gain ?? 9))} />;
};

const Figure: React.FC<CharProps & { talk: number }> = ({
  look = {},
  scale = 1,
  x = 540,
  y = 1920,
  lean = 0,
  pose = {},
  talk,
}) => {
  const frame = useCurrentFrame();

  const {
    skin = "#E8B48A",
    outfit = "#5B6B3A",
    outfitDark = "#3E4A27",
    hat = "helmet",
    hatColor = "#4A5A2E",
    hair = "#2B1B10",
    mustache = true,
    eyes = "#1B1B1B",
    style = "uniform",
    tie = "#C8102E",
    glasses = false,
    hairStyle = "short",
    female = false,
    lips = "#C2185B",
  } = look;
  const { jump = 0, phase = 0, cheer = false } = pose;

  const mouthOpen = talk > 0.12 ? talk : 0;
  const hop = jump > 0 ? -Math.abs(Math.sin(frame / 5 + phase)) * jump : 0;

  // ---- idle motion --------------------------------------------------------------
  const breath = Math.sin(frame / 22) * 4;
  const bob = Math.sin(frame / 4.5) * 5 * talk;
  const tilt = Math.sin(frame / 37) * 2.5 + lean * 4 + Math.sin(frame / 9) * 2 * talk;
  // blink ~ every 3.2s, 4 frames long, with a deterministic jitter
  const cyc = (frame + Math.round(phase * 17)) % 97;
  const blink = cyc < 4 ? 1 - Math.abs(cyc - 1.5) / 2.5 : 0;
  const eyeH = 26 * (1 - Math.max(0, blink));
  // gesture arm rises on loud passages, smoothed by sin
  const gesture = interpolate(talk, [0.3, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const wave = Math.sin(frame / 3 + phase) * 15;
  const armAngle = cheer
    ? -160 + wave
    : pose.armAngle !== undefined
      ? pose.armAngle + Math.sin(frame / 8) * 4
      : -10 - gesture * 55 + Math.sin(frame / 6) * 8 * gesture;
  const leftArm = cheer ? 160 - wave : pose.leftArmAngle !== undefined ? pose.leftArmAngle : 8;
  const brow = -6 * talk;

  return (
    <svg
      width={1080}
      height={1920}
      viewBox="0 0 1080 1920"
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
    >
      <g transform={`translate(${x} ${y}) scale(${scale}) translate(-540 -1920)`}>
        {/* ground shadow (shrinks while airborne) */}
        <ellipse cx={540} cy={1905} rx={330 + hop * 0.6} ry={34} fill="rgba(0,0,0,.28)" />
        <g transform={`translate(0 ${hop})`}>
        {/* long hair falls behind the shoulders */}
        {hat === "none" && hairStyle === "long" && (
          <g transform={`translate(0 ${breath + bob}) rotate(${tilt} 540 1290)`}>
            <path
              d="M360 950 Q340 780 540 770 Q740 780 720 950 L745 1330 Q640 1370 540 1350 Q440 1370 335 1330 Z"
              fill={hair}
              stroke="#141414"
              strokeWidth={8}
            />
          </g>
        )}

        {/* ---------- body ---------- */}
        <g transform={`translate(0 ${breath * 0.5})`}>
          {/* torso */}
          <path
            d="M300 1920 L330 1440 Q340 1330 450 1310 L630 1310 Q740 1330 750 1440 L780 1920 Z"
            fill={outfit}
            stroke="#141414"
            strokeWidth={8}
          />
          {style === "uniform" ? (
            <>
              {/* collar + chest pockets */}
              <path d="M470 1312 L540 1400 L610 1312" fill={outfitDark} stroke="#141414" strokeWidth={7} />
              <rect x={385} y={1470} width={110} height={90} rx={12} fill={outfitDark} stroke="#141414" strokeWidth={6} />
              <rect x={585} y={1470} width={110} height={90} rx={12} fill={outfitDark} stroke="#141414" strokeWidth={6} />
            </>
          ) : style === "chef" ? (
            <>
              {/* double-breasted chef coat + red neckerchief */}
              <path d="M455 1312 L540 1380 L625 1312 L600 1300 L540 1340 L480 1300 Z" fill="#E53935" stroke="#141414" strokeWidth={6} />
              <path d="M510 1370 L540 1440 L570 1370 Z" fill="#E53935" stroke="#141414" strokeWidth={5} />
              <path d="M600 1400 L600 1900" stroke="#C9C9C9" strokeWidth={6} />
              {[1480, 1580, 1680, 1780].map((cy) => (
                <g key={cy}>
                  <circle cx={490} cy={cy} r={12} fill="#9E9E9E" stroke="#141414" strokeWidth={3} />
                  <circle cx={640} cy={cy} r={12} fill="#9E9E9E" stroke="#141414" strokeWidth={3} />
                </g>
              ))}
            </>
          ) : style === "hoodie" ? (
            <>
              {/* hood behind the neck, drawstrings, kangaroo pocket, chest print */}
              <path d="M420 1330 Q540 1250 660 1330 Q600 1380 540 1380 Q480 1380 420 1330 Z" fill={outfitDark} stroke="#141414" strokeWidth={7} />
              <path d="M505 1370 L495 1480 M575 1370 L585 1480" stroke="#FAFAFA" strokeWidth={8} strokeLinecap="round" />
              <circle cx={495} cy={1486} r={9} fill="#FAFAFA" />
              <circle cx={585} cy={1486} r={9} fill="#FAFAFA" />
              <path d="M410 1690 L670 1690 L640 1810 L440 1810 Z" fill={outfitDark} stroke="#141414" strokeWidth={6} />
              <text x={540} y={1610} textAnchor="middle" fontFamily="Anton, sans-serif" fontSize={64} fill="#FFD400">
                GEN Z
              </text>
            </>
          ) : style === "kurti" ? (
            <>
              {/* round neckline with embroidered border + placket */}
              <path d="M460 1312 Q540 1420 620 1312" fill={skin} stroke="#141414" strokeWidth={7} />
              <path d="M455 1318 Q540 1440 625 1318" fill="none" stroke={outfitDark} strokeWidth={16} />
              {[1470, 1530, 1590, 1650].map((cy) => (
                <circle key={cy} cx={540} cy={cy} r={10} fill={outfitDark} stroke="#141414" strokeWidth={3} />
              ))}
              <path d="M320 1820 L760 1820" stroke={outfitDark} strokeWidth={22} />
            </>
          ) : (
            <>
              {/* shirt V */}
              <path d="M455 1312 L540 1560 L625 1312 Z" fill="#F7F7F2" stroke="#141414" strokeWidth={7} />
              {/* tie */}
              <path d="M522 1330 L558 1330 L566 1350 L554 1362 Z" fill={tie} stroke="#141414" strokeWidth={5} />
              <path d="M528 1360 L552 1360 L568 1500 L540 1535 L512 1500 Z" fill={tie} stroke="#141414" strokeWidth={6} />
              {/* lapels */}
              <path d="M455 1312 L510 1470 L470 1440 L430 1480 L440 1330 Z" fill={outfitDark} stroke="#141414" strokeWidth={6} />
              <path d="M625 1312 L570 1470 L610 1440 L650 1480 L640 1330 Z" fill={outfitDark} stroke="#141414" strokeWidth={6} />
              {/* pocket square + buttons */}
              <path d="M650 1520 L700 1520 L700 1535 L650 1535 Z" fill="#141414" />
              <path d="M660 1520 L672 1500 L684 1520 Z" fill="#fff" stroke="#141414" strokeWidth={3} />
              <circle cx={540} cy={1600} r={9} fill="#141414" />
              <circle cx={540} cy={1660} r={9} fill="#141414" />
            </>
          )}
          {/* left arm */}
          <g transform={`rotate(${leftArm} 345 1360)`}>
            <rect x={285} y={1350} width={95} height={330} rx={46} fill={outfit} stroke="#141414" strokeWidth={8} />
            <circle cx={332} cy={1690} r={44} fill={skin} stroke="#141414" strokeWidth={8} />
          </g>
          {/* right arm (gestures) */}
          <g transform={`rotate(${armAngle} 735 1360)`}>
            <rect x={700} y={1350} width={95} height={330} rx={46} fill={outfit} stroke="#141414" strokeWidth={8} />
            <circle cx={748} cy={1690} r={44} fill={skin} stroke="#141414" strokeWidth={8} />
          </g>
        </g>

        {/* ---------- head ---------- */}
        <g transform={`translate(0 ${breath + bob}) rotate(${tilt} 540 1290)`}>
          {/* neck */}
          <rect x={495} y={1220} width={90} height={110} fill={skin} stroke="#141414" strokeWidth={8} />
          {/* ears */}
          <ellipse cx={378} cy={1060} rx={34} ry={48} fill={skin} stroke="#141414" strokeWidth={8} />
          <ellipse cx={702} cy={1060} rx={34} ry={48} fill={skin} stroke="#141414" strokeWidth={8} />
          {/* face */}
          <path
            d="M385 960 Q385 800 540 800 Q695 800 695 960 L695 1100 Q695 1250 540 1260 Q385 1250 385 1100 Z"
            fill={skin}
            stroke="#141414"
            strokeWidth={9}
          />
          {/* hair sideburns */}
          {hat !== "none" && (
            <>
              <path d="M392 930 L392 1010 L420 1000 L420 925 Z" fill={hair} />
              <path d="M688 930 L688 1010 L660 1000 L660 925 Z" fill={hair} />
            </>
          )}
          {/* eyebrows */}
          <g transform={`translate(0 ${brow})`}>
            <rect x={440} y={955} width={70} height={16} rx={8} fill={hair} transform="rotate(-6 475 963)" />
            <rect x={570} y={955} width={70} height={16} rx={8} fill={hair} transform="rotate(6 605 963)" />
          </g>
          {/* eyes */}
          <ellipse cx={478} cy={1010} rx={16} ry={Math.max(2, eyeH / 2)} fill={eyes} />
          <ellipse cx={602} cy={1010} rx={16} ry={Math.max(2, eyeH / 2)} fill={eyes} />
          {blink < 0.3 && (
            <>
              <circle cx={484} cy={1003} r={5} fill="#fff" />
              <circle cx={608} cy={1003} r={5} fill="#fff" />
            </>
          )}
          {female && (
            <g stroke="#141414" strokeWidth={6} strokeLinecap="round">
              <path d="M460 996 L446 984 M466 990 L458 976" />
              <path d="M620 996 L634 984 M614 990 L622 976" />
            </g>
          )}
          {female && (
            <>
              <circle cx={372} cy={1112} r={14} fill="#F4C430" stroke="#141414" strokeWidth={4} />
              <circle cx={708} cy={1112} r={14} fill="#F4C430" stroke="#141414" strokeWidth={4} />
            </>
          )}
          {glasses && (
            <g fill="rgba(255,255,255,.15)" stroke="#141414" strokeWidth={8}>
              <rect x={432} y={975} width={92} height={70} rx={20} />
              <rect x={556} y={975} width={92} height={70} rx={20} />
              <path d="M524 1005 Q540 992 556 1005" fill="none" />
            </g>
          )}
          {/* nose */}
          <path d="M540 1030 Q528 1085 548 1092" fill="none" stroke="#141414" strokeWidth={7} strokeLinecap="round" />
          {/* cheeks */}
          <ellipse cx={440} cy={1100} rx={30} ry={16} fill="#E0846A" opacity={0.45} />
          <ellipse cx={640} cy={1100} rx={30} ry={16} fill="#E0846A" opacity={0.45} />
          {/* mouth */}
          {mouthOpen > 0 ? (
            <g>
              <ellipse cx={540} cy={1160} rx={38 + 10 * mouthOpen} ry={8 + 34 * mouthOpen} fill="#5A1A14" stroke="#141414" strokeWidth={7} />
              <ellipse cx={540} cy={1172 + 14 * mouthOpen} rx={22} ry={8 * mouthOpen} fill="#E26B6B" />
            </g>
          ) : (
            <path
              d="M500 1158 Q540 1180 580 1158"
              fill="none"
              stroke={female ? lips : "#141414"}
              strokeWidth={female ? 12 : 8}
              strokeLinecap="round"
            />
          )}
          {/* mustache */}
          {mustache && (
            <path
              d="M475 1130 Q510 1108 540 1126 Q570 1108 605 1130 Q575 1142 540 1134 Q505 1142 475 1130 Z"
              fill={hair}
              stroke="#141414"
              strokeWidth={4}
            />
          )}
          {/* headgear */}
          {hat === "helmet" && (
            <g>
              <path d="M355 935 Q355 735 540 728 Q725 735 725 935 Z" fill={hatColor} stroke="#141414" strokeWidth={9} />
              <rect x={340} y={918} width={400} height={38} rx={19} fill={hatColor} stroke="#141414" strokeWidth={8} />
              {/* camo net dots */}
              {[[430, 830], [520, 790], [610, 840], [470, 885], [650, 900], [560, 870]].map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r={18} fill="#2F3A1D" opacity={0.7} />
              ))}
            </g>
          )}
          {hat === "cap" && (
            <g>
              <path d="M385 900 Q390 770 540 765 Q690 770 695 900 Z" fill={hatColor} stroke="#141414" strokeWidth={9} />
              <path d="M385 900 Q540 940 760 905 L760 925 Q540 965 385 925 Z" fill={hatColor} stroke="#141414" strokeWidth={8} />
            </g>
          )}
          {hat === "beret" && (
            <g>
              <ellipse cx={515} cy={850} rx={190} ry={75} fill={hatColor} stroke="#141414" strokeWidth={9} transform="rotate(-8 515 850)" />
              <rect x={385} y={880} width={310} height={34} rx={14} fill="#1E1E1E" />
              <circle cx={455} cy={880} r={20} fill="#D4AF37" stroke="#141414" strokeWidth={5} />
            </g>
          )}
          {hat === "chef" && (
            <g fill="#FFFFFF" stroke="#141414" strokeWidth={8}>
              <circle cx={440} cy={760} r={80} />
              <circle cx={540} cy={700} r={95} />
              <circle cx={640} cy={760} r={80} />
              <rect x={400} y={770} width={280} height={140} />
              <rect x={385} y={880} width={310} height={60} rx={14} />
              <path d="M440 800 L440 880 M540 790 L540 880 M640 800 L640 880" stroke="#D0D0D0" strokeWidth={6} />
            </g>
          )}
          {hat === "none" && hairStyle !== "long" && (
            <path d="M385 940 Q380 790 540 790 Q700 790 695 940 Q640 880 540 880 Q440 880 385 940 Z" fill={hair} stroke="#141414" strokeWidth={8} />
          )}
          {hat === "none" && hairStyle === "bun" && (
            <circle cx={540} cy={770} r={62} fill={hair} stroke="#141414" strokeWidth={8} />
          )}
          {hat === "none" && hairStyle === "long" && (
            // side-parted fringe
            <path
              d="M380 990 Q370 800 540 790 Q710 800 700 990 Q690 900 600 875 Q520 930 420 900 Q395 930 380 990 Z"
              fill={hair}
              stroke="#141414"
              strokeWidth={8}
            />
          )}
        </g>
        </g>
      </g>
    </svg>
  );
};
