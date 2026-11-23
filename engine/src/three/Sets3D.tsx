// 3D sets for ToonReel skits: town, classroom, bedroom. All original low-poly blocks, no downloaded assets.
import React from "react";
import * as THREE from "three";
import { Block, rand, Toon, useTextTexture } from "./toon";

export type Set3DName = "town" | "classroom" | "bedroom";
export type Set3DOptions = { night?: boolean; sign?: string; signSub?: string; board?: string; poster?: string };

/** where a camera "dive" flies into, per set */
export const DIVE_TARGET: Record<Set3DName, [number, number, number]> = {
  town: [0, 2.2, -13.4],
  classroom: [0, 5, -9.8],
  bedroom: [4, 5.5, -7.8],
};

export const SKY: Record<Set3DName, { day: string; night: string }> = {
  town: { day: "#8ED1FF", night: "#141B3D" },
  classroom: { day: "#F3E7D3", night: "#2A2440" },
  bedroom: { day: "#FBE3EC", night: "#1F1A38" },
};

export const Lights: React.FC<{ night?: boolean; indoor?: boolean }> = ({ night, indoor }) => (
  <>
    <hemisphereLight args={[night ? "#6C7BD8" : "#FFFFFF", night ? "#1A1530" : "#9C8B6E", night ? 0.9 : 1.5]} />
    <directionalLight
      position={indoor ? [6, 18, 12] : [12, 22, 14]}
      intensity={night ? 0.9 : 2.4}
      color={night ? "#AFC0FF" : "#FFF4E0"}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-26}
      shadow-camera-right={26}
      shadow-camera-top={26}
      shadow-camera-bottom={-26}
      shadow-camera-near={1}
      shadow-camera-far={70}
      shadow-bias={-0.0004}
      shadow-normalBias={0.06}
    />
  </>
);

// ------------------------------------------------------------------ town
const HOUSE_COLORS = ["#FF8A65", "#FFD54F", "#81C784", "#64B5F6", "#BA68C8", "#F06292", "#4DB6AC", "#FFB74D"];

const House: React.FC<{ x: number; z: number; w: number; h: number; color: string; seed: number; night?: boolean; roof?: string }> = ({ x, z, w, h, color, seed, night, roof }) => {
  const winColor = night ? "#FFE08A" : "#BFE6FF";
  const cols = Math.max(1, Math.floor(w / 2.2));
  const rows = Math.max(1, Math.floor((h - 2.4) / 2.4));
  return (
    <group position={[x, 0, z]}>
      <Block size={[w, h, 5]} color={color} position={[0, h / 2, 0]} r={0.2} outline={0.07} />
      {/* roof */}
      <mesh position={[0, h + 1.2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[Math.max(w, 5) * 0.78, 2.4, 4]} />
        <Toon color={roof ?? (seed % 2 ? "#B5523B" : "#5D4037")} />
      </mesh>
      {/* door */}
      <Block size={[1.4, 2.4, 0.2]} color="#6D4C41" position={[(rand(seed) - 0.5) * (w - 2.5), 1.2, 2.55]} r={0.06} outline={0.04} />
      {/* windows */}
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((__, c) => {
          const wx = -w / 2 + (w / cols) * (c + 0.5);
          const lit = night ? rand(seed * 7 + r * 3 + c) > 0.35 : true;
          return (
            <Block
              key={`${r}-${c}`}
              size={[1.1, 1.2, 0.15]}
              color={lit ? winColor : "#3A3F5C"}
              emissive={night && lit ? "#C79A2E" : undefined}
              position={[wx, 3.6 + r * 2.4, 2.55]}
              r={0.05}
              outline={0.04}
              shadow={false}
            />
          );
        }),
      )}
    </group>
  );
};

const Tree: React.FC<{ x: number; z: number; s?: number; seed: number }> = ({ x, z, s = 1, seed }) => (
  <group position={[x, 0, z]} scale={s}>
    <Block size={[0.6, 2.4, 0.6]} color="#7B5134" position={[0, 1.2, 0]} r={0.1} />
    <mesh position={[0, 3.4, 0]} castShadow rotation={[0, rand(seed) * 3, 0]}>
      <icosahedronGeometry args={[1.7, 0]} />
      <Toon color={rand(seed + 1) > 0.5 ? "#4CAF50" : "#66BB6A"} />
    </mesh>
    <mesh position={[0.6, 4.4, 0.2]} castShadow>
      <icosahedronGeometry args={[1.1, 0]} />
      <Toon color="#43A047" />
    </mesh>
  </group>
);

const Lamp: React.FC<{ x: number; z: number; night?: boolean }> = ({ x, z, night }) => (
  <group position={[x, 0, z]}>
    <Block size={[0.25, 5, 0.25]} color="#37474F" position={[0, 2.5, 0]} r={0.08} outline={0.03} />
    <Block size={[0.8, 0.5, 0.8]} color={night ? "#FFF3B0" : "#ECEFF1"} emissive={night ? "#FFD54F" : undefined} position={[0, 5.2, 0]} r={0.12} outline={0.03} />
    {night && <pointLight position={[0, 4.8, 0]} intensity={30} distance={14} color="#FFD27A" />}
  </group>
);

const Cloud: React.FC<{ x: number; y: number; z: number; s: number }> = ({ x, y, z, s }) => (
  <group position={[x, y, z]} scale={s}>
    {[
      [0, 0, 0, 1.6],
      [1.6, -0.3, 0, 1.2],
      [-1.6, -0.3, 0, 1.2],
      [0.6, 0.7, 0, 1.1],
    ].map(([a, b, c, r], i) => (
      <mesh key={i} position={[a, b, c]}>
        <sphereGeometry args={[r, 14, 10]} />
        <meshToonMaterial color="#FFFFFF" />
      </mesh>
    ))}
  </group>
);

export const TownSet: React.FC<Set3DOptions & { t: number }> = ({ night, sign, signSub, t }) => {
  const signTex = useTextTexture(signSub ? [sign || "IN THIS TOWN", signSub] : [sign || "CORNER SHOP"], { w: 1024, h: 320, bg: "#FFD400", fg: "#141414" });
  const houses = [
    { x: -20, w: 8, h: 7 },
    { x: -11, w: 8, h: 10 },
    { x: 9.5, w: 7, h: 8 },
    { x: 18, w: 8, h: 11 },
    { x: 27, w: 8, h: 7 },
    { x: -29, w: 8, h: 9 },
  ];
  return (
    <group>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <Toon color={night ? "#2E5E3A" : "#7CCB5B"} />
      </mesh>
      {/* plaza + road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 1]} receiveShadow>
        <planeGeometry args={[80, 12]} />
        <Toon color={night ? "#6B6F80" : "#D9D4C7"} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -7.5]} receiveShadow>
        <planeGeometry args={[120, 5]} />
        <Toon color={night ? "#2B2D36" : "#555A64"} />
      </mesh>
      {Array.from({ length: 16 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-45 + i * 6, 0.03, -7.5]}>
          <planeGeometry args={[2.4, 0.3]} />
          <meshBasicMaterial color="#F5F5F5" />
        </mesh>
      ))}
      {/* the corner shop in the middle, with its sign */}
      <group position={[0, 0, -14]}>
        <Block size={[9, 8, 5]} color="#F5F0E6" position={[0, 4, 0]} r={0.2} outline={0.07} />
        <Block size={[9.6, 0.6, 3]} color="#D7263D" position={[0, 5.4, 2.6]} r={0.1} outline={0.05} />
        <mesh position={[0, 6.9, 2.56]}>
          <planeGeometry args={[7.6, 2.2]} />
          <meshBasicMaterial map={signTex} toneMapped={false} />
        </mesh>
        <Block size={[2.2, 3.6, 0.2]} color="#4E342E" position={[0, 1.8, 2.55]} r={0.06} outline={0.04} />
        {[-3, 3].map((x) => (
          <Block key={x} size={[2.2, 2.4, 0.2]} color={night ? "#FFE08A" : "#BFE6FF"} emissive={night ? "#C79A2E" : undefined} position={[x, 2.4, 2.55]} r={0.06} outline={0.04} shadow={false} />
        ))}
      </group>
      {houses.map((h, i) => (
        <House key={i} x={h.x} z={-14.5 - (i % 2) * 1.5} w={h.w} h={h.h} color={HOUSE_COLORS[i % HOUSE_COLORS.length]} seed={i + 1} night={night} />
      ))}
      {[-15.5, -6, 5.5, 14, 23].map((x, i) => (
        <Tree key={x} x={x} z={-10.6} seed={i * 5} s={0.9 + rand(i) * 0.3} />
      ))}
      {[-24, 24, -34, 34].map((x, i) => (
        <Tree key={`f${x}`} x={x} z={4 + i} seed={i * 9 + 2} s={1.2} />
      ))}
      {[-12, 12].map((x) => (
        <Lamp key={x} x={x} z={-4.6} night={night} />
      ))}
      {/* far hills */}
      {[-50, -15, 25, 60].map((x, i) => (
        <mesh key={`h${x}`} position={[x, -4, -60]} scale={[1.6, 0.6, 1]}>
          <sphereGeometry args={[18, 16, 10]} />
          <Toon color={night ? "#1F3B2D" : i % 2 ? "#5DAA48" : "#6BBF52"} />
        </mesh>
      ))}
      {night ? (
        <mesh position={[22, 30, -55]}>
          <circleGeometry args={[4, 32]} />
          <meshBasicMaterial color="#FFF7D1" />
        </mesh>
      ) : (
        <>
          <Cloud x={-18 + ((t * 0.6) % 60)} y={24} z={-45} s={1.6} />
          <Cloud x={14 + ((t * 0.4) % 40)} y={29} z={-50} s={2} />
          <Cloud x={-40 + ((t * 0.5) % 70)} y={20} z={-40} s={1.2} />
        </>
      )}
    </group>
  );
};

// ------------------------------------------------------------------ classroom
export const ClassroomSet: React.FC<Set3DOptions> = ({ night, board }) => {
  const boardTex = useTextTexture((board || "TODAY: BIG TEST").split("\n"), { w: 1024, h: 512, bg: "#22543D", fg: "#F5F5F5", font: "'Comic Sans MS', 'Bricolage Grotesque', sans-serif" });
  const wall = night ? "#4A4570" : "#F7D9A8";
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2]} receiveShadow>
        <planeGeometry args={[30, 26]} />
        <Toon color={night ? "#5D4A3A" : "#C98B53"} />
      </mesh>
      {/* floor boards */}
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-13 + i * 2, 0.01, 2]}>
          <planeGeometry args={[0.05, 26]} />
          <meshBasicMaterial color="#8D5A30" />
        </mesh>
      ))}
      <Block size={[30, 14, 0.6]} color={wall} position={[0, 7, -10.3]} r={0.1} outline={0} />
      <Block size={[0.6, 14, 26]} color={wall} position={[-15, 7, 2]} r={0.1} outline={0} />
      <Block size={[0.6, 14, 26]} color={wall} position={[15, 7, 2]} r={0.1} outline={0} />
      {/* chalkboard */}
      <Block size={[13, 6.4, 0.3]} color="#6D4C41" position={[0, 5.6, -9.9]} r={0.1} outline={0.05} />
      <mesh position={[0, 5.6, -9.72]}>
        <planeGeometry args={[12.2, 5.6]} />
        <meshBasicMaterial map={boardTex} toneMapped={false} />
      </mesh>
      {/* clock */}
      <mesh position={[9.5, 10, -9.95]}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[9.5, 10, -9.9]}>
        <ringGeometry args={[0.95, 1.12, 32]} />
        <meshBasicMaterial color="#141414" />
      </mesh>
      {/* windows on the left wall */}
      {[-5, 3].map((z) => (
        <Block key={z} size={[0.2, 4, 5]} color={night ? "#25305A" : "#BFE6FF"} position={[-14.6, 7, z]} r={0.05} outline={0.05} shadow={false} />
      ))}
      {/* teacher desk */}
      <Block size={[5, 2.4, 2.4]} color="#8D6E63" position={[-7.5, 1.2, -6.5]} r={0.12} />
      <Block size={[1.2, 0.9, 0.9]} color="#E53935" position={[-8.6, 2.85, -6.5]} r={0.35} />
      {/* student desks (two rows each side) */}
      {[-10, -5.5, 5.5, 10].map((x) =>
        [-2.5, 3].map((z) => (
          <group key={`${x}${z}`} position={[x, 0, z]}>
            <Block size={[3, 0.3, 2]} color="#FFCC80" position={[0, 2.2, 0]} r={0.08} />
            {[-1.2, 1.2].map((lx) => (
              <Block key={lx} size={[0.25, 2.1, 0.25]} color="#78909C" position={[lx, 1.05, 0]} r={0.06} outline={0.03} />
            ))}
          </group>
        )),
      )}
      {night && <pointLight position={[0, 12, 0]} intensity={60} distance={40} color="#FFE6B0" />}
    </group>
  );
};

// ------------------------------------------------------------------ bedroom
export const BedroomSet: React.FC<Set3DOptions> = ({ night, poster }) => {
  const posterTex = useTextTexture((poster || "DREAM BIG").split("\n"), { w: 512, h: 700, bg: "#7C4DFF", fg: "#FFD400", stroke: "#141414" });
  const wall = night ? "#3B3566" : "#B3E5FC";
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2]} receiveShadow>
        <planeGeometry args={[30, 24]} />
        <Toon color={night ? "#5B4636" : "#D7A86E"} />
      </mesh>
      <Block size={[30, 14, 0.6]} color={wall} position={[0, 7, -8.3]} r={0.1} outline={0} />
      <Block size={[0.6, 14, 24]} color={wall} position={[-15, 7, 2]} r={0.1} outline={0} />
      {/* rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 1.5]}>
        <circleGeometry args={[5, 40]} />
        <Toon color="#F48FB1" />
      </mesh>
      {/* window with sky */}
      <Block size={[6, 5, 0.3]} color="#FFFFFF" position={[4, 6, -8]} r={0.1} outline={0.05} />
      <mesh position={[4, 6, -7.83]}>
        <planeGeometry args={[5.2, 4.2]} />
        <meshBasicMaterial color={night ? "#141B3D" : "#8ED1FF"} />
      </mesh>
      {night && (
        <mesh position={[5.3, 7, -7.8]}>
          <circleGeometry args={[0.6, 24]} />
          <meshBasicMaterial color="#FFF7D1" />
        </mesh>
      )}
      <Block size={[0.15, 4.2, 0.1]} color="#FFFFFF" position={[4, 6, -7.78]} r={0.03} outline={0} />
      {/* poster */}
      <mesh position={[-6, 7, -7.95]}>
        <planeGeometry args={[3, 4.1]} />
        <meshBasicMaterial map={posterTex} toneMapped={false} />
      </mesh>
      {/* bed */}
      <group position={[-9.5, 0, -3]}>
        <Block size={[5.4, 1.4, 8]} color="#8D6E63" position={[0, 0.7, 0]} r={0.15} />
        <Block size={[5.2, 0.8, 7.6]} color="#FFFFFF" position={[0, 1.8, 0]} r={0.3} />
        <Block size={[5.3, 0.6, 5]} color="#5C6BC0" position={[0, 2.25, 1.3]} r={0.25} />
        <Block size={[3, 0.8, 1.6]} color="#FFF59D" position={[0, 2.5, -2.8]} r={0.35} />
        <Block size={[5.4, 3.6, 0.5]} color="#8D6E63" position={[0, 1.8, -4]} r={0.15} />
      </group>
      {/* desk + glowing monitor */}
      <group position={[9.5, 0, -5.5]}>
        <Block size={[5, 0.3, 2.6]} color="#FFFFFF" position={[0, 2.6, 0]} r={0.08} />
        {[-2.2, 2.2].map((x) => (
          <Block key={x} size={[0.3, 2.5, 2.2]} color="#ECEFF1" position={[x, 1.25, 0]} r={0.06} outline={0.03} />
        ))}
        <Block size={[3, 2, 0.25]} color="#263238" position={[0, 4, -0.5]} r={0.1} />
        <mesh position={[0, 4, -0.36]}>
          <planeGeometry args={[2.6, 1.6]} />
          <meshBasicMaterial color="#4FC3F7" />
        </mesh>
        {night && <pointLight position={[0, 4, 1.5]} intensity={18} distance={10} color="#4FC3F7" />}
      </group>
      {/* lamp */}
      <group position={[-5.5, 0, -6.5]}>
        <Block size={[0.3, 3, 0.3]} color="#424242" position={[0, 1.5, 0]} r={0.08} outline={0.03} />
        <mesh position={[0, 3.4, 0]}>
          <coneGeometry args={[0.9, 1, 16, 1, true]} />
          <meshToonMaterial color="#FFE082" emissive={night ? "#B8860B" : "#000000"} side={THREE.DoubleSide} />
        </mesh>
        {night && <pointLight position={[0, 3.2, 0.5]} intensity={35} distance={16} color="#FFD27A" />}
      </group>
    </group>
  );
};
