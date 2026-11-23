import React from "react";
import { AbsoluteFill, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { captionFont, titleFont } from "./fonts";

/** Flat-2D shop/office front on a street. Shutter 0 = closed, 1 = fully open. */
export const ShopFront: React.FC<{ shutter: number; interior?: string; sign1: string; sign2: string }> = ({
  shutter,
  interior,
  sign1,
  sign2,
}) => {
  const frame = useCurrentFrame();
  const door = { x: 290, y: 600, w: 500, h: 660 };
  const shutterH = door.h * (1 - shutter);
  return (
    <AbsoluteFill>
      {/* sky */}
      <AbsoluteFill style={{ background: "linear-gradient(#8ACFF5, #DDF2FC 40%)" }} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {/* clouds */}
        {[0, 1, 2].map((i) => {
          const cx = ((i * 420 + frame * (0.6 + i * 0.2)) % 1400) - 160;
          return (
            <g key={i} fill="#fff" opacity={0.9}>
              <ellipse cx={cx} cy={110 + i * 50} rx={90} ry={34} />
              <ellipse cx={cx + 60} cy={95 + i * 50} rx={60} ry={40} />
            </g>
          );
        })}
        {/* neighbour buildings */}
        <rect x={-40} y={300} width={160} height={1060} fill="#C9B79C" stroke="#141414" strokeWidth={8} />
        <rect x={960} y={260} width={160} height={1100} fill="#B8C4CF" stroke="#141414" strokeWidth={8} />
        {/* main facade */}
        <rect x={100} y={200} width={880} height={1150} fill="#F2E6D2" stroke="#141414" strokeWidth={10} />
        {[160, 340, 560, 760].map((x) => (
          <rect key={x} x={x} y={240} width={150} height={110} rx={8} fill="#9FD3F0" stroke="#141414" strokeWidth={7} />
        ))}
        {/* sign board */}
        <rect x={160} y={390} width={760} height={170} rx={18} fill="#14213D" stroke="#141414" strokeWidth={9} />
        {[200, 880].map((cx) => (
          <circle key={cx} cx={cx} cy={420} r={10} fill={frame % 20 < 10 ? "#FFD400" : "#FFF3B0"} />
        ))}
        {/* door frame + steps */}
        <rect x={door.x - 18} y={door.y - 18} width={door.w + 36} height={door.h + 18} fill="#3A3A3A" stroke="#141414" strokeWidth={8} />
        <rect x={250} y={1262} width={580} height={42} fill="#D8D2C8" stroke="#141414" strokeWidth={6} />
        <rect x={215} y={1302} width={650} height={46} fill="#CFC8BC" stroke="#141414" strokeWidth={6} />
        {/* plants */}
        {[180, 900].map((cx) => (
          <g key={cx}>
            <rect x={cx - 45} y={1180} width={90} height={110} rx={10} fill="#C0583B" stroke="#141414" strokeWidth={6} />
            <circle cx={cx} cy={1150} r={70} fill="#4CAF50" stroke="#141414" strokeWidth={6} />
            <circle cx={cx - 40} cy={1110} r={45} fill="#66BB6A" stroke="#141414" strokeWidth={6} />
          </g>
        ))}
        {/* pavement */}
        <rect x={-10} y={1345} width={1100} height={600} fill="#C9C9C9" />
        {new Array(12).fill(0).map((_, i) => (
          <line key={i} x1={i * 100 - 60} y1={1345} x2={i * 140 - 300} y2={1920} stroke="#B0B0B0" strokeWidth={4} />
        ))}
      </svg>
      {/* sign text */}
      <div style={{ position: "absolute", top: 400, left: 160, width: 760, textAlign: "center" }}>
        <div style={{ fontFamily: titleFont, fontSize: 92, color: "#fff", letterSpacing: 4, lineHeight: 1.1 }}>{sign1}</div>
        <div style={{ fontFamily: captionFont, fontWeight: 800, fontSize: 40, color: "#FFD400", letterSpacing: 6 }}>{sign2}</div>
      </div>
      {/* doorway: real interior frame + shutter */}
      <div style={{ position: "absolute", left: door.x, top: door.y, width: door.w, height: door.h, overflow: "hidden", background: "#222" }}>
        {interior && (
          <Img src={staticFile(interior)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: `brightness(${0.6 + 0.6 * shutter})` }} />
        )}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: shutterH,
            background: "repeating-linear-gradient(#9EA4A8 0 22px, #7C8287 22px 28px)",
            borderBottom: "14px solid #4A4F53",
          }}
        />
      </div>
      {/* light spill when open */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 420px 520px at 540px 980px, rgba(255,240,180,.55), rgba(255,240,180,0) 70%)",
          opacity: shutter,
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
};

const SHIRTS = ["#E53935", "#1E88E5", "#43A047", "#FB8C00", "#8E24AA", "#00897B", "#F4511E", "#3949AB", "#FDD835", "#6D4C41", "#D81B60"];
const HAIRS = ["#1A120C", "#2B1B10", "#3B2416", "#111", "#4A2C1A"];

/** Crowd seen from behind, facing the shop. `excite` 0..1 (bouncing), `cheer` arms up. */
export const CrowdBack: React.FC<{ excite: number; cheer: boolean; seed?: string }> = ({ excite, cheer, seed = "crowd" }) => {
  const frame = useCurrentFrame();
  const rows = [
    { n: 6, y: 1600, s: 0.72, x0: 90, x1: 990 },
    { n: 5, y: 1930, s: 1.0, x0: 120, x1: 960 },
  ];
  let k = 0;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {rows.map((row, ri) =>
        new Array(row.n).fill(0).map((_, i) => {
          const id = k++;
          const r = (s: string) => random(`${seed}-${id}-${s}`);
          const x = row.x0 + ((row.x1 - row.x0) * i) / (row.n - 1) + (r("x") - 0.5) * 50;
          const phase = r("p") * 6;
          const bob = -Math.abs(Math.sin(frame / 4.2 + phase)) * 70 * excite + Math.sin(frame / 11 + phase) * 6;
          const shirt = SHIRTS[Math.floor(r("c") * SHIRTS.length)];
          const hair = HAIRS[Math.floor(r("h") * HAIRS.length)];
          const longHair = r("l") > 0.6;
          const wave = Math.sin(frame / 3 + phase) * 14;
          const armUp = cheer && r("a") > 0.15;
          return (
            <g key={`${ri}-${i}`} transform={`translate(${x} ${row.y + bob}) scale(${row.s})`}>
              {armUp && (
                <>
                  <g transform={`rotate(${145 + wave} -120 -270)`}>
                    <rect x={-160} y={-280} width={70} height={250} rx={34} fill={shirt} stroke="#141414" strokeWidth={8} />
                    <circle cx={-125} cy={-25} r={36} fill="#D9A27A" stroke="#141414" strokeWidth={7} />
                  </g>
                  <g transform={`rotate(${-145 - wave} 120 -270)`}>
                    <rect x={90} y={-280} width={70} height={250} rx={34} fill={shirt} stroke="#141414" strokeWidth={8} />
                    <circle cx={125} cy={-25} r={36} fill="#D9A27A" stroke="#141414" strokeWidth={7} />
                  </g>
                </>
              )}
              {/* torso from behind */}
              <path d="M-175 40 L-165 -220 Q-155 -300 -60 -310 L60 -310 Q155 -300 165 -220 L175 40 Z" fill={shirt} stroke="#141414" strokeWidth={9} />
              <rect x={-35} y={-360} width={70} height={70} fill="#D9A27A" stroke="#141414" strokeWidth={8} />
              {/* head from behind: ears + hair */}
              <ellipse cx={-88} cy={-430} rx={22} ry={34} fill="#D9A27A" stroke="#141414" strokeWidth={7} />
              <ellipse cx={88} cy={-430} rx={22} ry={34} fill="#D9A27A" stroke="#141414" strokeWidth={7} />
              {longHair ? (
                <path d="M-92 -440 Q-100 -540 0 -545 Q100 -540 92 -440 L105 -260 Q0 -235 -105 -260 Z" fill={hair} stroke="#141414" strokeWidth={8} />
              ) : (
                <circle cx={0} cy={-445} r={92} fill={hair} stroke="#141414" strokeWidth={8} />
              )}
            </g>
          );
        }),
      )}
    </svg>
  );
};

/** Comic speech bubble that pops in. `localFrame` = frames since it appeared. */
export const Bubble: React.FC<{ text: string; x: number; y: number; localFrame: number; tail?: "left" | "right"; color?: string }> = ({
  text,
  x,
  y,
  localFrame,
  tail = "left",
  color = "#fff",
}) => {
  const { fps } = useVideoConfig();
  const s = spring({ frame: localFrame, fps, config: { damping: 10, stiffness: 220 } });
  const wobble = Math.sin(localFrame / 4) * 2;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -100%) scale(${s}) rotate(${wobble}deg)`,
        transformOrigin: tail === "left" ? "20% 100%" : "80% 100%",
      }}
    >
      <div
        style={{
          position: "relative",
          background: color,
          border: "7px solid #141414",
          borderRadius: 36,
          padding: "16px 30px",
          fontFamily: captionFont,
          fontWeight: 800,
          fontSize: 46,
          color: "#141414",
          whiteSpace: "nowrap",
          boxShadow: "0 10px 0 rgba(0,0,0,.18)",
        }}
      >
        {text}
        <svg width={60} height={50} style={{ position: "absolute", bottom: -44, [tail === "left" ? "left" : "right"]: 40 }}>
          <path d={tail === "left" ? "M4 0 L20 44 L44 0" : "M56 0 L40 44 L16 0"} fill={color} stroke="#141414" strokeWidth={7} />
          <rect x={0} y={-8} width={60} height={12} fill={color} />
        </svg>
      </div>
    </div>
  );
};

/** Warm studio backdrop for the "tour" scene. */
export const TourBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg,#FFF3DC,#FFD9A8)" }}>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {new Array(14).fill(0).map((_, i) => (
          <circle
            key={i}
            cx={(i * 211) % 1080}
            cy={((i * 389 + frame * (0.4 + (i % 3) * 0.2)) % 2100) - 90}
            r={20 + (i % 4) * 14}
            fill="#fff"
            opacity={0.35}
          />
        ))}
        {/* floor */}
        <rect x={0} y={1640} width={1080} height={300} fill="#E8B887" />
        <rect x={0} y={1640} width={1080} height={10} fill="#C98F5A" />
      </svg>
    </AbsoluteFill>
  );
};

/** Street behind a food cart: buildings, road, a lamp post. */
export const CartBackdrop: React.FC<{ dark?: number }> = ({ dark = 0 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(#8ACFF5, #DDF2FC 45%)" }} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {[0, 1].map((i) => {
          const cx = ((i * 600 + frame * 0.5) % 1400) - 160;
          return (
            <g key={i} fill="#fff" opacity={0.9}>
              <ellipse cx={cx} cy={150 + i * 60} rx={100} ry={36} />
              <ellipse cx={cx + 60} cy={130 + i * 60} rx={60} ry={42} />
            </g>
          );
        })}
        {[
          [0, 420, 260, "#E8C9A0"],
          [250, 330, 300, "#B9D3E8"],
          [540, 470, 240, "#F2B8A0"],
          [770, 360, 320, "#CFE3C1"],
        ].map(([x, y, w, c], i) => (
          <g key={i}>
            <rect x={x as number} y={y as number} width={w as number} height={1000} fill={c as string} stroke="#141414" strokeWidth={8} />
            {[0, 1, 2].map((r) =>
              [0, 1].map((col) => (
                <rect
                  key={`${r}${col}`}
                  x={(x as number) + 40 + col * ((w as number) / 2)}
                  y={(y as number) + 50 + r * 170}
                  width={(w as number) / 2 - 80}
                  height={100}
                  rx={8}
                  fill="#9FD3F0"
                  stroke="#141414"
                  strokeWidth={6}
                />
              )),
            )}
          </g>
        ))}
        <rect x={-10} y={1180} width={1100} height={760} fill="#BDBDBD" />
        <rect x={-10} y={1180} width={1100} height={26} fill="#9E9E9E" />
        <rect x={930} y={560} width={22} height={640} fill="#455A64" stroke="#141414" strokeWidth={5} />
        <rect x={895} y={540} width={92} height={40} rx={14} fill="#FFEB3B" stroke="#141414" strokeWidth={6} />
      </svg>
      {dark > 0 && <AbsoluteFill style={{ background: "#1A237E", opacity: 0.32 * dark }} />}
    </AbsoluteFill>
  );
};

/** Front of the food cart (drawn OVER the chef so he stands behind it). */
export const CartFront: React.FC<{ label?: string }> = ({ label = "BURGERS" }) => {
  const frame = useCurrentFrame();
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
      {/* umbrella */}
      {/* pole at the cart's side so it never crosses the chef's face */}
      <rect x={282} y={700} width={18} height={500} fill="#5D4037" stroke="#141414" strokeWidth={4} />
      <path d="M210 760 Q540 520 870 760 Z" fill="#FFCA28" stroke="#141414" strokeWidth={9} />
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M${210 + i * 132} 760 Q${276 + i * 132} 640 ${342 + i * 132} 760 Z`} fill={i % 2 ? "#E53935" : "#FFCA28"} stroke="#141414" strokeWidth={5} />
      ))}
      {/* steam from the grill */}
      {[0, 1, 2].map((i) => {
        const y = 1170 - ((frame * 2 + i * 40) % 120);
        return <circle key={i} cx={470 + i * 40 + Math.sin((frame + i * 20) / 8) * 10} cy={y} r={16} fill="#fff" opacity={0.5 * (1 - (1170 - y) / 120)} />;
      })}
      {/* counter + body */}
      <rect x={250} y={1180} width={580} height={40} rx={8} fill="#8D6E63" stroke="#141414" strokeWidth={8} />
      <rect x={270} y={1215} width={540} height={300} rx={20} fill="#FB8C00" stroke="#141414" strokeWidth={9} />
      <rect x={320} y={1255} width={440} height={120} rx={14} fill="#FFF3E0" stroke="#141414" strokeWidth={7} />
      <text x={540} y={1340} textAnchor="middle" fontFamily="Anton, sans-serif" fontSize={84} fill="#E53935">
        {label}
      </text>
      {/* burger icon */}
      <g transform="translate(540 1440)">
        <path d="M-70 0 Q0 -70 70 0 Z" fill="#F4A460" stroke="#141414" strokeWidth={6} />
        <rect x={-74} y={0} width={148} height={14} fill="#4CAF50" stroke="#141414" strokeWidth={4} />
        <rect x={-72} y={14} width={144} height={20} rx={8} fill="#6D4C41" stroke="#141414" strokeWidth={5} />
        <rect x={-70} y={34} width={140} height={20} rx={10} fill="#F4A460" stroke="#141414" strokeWidth={5} />
      </g>
      {/* wheels */}
      {[350, 730].map((cx) => (
        <g key={cx} transform={`rotate(${0} ${cx} 1540)`}>
          <circle cx={cx} cy={1540} r={52} fill="#424242" stroke="#141414" strokeWidth={8} />
          <circle cx={cx} cy={1540} r={16} fill="#BDBDBD" />
        </g>
      ))}
    </svg>
  );
};

/** Falling rain streaks. `amount` 0..1 */
export const Rain: React.FC<{ amount: number }> = ({ amount }) => {
  const frame = useCurrentFrame();
  if (amount <= 0) return null;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
      {new Array(Math.round(140 * amount)).fill(0).map((_, i) => {
        const x = (random(`rx${i}`) * 1200 + frame * 6) % 1200 - 60;
        const y = (random(`ry${i}`) * 2000 + frame * (55 + random(`rv${i}`) * 25)) % 2000 - 60;
        return <line key={i} x1={x} y1={y} x2={x - 10} y2={y + 46} stroke="#E3F2FD" strokeWidth={4} opacity={0.75} strokeLinecap="round" />;
      })}
    </svg>
  );
};

/** Magic "poof" smoke burst for a character's entrance. */
export const Poof: React.FC<{ x: number; y: number; localFrame: number }> = ({ x, y, localFrame }) => {
  if (localFrame < 0 || localFrame > 26) return null;
  const p = localFrame / 26;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
      {new Array(10).fill(0).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const d = 40 + p * 190;
        return (
          <circle
            key={i}
            cx={x + Math.cos(a) * d}
            cy={y + Math.sin(a) * d * 0.8}
            r={70 * (1 - p * 0.6)}
            fill="#FFFFFF"
            stroke="#141414"
            strokeWidth={6}
            opacity={1 - p}
          />
        );
      })}
      {new Array(8).fill(0).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        const d = 80 + p * 320;
        const sx = x + Math.cos(a) * d;
        const sy = y + Math.sin(a) * d;
        return (
          <path
            key={`s${i}`}
            d={`M${sx} ${sy - 26} L${sx + 8} ${sy - 8} L${sx + 26} ${sy} L${sx + 8} ${sy + 8} L${sx} ${sy + 26} L${sx - 8} ${sy + 8} L${sx - 26} ${sy} L${sx - 8} ${sy - 8} Z`}
            fill="#FFD400"
            stroke="#141414"
            strokeWidth={4}
            opacity={1 - p}
          />
        );
      })}
    </svg>
  );
};

/** Cramped family living room: window, photo frames, wobbly fan, red-blinking WiFi router, sofa. */
export const HomeBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const fanA = (frame * 25) % 360;
  return (
    <AbsoluteFill style={{ background: "#F6E7D6" }}>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {/* wallpaper stripes */}
        {new Array(14).fill(0).map((_, i) => (
          <rect key={i} x={i * 80} y={0} width={36} height={1400} fill="#EFDCC6" />
        ))}
        {/* window + curtains */}
        <rect x={90} y={300} width={330} height={380} rx={12} fill="#9FD3F0" stroke="#141414" strokeWidth={9} />
        <line x1={255} y1={300} x2={255} y2={680} stroke="#141414" strokeWidth={7} />
        <path d="M60 280 Q120 480 80 700 L150 700 Q190 480 140 280 Z" fill="#E57373" stroke="#141414" strokeWidth={6} />
        <path d="M450 280 Q390 480 430 700 L360 700 Q320 480 370 280 Z" fill="#E57373" stroke="#141414" strokeWidth={6} />
        {/* photo frames */}
        <rect x={560} y={330} width={170} height={130} rx={8} fill="#FFF8E1" stroke="#6D4C41" strokeWidth={12} />
        <circle cx={645} cy={385} r={30} fill="#FFCC80" />
        <rect x={780} y={300} width={200} height={240} rx={8} fill="#FFF8E1" stroke="#6D4C41" strokeWidth={12} />
        <path d="M800 520 L860 420 L900 480 L930 440 L960 520 Z" fill="#81C784" />
        {/* shelf with WiFi router (blinking red = internet down) */}
        <rect x={560} y={640} width={420} height={22} fill="#8D6E63" stroke="#141414" strokeWidth={5} />
        <rect x={830} y={590} width={110} height={50} rx={10} fill="#ECEFF1" stroke="#141414" strokeWidth={5} />
        <line x1={850} y1={590} x2={840} y2={545} stroke="#141414" strokeWidth={6} />
        <line x1={920} y1={590} x2={930} y2={545} stroke="#141414" strokeWidth={6} />
        <circle cx={885} cy={615} r={9} fill={frame % 16 < 8 ? "#F44336" : "#5D1C17"} />
        {/* ceiling fan */}
        <rect x={535} y={0} width={10} height={140} fill="#5D4037" />
        <g transform={`translate(540 150) rotate(${fanA}) `}>
          {[0, 120, 240].map((a) => (
            <rect key={a} x={-18} y={-8} width={230} height={34} rx={14} fill="#A1887F" stroke="#141414" strokeWidth={5} transform={`rotate(${a})`} />
          ))}
        </g>
        <circle cx={540} cy={150} r={30} fill="#6D4C41" stroke="#141414" strokeWidth={6} />
        {/* floor */}
        <rect x={0} y={1400} width={1080} height={520} fill="#C8A27C" />
        {new Array(8).fill(0).map((_, i) => (
          <line key={i} x1={i * 150} y1={1400} x2={i * 150 - 120} y2={1920} stroke="#B08560" strokeWidth={5} />
        ))}
        {/* sofa back + seat + arms */}
        <rect x={80} y={1000} width={920} height={300} rx={60} fill="#5C6BC0" stroke="#141414" strokeWidth={10} />
        <rect x={60} y={1260} width={960} height={140} rx={40} fill="#3F51B5" stroke="#141414" strokeWidth={10} />
        <rect x={20} y={1100} width={110} height={310} rx={40} fill="#3949AB" stroke="#141414" strokeWidth={10} />
        <rect x={950} y={1100} width={110} height={310} rx={40} fill="#3949AB" stroke="#141414" strokeWidth={10} />
      </svg>
    </AbsoluteFill>
  );
};

/** Startup team crammed on/around the sofa with laptops; `excite` = typing frenzy, `cheer` = arms up. */
export const TeamCrowd: React.FC<{ excite: number; cheer: boolean }> = ({ excite, cheer }) => {
  const frame = useCurrentFrame();
  const people = [
    // sofa row
    ...[180, 330, 480, 630, 780, 920].map((x, i) => ({ x, y: 1290, s: 0.62, id: i })),
    // floor row
    ...[110, 300, 520, 740, 960].map((x, i) => ({ x, y: 1530, s: 0.72, id: i + 6 })),
  ];
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {people.map((p) => {
        const r = (k: string) => random(`team-${p.id}-${k}`);
        const shirt = SHIRTS[Math.floor(r("c") * SHIRTS.length)];
        const hair = HAIRS[Math.floor(r("h") * HAIRS.length)];
        const phase = r("p") * 6;
        const bob = Math.sin(frame / (3 + r("v") * 3) + phase) * 6 * excite - (cheer ? Math.abs(Math.sin(frame / 4.5 + phase)) * 40 : 0);
        const type = Math.sin(frame / 1.6 + phase) * 8 * excite;
        const longHair = r("l") > 0.6;
        const wave = Math.sin(frame / 3 + phase) * 14;
        return (
          <g key={p.id} transform={`translate(${p.x} ${p.y + bob}) scale(${p.s})`}>
            {cheer && (
              <>
                <g transform={`rotate(${145 + wave} -110 -230)`}>
                  <rect x={-145} y={-240} width={66} height={220} rx={32} fill={shirt} stroke="#141414" strokeWidth={8} />
                  <circle cx={-112} cy={-15} r={32} fill="#D9A27A" stroke="#141414" strokeWidth={7} />
                </g>
                <g transform={`rotate(${-145 - wave} 110 -230)`}>
                  <rect x={79} y={-240} width={66} height={220} rx={32} fill={shirt} stroke="#141414" strokeWidth={8} />
                  <circle cx={112} cy={-15} r={32} fill="#D9A27A" stroke="#141414" strokeWidth={7} />
                </g>
              </>
            )}
            {longHair && <path d="M-80 -400 Q-90 -500 0 -505 Q90 -500 80 -400 L92 -250 Q0 -230 -92 -250 Z" fill={hair} stroke="#141414" strokeWidth={7} />}
            {/* torso */}
            <path d="M-150 40 L-140 -200 Q-130 -270 -50 -280 L50 -280 Q130 -270 140 -200 L150 40 Z" fill={shirt} stroke="#141414" strokeWidth={8} />
            {/* head (front) */}
            <circle cx={0} cy={-390} r={86} fill="#D9A27A" stroke="#141414" strokeWidth={8} />
            {!longHair && <path d="M-86 -400 Q-90 -485 0 -488 Q90 -485 86 -400 Q50 -450 0 -448 Q-50 -450 -86 -400 Z" fill={hair} stroke="#141414" strokeWidth={6} />}
            {longHair && <path d="M-84 -380 Q-80 -480 0 -482 Q80 -480 84 -380 Q40 -440 -10 -430 Q-50 -440 -84 -380 Z" fill={hair} />}
            <ellipse cx={-30} cy={-395} rx={9} ry={cheer ? 4 : 11} fill="#141414" />
            <ellipse cx={30} cy={-395} rx={9} ry={cheer ? 4 : 11} fill="#141414" />
            {cheer ? (
              <path d="M-30 -350 Q0 -315 30 -350 Z" fill="#5A1A14" stroke="#141414" strokeWidth={5} />
            ) : (
              <path d="M-26 -342 Q0 -352 26 -342" fill="none" stroke="#141414" strokeWidth={7} strokeLinecap="round" />
            )}
            {/* laptop (lid back facing us) + typing hands */}
            {!cheer && (
              <g transform={`translate(0 ${type * 0.3})`}>
                <circle cx={-75} cy={-95 + type} r={28} fill="#D9A27A" stroke="#141414" strokeWidth={6} />
                <circle cx={75} cy={-95 - type} r={28} fill="#D9A27A" stroke="#141414" strokeWidth={6} />
                <rect x={-120} y={-250} width={240} height={160} rx={12} fill="#90A4AE" stroke="#141414" strokeWidth={8} />
                <circle cx={0} cy={-170} r={18} fill="#ECEFF1" opacity={0.8} />
                <rect x={-140} y={-90} width={280} height={24} rx={8} fill="#78909C" stroke="#141414" strokeWidth={6} />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};

/** Railway-station street: yellow station board, passing train, building with an upper-floor shop. */
export const StationBackdrop: React.FC<{ board: string; boardLocal?: string; banner?: string }> = ({ board, boardLocal, banner = "OPEN" }) => {
  const frame = useCurrentFrame();
  // a train crosses every ~6 s
  const trainX = ((frame * 22) % 4200) - 2600;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(#8ACFF5, #E3F4FC 45%)" }} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {[0, 1].map((i) => {
          const cx = ((i * 640 + frame * 0.5) % 1400) - 160;
          return (
            <g key={i} fill="#fff" opacity={0.9}>
              <ellipse cx={cx} cy={140 + i * 70} rx={100} ry={36} />
              <ellipse cx={cx + 60} cy={120 + i * 70} rx={60} ry={42} />
            </g>
          );
        })}
        {/* far city */}
        {[[0, 520, 180], [170, 470, 140], [300, 560, 160], [900, 480, 200]].map(([x, y, w], i) => (
          <rect key={i} x={x} y={y} width={w} height={500} fill="#B0BEC5" stroke="#141414" strokeWidth={5} />
        ))}
        {/* railway line + train */}
        <rect x={0} y={1000} width={1080} height={22} fill="#6D4C41" />
        <g transform={`translate(${trainX} 0)`}>
          {new Array(5).fill(0).map((_, i) => (
            <g key={i} transform={`translate(${i * 520} 0)`}>
              <rect x={0} y={820} width={500} height={180} rx={i === 0 ? 60 : 16} fill={i === 0 ? "#E65100" : "#1565C0"} stroke="#141414" strokeWidth={8} />
              <rect x={0} y={930} width={500} height={22} fill="#FFD54F" />
              {[40, 160, 280, 400].map((wx) => (
                <rect key={wx} x={wx} y={850} width={70} height={60} rx={8} fill="#B3E5FC" stroke="#141414" strokeWidth={5} />
              ))}
              <circle cx={90} cy={1002} r={22} fill="#333" />
              <circle cx={410} cy={1002} r={22} fill="#333" />
            </g>
          ))}
        </g>
        {/* platform */}
        <rect x={0} y={1022} width={1080} height={70} fill="#9E9E9E" stroke="#141414" strokeWidth={6} />
        {/* station board on two posts */}
        <rect x={110} y={700} width={14} height={330} fill="#424242" />
        <rect x={436} y={700} width={14} height={330} fill="#424242" />
        <rect x={70} y={600} width={420} height={170} rx={10} fill="#FFD600" stroke="#141414" strokeWidth={9} />
        {/* shop building on the right */}
        <rect x={600} y={380} width={460} height={1000} fill="#ECE0CC" stroke="#141414" strokeWidth={9} />
        <rect x={640} y={430} width={380} height={300} rx={10} fill="#90CAF9" stroke="#141414" strokeWidth={8} />
        <rect x={620} y={740} width={420} height={18} fill="#B0B0B0" />
        <rect x={660} y={900} width={340} height={330} fill="#8D9499" stroke="#141414" strokeWidth={7} />
        {new Array(10).fill(0).map((_, i) => (
          <line key={i} x1={662} y1={920 + i * 30} x2={998} y2={920 + i * 30} stroke="#6E757A" strokeWidth={5} />
        ))}
        {/* footpath */}
        <rect x={-10} y={1380} width={1100} height={560} fill="#C9C9C9" />
        <rect x={-10} y={1380} width={1100} height={24} fill="#A8A8A8" />
      </svg>
      <div style={{ position: "absolute", left: 70, top: 612, width: 420, textAlign: "center", lineHeight: 1.05 }}>
        {boardLocal && <div style={{ fontFamily: captionFont, fontWeight: 800, fontSize: 46, color: "#141414" }}>{boardLocal}</div>}
        <div style={{ fontFamily: titleFont, fontSize: 78, color: "#141414", letterSpacing: 3 }}>{board}</div>
      </div>
      {/* upper-floor banner, bouncing */}
      <div
        style={{
          position: "absolute",
          left: 660,
          top: 520 + Math.sin(frame / 8) * 6,
          width: 340,
          textAlign: "center",
          background: "#E53935",
          color: "#fff",
          border: "6px solid #141414",
          borderRadius: 16,
          fontFamily: titleFont,
          fontSize: 60,
          padding: "8px 0",
          transform: `rotate(${Math.sin(frame / 12) * 2}deg)`,
        }}
      >
        {banner}
      </div>
    </AbsoluteFill>
  );
};

/** Game-show stage: dark studio, LED wall, sweeping spotlights, glowing floor. */
export const StudioBackdrop: React.FC<{ sign?: string; sub?: string; dim?: number }> = ({ sign, sub, dim = 0 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #3B1B6E, #12082A 75%)" }}>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {/* LED wall tiles */}
        {new Array(6).fill(0).map((_, r) =>
          new Array(6).fill(0).map((__, c) => (
            <rect
              key={`${r}${c}`}
              x={60 + c * 165}
              y={160 + r * 150}
              width={150}
              height={135}
              rx={10}
              fill="#5B2DA8"
              opacity={0.18 + 0.14 * Math.abs(Math.sin(frame / 14 + r * 0.8 + c * 0.5))}
            />
          )),
        )}
        {/* stage floor */}
        <ellipse cx={540} cy={1560} rx={620} ry={210} fill="#1E0F45" stroke="#FFC107" strokeWidth={10} />
        <ellipse cx={540} cy={1560} rx={520} ry={160} fill="none" stroke="#7C4DFF" strokeWidth={8} opacity={0.6 + 0.4 * Math.sin(frame / 6)} />
      </svg>
      {/* spotlights */}
      {[0, 1, 2].map((i) => {
        const ang = Math.sin(frame / (28 + i * 7) + i * 2) * 22 + (i - 1) * 18;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 200 + i * 340 - 180,
              top: -60,
              width: 360,
              height: 1700,
              transformOrigin: "50% 0%",
              transform: `rotate(${ang}deg)`,
              background: "linear-gradient(rgba(255,255,220,.38), rgba(255,255,220,0) 85%)",
              clipPath: "polygon(42% 0, 58% 0, 100% 100%, 0 100%)",
              mixBlendMode: "screen",
            }}
          />
        );
      })}
      {sign && (
        <div style={{ position: "absolute", top: 250, left: 90, width: 900, textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              padding: "18px 40px 22px",
              borderRadius: 30,
              border: "8px solid #FFC107",
              background: "linear-gradient(#2A0F5C,#160733)",
              boxShadow: `0 0 ${30 + 20 * Math.sin(frame / 5)}px rgba(255,193,7,.8)`,
            }}
          >
            <div style={{ fontFamily: titleFont, fontSize: 96, color: "#FFD54F", lineHeight: 1.0, letterSpacing: 2 }}>{sign}</div>
            {sub && <div style={{ fontFamily: captionFont, fontWeight: 800, fontSize: 40, color: "#fff", marginTop: 6 }}>{sub}</div>}
          </div>
        </div>
      )}
      {dim > 0 && <AbsoluteFill style={{ background: "#000", opacity: dim }} />}
    </AbsoluteFill>
  );
};

/** Host lectern / contestant desk front pieces (drawn over characters' legs). */
export const StageDesks: React.FC<{ hostX: number; guestX: number; y: number }> = ({ hostX, guestX, y }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
    {[hostX, guestX].map((x, i) => (
      <g key={i}>
        <path d={`M${x - 140} ${y} L${x + 140} ${y} L${x + 110} ${y + 260} L${x - 110} ${y + 260} Z`} fill={i ? "#0D47A1" : "#4A148C"} stroke="#FFC107" strokeWidth={9} />
        <rect x={x - 155} y={y - 26} width={310} height={34} rx={10} fill="#FFC107" stroke="#141414" strokeWidth={5} />
        <text x={x} y={y + 150} textAnchor="middle" fontFamily="Anton, sans-serif" fontSize={64} fill="#FFD54F">
          {i ? "PLAYER" : "HOST"}
        </text>
      </g>
    ))}
  </svg>
);

/** Falling confetti. */
export const Confetti: React.FC<{ localFrame: number }> = ({ localFrame }) => {
  const cols = ["#FFD400", "#FF4081", "#00E5FF", "#76FF03", "#FF9100", "#E040FB"];
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
      {new Array(110).fill(0).map((_, i) => {
        const r = (k: string) => random(`cf${i}${k}`);
        const x = r("x") * 1080 + Math.sin(localFrame / 9 + i) * 40;
        const y = -60 + (localFrame - r("d") * 25) * (14 + r("v") * 12);
        if (y < -60 || y > 1980) return null;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={18}
            height={30}
            rx={4}
            fill={cols[i % cols.length]}
            transform={`rotate(${localFrame * (6 + r("s") * 10) + i * 30} ${x + 9} ${y + 15})`}
          />
        );
      })}
    </svg>
  );
};

/** Quiz board: question bar + 4 options; locked = orange, revealed correct = green flash. */
export const QuizBoard: React.FC<{
  question: string;
  options: string[];
  answer: number;
  localFrame: number;
  lockFrame: number;
  revealFrame: number;
  top: number;
}> = ({ question, options, answer, localFrame, lockFrame, revealFrame, top }) => {
  const { fps } = useVideoConfig();
  const s = spring({ frame: localFrame, fps, config: { damping: 14 } });
  const L = ["A", "B", "C", "D"];
  return (
    <div style={{ position: "absolute", left: 40, top, width: 1000, transform: `translateY(${(1 - s) * 500}px)`, opacity: Math.min(1, s * 2) }}>
      <div
        style={{
          margin: "0 30px 22px",
          padding: "22px 30px",
          borderRadius: 999,
          background: "linear-gradient(#1A237E,#0D1240)",
          border: "6px solid #FFC107",
          color: "#fff",
          fontFamily: captionFont,
          fontWeight: 800,
          fontSize: 48,
          textAlign: "center",
          boxShadow: "0 12px 30px rgba(0,0,0,.5)",
        }}
      >
        {question}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {options.map((o, i) => {
          const appear = spring({ frame: localFrame - 8 - i * 5, fps, config: { damping: 12 } });
          const locked = i === answer && localFrame >= lockFrame;
          const correct = i === answer && localFrame >= revealFrame;
          const flash = correct ? (Math.floor((localFrame - revealFrame) / 4) % 2 === 0 ? 1 : 0.75) : 1;
          const bg = correct ? "#2E7D32" : locked ? "#EF6C00" : "#1A237E";
          return (
            <div
              key={i}
              style={{
                transform: `scale(${appear * (locked && !correct ? 1.04 : 1)})`,
                padding: "20px 26px",
                borderRadius: 999,
                background: bg,
                opacity: flash,
                border: "6px solid #FFC107",
                color: "#fff",
                fontFamily: captionFont,
                fontWeight: 800,
                fontSize: 50,
                display: "flex",
                gap: 16,
                alignItems: "center",
                boxShadow: correct ? "0 0 40px rgba(118,255,3,.8)" : "0 10px 24px rgba(0,0,0,.45)",
              }}
            >
              <span style={{ color: "#FFC107" }}>{L[i]}:</span>
              {o}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const useScene = (fromSec: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame - Math.round(fromSec * fps);
};

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export { interpolate };
