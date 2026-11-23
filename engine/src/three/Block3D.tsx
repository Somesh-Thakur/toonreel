// Original blocky "toy" 3D character: rounded blocks, ink outlines, big cartoon eyes.
// Lip-sync from the voice track's loudness (same method as the 2D character).
import { useAudioData, visualizeAudio } from "@remotion/media-utils";
import React from "react";
import * as THREE from "three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { CharacterLook, CharacterPose } from "../components/Character2D";
import { Block, FadeCtx, Toon } from "./toon";

export type Pose3D = CharacterPose & {
  /** walk cycle on (set automatically while moving); "run" = faster, bigger steps */
  walk?: boolean | "run";
  wave?: boolean;
  point?: boolean;
  dance?: boolean;
  shock?: boolean;
  sad?: boolean;
  angry?: boolean;
  sit?: boolean;
  /** lying flat on the ground (fainted / sleeping) */
  lie?: boolean;
  spin?: boolean;
  /** size multiplier (giant / tiny gags) */
  size?: number;
  /** 0..1 opacity (ghost / invisible gags) */
  ghost?: number;
  /** face shows closed eyes */
  sleep?: boolean;
};

export type Look3D = CharacterLook & { pants?: string; shoes?: string };

type Props = {
  audioSrc?: string;
  look?: Look3D;
  pose?: Pose3D;
  talkLevel?: number;
  gain?: number;
  position?: [number, number, number];
  /** heading in radians (0 = facing the camera, +z) */
  heading?: number;
  scale?: number;
  /** seconds of walk travelled (drives the leg phase so steps match the distance) */
  stride?: number;
  phase?: number;
};

export const Character3D: React.FC<Props> = (p) =>
  p.audioSrc ? <Talking3D {...p} audioSrc={p.audioSrc} /> : <Figure3D {...p} talk={p.talkLevel ?? 0} />;

const Talking3D: React.FC<Props & { audioSrc: string }> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audio = useAudioData(p.audioSrc);
  let loud = 0;
  if (audio) {
    const bins = visualizeAudio({ fps, frame, audioData: audio, numberOfSamples: 32, smoothing: true });
    loud = bins.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
  }
  return <Figure3D {...p} talk={Math.min(1, loud * (p.gain ?? 9))} />;
};

const SKIN = "#F2C29B";

const outfitOf = (look: Look3D) => {
  const style = look.style ?? "hoodie";
  const base =
    look.outfit ??
    ({ suit: "#2B3A55", uniform: "#5B6B3A", kurti: "#E0457B", chef: "#FFFFFF", hoodie: "#3D7BF2" } as const)[style];
  const pants = look.pants ?? look.outfitDark ?? (style === "chef" ? "#2B2B2B" : style === "kurti" ? "#F4E3C1" : style === "suit" ? "#1E2638" : "#2E3B55");
  return { style, base, pants, shoes: look.shoes ?? "#2A2A2A" };
};

const Figure3D: React.FC<Props & { talk: number }> = ({ look = {}, pose = {}, talk, position = [0, 0, 0], heading = 0, scale = 1, stride, phase = 0 }) => {
  const frame = useCurrentFrame() + (pose.phase ?? phase) * 37;
  const skin = look.skin ?? SKIN;
  const { style, base, pants, shoes } = outfitOf(look);
  const hair = look.hair ?? "#2B1A12";

  // ---------------- motion ----------------
  const breathe = Math.sin(frame / 14) * 0.03;
  const walking = !!pose.walk;
  const run = pose.walk === "run";
  const wPhase = (stride ?? frame / 30) * (run ? 15 : 9);
  const swing = walking ? Math.sin(wPhase) * (run ? 0.95 : 0.6) : 0;
  const bounce = walking ? Math.abs(Math.cos(wPhase)) * (run ? 0.28 : 0.12) : 0;
  const t = frame / 30;

  let legL = swing;
  let legR = -swing;
  let armL: [number, number] = [-swing * 0.8, 0.08]; // [rot x (forward), rot z (outward)]
  let armR: [number, number] = [swing * 0.8, -0.08];
  let bodyY = bounce + breathe;
  let bodyRotX = 0;
  let bodyRotZ = 0;
  let spinY = 0;
  let headTilt = talk * 0.07 * Math.sin(frame / 3.2);
  let headTurn = 0;

  // talking: little beat gestures on loud syllables
  if (!walking && talk > 0.15) {
    armR = [-0.35 - talk * 0.5 * (0.5 + 0.5 * Math.sin(frame / 4)), -0.25];
  }
  if (pose.jump) bodyY += Math.abs(Math.sin(t * 6)) * (pose.jump / 60);
  if (pose.cheer) {
    armL = [0, 2.7 + 0.25 * Math.sin(frame / 3)];
    armR = [0, -2.7 - 0.25 * Math.sin(frame / 3 + 1)];
    bodyY += Math.abs(Math.sin(t * 7)) * 0.35;
  }
  if (pose.wave) armR = [0, -2.5 - 0.35 * Math.sin(frame / 2.5)];
  if (pose.point) armR = [-1.45, -0.15];
  if (pose.armAngle !== undefined) armR = [0, -(Math.abs(pose.armAngle) * Math.PI) / 180];
  if (pose.leftArmAngle !== undefined) armL = [0, (Math.abs(pose.leftArmAngle) * Math.PI) / 180];
  if (pose.dance) {
    const b = Math.sin(t * 9);
    bodyRotZ = b * 0.14;
    bodyY += Math.abs(b) * 0.3;
    armL = [0, b > 0 ? 2.6 : 0.6];
    armR = [0, b > 0 ? -0.6 : -2.6];
    legL = b * 0.35;
    legR = -b * 0.35;
  }
  if (pose.shock) {
    armL = [-0.4, 2.2];
    armR = [-0.4, -2.2];
    bodyY += Math.max(0, Math.sin(t * 10)) * 0.08;
  }
  if (pose.sad) {
    headTilt = 0.35;
    armL = [0.05, 0.03];
    armR = [0.05, -0.03];
  }
  if (pose.angry) {
    armL = [-0.2, 0.55];
    armR = [-0.2, -0.55];
    bodyRotZ = Math.sin(frame * 1.3) * 0.02; // shaking
  }
  if (pose.spin) spinY = t * 9;
  let sitDrop = 0;
  if (pose.sit) {
    legL = -1.5;
    legR = -1.5;
    sitDrop = -1.05;
  }
  const size = pose.size ?? 1;
  const ghost = pose.ghost ?? 1;

  // ---------------- face ----------------
  const blink = pose.sleep || frame % 97 < 4;
  const eyeScale = pose.shock ? 1.35 : 1;
  const mouthOpen = Math.min(1, talk);
  const mouthH = 0.06 + mouthOpen * 0.42 + (pose.shock ? 0.3 : 0);
  const browY = pose.shock ? 0.16 : pose.sad ? -0.02 : 0.06;
  const browTilt = pose.angry ? 0.45 : pose.sad ? -0.35 : 0;

  const root: [number, number, number] = [position[0], position[1] + (pose.lie ? 0.55 : 0), position[2]];
  return (
    <FadeCtx.Provider value={ghost}>
      <group position={root} rotation={[pose.lie ? -Math.PI / 2 : 0, heading + spinY, 0]} scale={scale * size}>
        {/* soft contact shadow so feet never float */}
        {!pose.lie && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <circleGeometry args={[1.25, 24]} />
            <meshBasicMaterial color="#000" transparent opacity={0.18 * ghost} depthWrite={false} />
          </mesh>
        )}
        <group position={[0, bodyY + sitDrop, 0]} rotation={[bodyRotX, 0, bodyRotZ]}>
          {/* legs (pivot at the hip) */}
          {[
            [-0.47, legR],
            [0.47, legL],
          ].map(([x, rot], i) => (
            <group key={i} position={[x, 1.9, 0]} rotation={[rot, 0, 0]}>
              <Block size={[0.86, 1.62, 0.9]} color={pants} position={[0, -0.81, 0]} r={0.14} />
              <Block size={[0.92, 0.36, 1.12]} color={shoes} position={[0, -1.72, 0.1]} r={0.14} />
            </group>
          ))}

          {/* torso */}
          <Torso style={style} base={base} pants={pants} look={look} />

          {/* arms (pivot at the shoulder) */}
          {([
            [-1.33, armR],
            [1.33, armL],
          ] as [number, [number, number]][]).map(([x, [rx, rz]], i) => (
            <group key={i} position={[x, 3.68, 0]} rotation={[rx, 0, rz]}>
              <Block size={[0.74, 1.45, 0.8]} color={base} position={[0, -0.66, 0]} r={0.16} />
              <Block size={[0.7, 0.46, 0.74]} color={skin} position={[0, -1.56, 0]} r={0.2} />
            </group>
          ))}

          {/* head */}
          <group position={[0, 3.95, 0]} rotation={[headTilt, headTurn, 0]}>
            <Block size={[1.78, 1.6, 1.56]} color={skin} position={[0, 0.82, 0]} r={0.4} outline={0.05} />
            {/* eyes */}
            {[-0.38, 0.38].map((x) => (
              <group key={x} position={[x, 0.98, 0.79]} scale={[eyeScale, blink ? 0.12 : eyeScale, 1]}>
                <mesh>
                  <circleGeometry args={[0.25, 28]} />
                  <meshBasicMaterial color="#FFFFFF" transparent={ghost < 1} opacity={ghost} />
                </mesh>
                <mesh position={[x > 0 ? -0.03 : 0.03, -0.02, 0.01]}>
                  <circleGeometry args={[0.13, 24]} />
                  <meshBasicMaterial color={look.eyes ?? "#1B1B1B"} transparent={ghost < 1} opacity={ghost} />
                </mesh>
                <mesh position={[x > 0 ? 0.02 : 0.08, 0.05, 0.02]}>
                  <circleGeometry args={[0.045, 12]} />
                  <meshBasicMaterial color="#FFFFFF" transparent={ghost < 1} opacity={ghost} />
                </mesh>
              </group>
            ))}
            {/* eyebrows */}
            {[-0.38, 0.38].map((x) => (
              <mesh key={`b${x}`} position={[x, 1.33 + browY, 0.8]} rotation={[0, 0, x > 0 ? browTilt : -browTilt]}>
                <planeGeometry args={[0.42, 0.09]} />
                <meshBasicMaterial color={hair === "#FFFFFF" ? "#777" : "#1B1B1B"} transparent={ghost < 1} opacity={ghost} />
              </mesh>
            ))}
            {look.female &&
              [-0.38, 0.38].map((x) => (
                <mesh key={`l${x}`} position={[x + (x > 0 ? 0.24 : -0.24), 1.14, 0.8]} rotation={[0, 0, x > 0 ? -0.6 : 0.6]}>
                  <planeGeometry args={[0.16, 0.05]} />
                  <meshBasicMaterial color="#141414" />
                </mesh>
              ))}
            {/* cheeks */}
            {[-0.62, 0.62].map((x) => (
              <mesh key={`c${x}`} position={[x, 0.62, 0.79]}>
                <circleGeometry args={[0.13, 16]} />
                <meshBasicMaterial color="#FF8FA3" transparent opacity={0.55 * ghost} />
              </mesh>
            ))}
            {/* mouth: smile when quiet, open "O" when talking */}
            {mouthH < 0.1 && !pose.sad ? (
              <mesh position={[0, 0.55, 0.8]} rotation={[0, 0, Math.PI]}>
                <torusGeometry args={[0.2, 0.035, 8, 20, Math.PI]} />
                <meshBasicMaterial color="#5A1A14" transparent={ghost < 1} opacity={ghost} />
              </mesh>
            ) : pose.sad && mouthH < 0.1 ? (
              <mesh position={[0, 0.38, 0.8]}>
                <torusGeometry args={[0.18, 0.035, 8, 20, Math.PI]} />
                <meshBasicMaterial color="#5A1A14" />
              </mesh>
            ) : (
              <group position={[0, 0.55, 0.795]}>
                <mesh scale={[1, mouthH / 0.5, 1]}>
                  <circleGeometry args={[0.25, 24]} />
                  <meshBasicMaterial color={look.lips && look.female ? "#7A1F2B" : "#5A1A14"} transparent={ghost < 1} opacity={ghost} />
                </mesh>
                <mesh position={[0, -mouthH * 0.28, 0.005]} scale={[1, Math.max(0.2, mouthH / 0.9), 1]}>
                  <circleGeometry args={[0.14, 18]} />
                  <meshBasicMaterial color="#FF6F7D" transparent={ghost < 1} opacity={ghost} />
                </mesh>
              </group>
            )}
            {look.mustache && <Block size={[0.7, 0.14, 0.12]} color="#2B1A12" position={[0, 0.76, 0.8]} r={0.05} outline={0} />}
            {look.glasses && (
              <group position={[0, 0.98, 0.84]}>
                {[-0.38, 0.38].map((x) => (
                  <mesh key={x} position={[x, 0, 0]}>
                    <torusGeometry args={[0.31, 0.04, 8, 28]} />
                    <meshBasicMaterial color="#141414" />
                  </mesh>
                ))}
                <mesh>
                  <planeGeometry args={[0.18, 0.05]} />
                  <meshBasicMaterial color="#141414" />
                </mesh>
              </group>
            )}
            {pose.sad && (
              <mesh position={[0.42, 0.85 - ((frame % 24) / 24) * 0.9, 0.82]}>
                <sphereGeometry args={[0.08, 10, 10]} />
                <meshBasicMaterial color="#6EC6FF" />
              </mesh>
            )}
            <HairAndHat look={look} hair={hair} />
          </group>
        </group>
      </group>
    </FadeCtx.Provider>
  );
};

const Torso: React.FC<{ style: string; base: string; pants: string; look: Look3D }> = ({ style, base, look }) => (
  <group>
    <Block size={[1.92, style === "kurti" ? 2.5 : 1.95, 1.04]} color={base} position={[0, style === "kurti" ? 2.68 : 2.9, 0]} r={0.2} />
    {style === "suit" && (
      <>
        <mesh position={[0, 3.3, 0.53]}>
          <planeGeometry args={[0.62, 1.1]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        <Block size={[0.2, 0.95, 0.06]} color={look.tie ?? "#D7263D"} position={[0, 3.15, 0.56]} r={0.03} outline={0.02} />
      </>
    )}
    {style === "hoodie" && (
      <>
        <Block size={[1.5, 0.4, 0.5]} color={base} position={[0, 3.85, -0.35]} r={0.18} />
        <Block size={[1.1, 0.5, 0.08]} color={shade(base, -0.18)} position={[0, 2.45, 0.53]} r={0.06} outline={0.02} />
        {[-0.22, 0.22].map((x) => (
          <mesh key={x} position={[x, 3.35, 0.53]}>
            <planeGeometry args={[0.06, 0.55]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        ))}
      </>
    )}
    {style === "chef" &&
      [3.4, 3.0, 2.6].map((y) =>
        [-0.3, 0.3].map((x) => (
          <mesh key={`${x}${y}`} position={[x, y, 0.53]}>
            <circleGeometry args={[0.07, 12]} />
            <meshBasicMaterial color="#141414" />
          </mesh>
        )),
      )}
    {style === "kurti" && (
      <mesh position={[0, 1.55, 0.53]}>
        <planeGeometry args={[1.88, 0.18]} />
        <meshBasicMaterial color="#FFD400" />
      </mesh>
    )}
    {style === "uniform" &&
      [-0.5, 0.5].map((x) => <Block key={x} size={[0.5, 0.45, 0.06]} color={shade(base, -0.15)} position={[x, 3.25, 0.54]} r={0.04} outline={0.02} />)}
  </group>
);

const HairAndHat: React.FC<{ look: Look3D; hair: string }> = ({ look, hair }) => {
  const hat = look.hat ?? "none";
  const hc = look.hatColor ?? "#D7263D";
  const style = look.hairStyle ?? (look.female ? "long" : "short");
  return (
    <group>
      {hat !== "helmet" && hat !== "chef" && (
        <>
          <Block size={[1.86, 0.42, 1.62]} color={hair} position={[0, 1.68, -0.02]} r={0.18} />
          <Block size={[1.86, 1.0, 0.36]} color={hair} position={[0, 1.2, -0.66]} r={0.16} />
          {style === "long" && hat === "none" && (
            <>
              <Block size={[1.92, 1.9, 0.42]} color={hair} position={[0, 0.65, -0.7]} r={0.2} />
              {[-0.93, 0.93].map((x) => (
                <Block key={x} size={[0.24, 1.5, 1.0]} color={hair} position={[x, 0.75, -0.2]} r={0.1} />
              ))}
            </>
          )}
          {style === "bun" && hat === "none" && (
            <mesh position={[0, 2.05, -0.3]} castShadow>
              <sphereGeometry args={[0.42, 16, 12]} />
              <Toon color={hair} />
            </mesh>
          )}
        </>
      )}
      {hat === "cap" && (
        <>
          <Block size={[1.92, 0.5, 1.7]} color={hc} position={[0, 1.78, 0]} r={0.22} />
          <Block size={[1.4, 0.1, 0.8]} color={hc} position={[0, 1.58, 1.1]} r={0.05} />
        </>
      )}
      {hat === "beret" && (
        <mesh position={[0.15, 1.78, 0]} rotation={[0, 0, -0.25]} scale={[1.05, 0.32, 0.95]} castShadow>
          <sphereGeometry args={[1, 20, 14]} />
          <Toon color={hc} />
        </mesh>
      )}
      {hat === "helmet" && (
        <mesh position={[0, 1.45, 0]} scale={[1.05, 0.85, 1]} castShadow>
          <sphereGeometry args={[1.08, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <Toon color={look.hatColor ?? "#5B6B3A"} />
        </mesh>
      )}
      {hat === "chef" && (
        <>
          <Block size={[1.7, 0.7, 1.5]} color="#FFFFFF" position={[0, 1.85, 0]} r={0.15} />
          {[-0.45, 0.45, 0].map((x, i) => (
            <mesh key={x} position={[x, 2.45 + (i === 2 ? 0.2 : 0), 0]} castShadow>
              <sphereGeometry args={[0.58, 16, 12]} />
              <Toon color="#FFFFFF" />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
};

/** lighten (+) / darken (-) a hex colour */
export const shade = (hex: string, amt: number) => {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt)));
  return `#${c.getHexString()}`;
};
