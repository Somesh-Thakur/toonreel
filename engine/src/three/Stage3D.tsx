// The 3D stage for skits: a set, the cast (walking, facing, posing, lip-syncing), background extras and a camera
// that follows the skit's scenes (wide, close, closeup:<id>, orbit, top, low, dive, tour).
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import React from "react";
import * as THREE from "three";
import { interpolate, spring, useVideoConfig } from "remotion";
import type { CharacterLook, CharacterPose } from "../components/Character2D";
import { Character3D, type Pose3D } from "./Block3D";
import { BedroomSet, ClassroomSet, DIVE_TARGET, Lights, SKY, TownSet, type Set3DName, type Set3DOptions } from "./Sets3D";
import { rand } from "./toon";

type Who = "broker" | "girl" | "uncle";
type Win = { fromSec: number; toSec: number };
type XZ = [number, number];

export type Stage3DSpec = {
  set: Set3DName;
  options?: Set3DOptions;
  actors: { who: Who; pos: XZ; enterAt?: number; exitAt?: number }[];
  moves: (Win & { who: Who; from: XZ; to: XZ; run?: boolean })[];
  faces: (Win & { who: Who; face: string })[];
  /** persistent size changes (shrink / grow gags), animated with a bouncy spring */
  sizes?: { who: Who; atSec: number; size: number }[];
  /** background people (default: town 4, classroom 8, bedroom 0) */
  extras?: number;
};

type CamScene = Win & { type: string; camera?: string; who?: Who };
type Cam = { pos: THREE.Vector3; target: THREE.Vector3; fov: number };

const ease = (x: number) => x * x * (3 - 2 * x);

/** where an actor is at time t, whether they are walking, and how far they have walked */
const actorState = (spec: Stage3DSpec, who: Who, t: number) => {
  const a = spec.actors.find((x) => x.who === who)!;
  let pos: XZ = a.pos;
  let walking: false | true | "run" = false;
  let dist = 0;
  let dir: number | null = null;
  let lastEnd = -1;
  let lastDir = 0;
  for (const m of spec.moves.filter((x) => x.who === who).sort((p, q) => p.fromSec - q.fromSec)) {
    const dx = m.to[0] - m.from[0];
    const dz = m.to[1] - m.from[1];
    const len = Math.hypot(dx, dz);
    if (t >= m.toSec) {
      pos = m.to;
      dist += len;
      lastEnd = m.toSec;
      lastDir = Math.atan2(dx, dz);
    } else if (t >= m.fromSec) {
      const k = ease((t - m.fromSec) / Math.max(0.01, m.toSec - m.fromSec));
      pos = [m.from[0] + dx * k, m.from[1] + dz * k];
      dist += len * k;
      walking = m.run ? "run" : true;
      dir = Math.atan2(dx, dz);
    }
  }
  return { pos, walking, dist, dir, lastEnd, lastDir };
};

const angleLerp = (a: number, b: number, k: number) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
};

const CameraRig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.copy(cam.pos);
  camera.lookAt(cam.target);
  if (camera.fov !== cam.fov) {
    camera.fov = cam.fov;
    camera.updateProjectionMatrix();
  }
  return null;
};

const EXTRA_LOOKS: CharacterLook[] = [
  { style: "hoodie", outfit: "#FF7043", hat: "cap", hatColor: "#1E88E5" },
  { style: "kurti", outfit: "#26A69A", female: true, hairStyle: "bun" },
  { style: "hoodie", outfit: "#AB47BC", hair: "#8D6E63" },
  { style: "suit", outfit: "#546E7A", glasses: true },
  { style: "hoodie", outfit: "#FDD835", female: true, hairStyle: "long", hair: "#5D4037" },
  { style: "uniform", outfit: "#8D6E63", hat: "beret", hatColor: "#3949AB" },
  { style: "hoodie", outfit: "#EC407A", hat: "cap", hatColor: "#FFFFFF" },
  { style: "kurti", outfit: "#5C6BC0", female: true },
];

const Poof3D: React.FC<{ at: XZ; local: number }> = ({ at, local }) => {
  if (local < 0 || local > 18) return null;
  const k = local / 18;
  return (
    <group position={[at[0], 2.5, at[1]]}>
      {Array.from({ length: 9 }).map((_, i) => {
        const a = (i / 9) * Math.PI * 2;
        const r = 0.5 + k * 2.6;
        return (
          <mesh key={i} position={[Math.cos(a) * r, Math.sin(a) * r * 0.8 + k, Math.sin(a * 2) * 0.4]} scale={1.1 - k * 0.7}>
            <sphereGeometry args={[0.8, 12, 10]} />
            <meshBasicMaterial color="#F5F5F5" transparent opacity={1 - k} />
          </mesh>
        );
      })}
    </group>
  );
};

export const Stage3D: React.FC<{
  spec: Stage3DSpec;
  scenes: CamScene[];
  t: number;
  frame: number;
  looks: Partial<Record<Who, CharacterLook>>;
  srcOf: (w: Who) => string | undefined;
  talkOf: (w: Who) => number;
  poseOf: (w: Who) => CharacterPose;
  excite: number;
  cheer: boolean;
}> = ({ spec, scenes, t, frame, looks, srcOf, talkOf, poseOf, excite, cheer }) => {
  const { width, height, fps } = useVideoConfig();
  const set = spec.set;
  const night = !!spec.options?.night;
  const sky = night ? SKY[set].night : SKY[set].day;

  // ---------------- actors at time t ----------------
  const actors = spec.actors.map((a) => {
    const st = actorState(spec, a.who, t);
    return { ...a, ...st };
  });
  const visible = actors.filter((a) => (a.enterAt === undefined || t >= a.enterAt) && (a.exitAt === undefined || t < a.exitAt + 0.5));
  const cx = visible.length ? visible.reduce((s, a) => s + a.pos[0], 0) / visible.length : 0;
  const cz = visible.length ? visible.reduce((s, a) => s + a.pos[1], 0) / visible.length : 0;
  const spread = visible.length ? Math.max(...visible.map((a) => Math.abs(a.pos[0] - cx))) : 0;

  // persistent size: spring from the previous size to the latest one
  const sizeOf = (who: Who) => {
    const ev = (spec.sizes ?? []).filter((x) => x.who === who && x.atSec <= t);
    const cur = ev[ev.length - 1];
    if (!cur) return 1;
    const before = ev.length > 1 ? ev[ev.length - 2].size : 1;
    const k = spring({ frame: Math.round((t - cur.atSec) * fps), fps, config: { damping: 9, stiffness: 140 } });
    return before + (cur.size - before) * k;
  };

  const headingOf = (a: (typeof actors)[number]) => {
    if (a.dir !== null) return a.dir;
    const f = spec.faces.find((x) => x.who === a.who && t >= x.fromSec && t < x.toSec)?.face;
    let rest = -a.pos[0] * 0.05; // turn slightly toward the middle
    if (f === "left") rest = -Math.PI / 2;
    else if (f === "right") rest = Math.PI / 2;
    else if (f === "back") rest = Math.PI;
    else if (f && f !== "camera") {
      const o = actors.find((x) => x.who === f);
      // stage blocking: turn three-quarters toward them, never fully away from the camera
      if (o) rest = Math.max(-1.0, Math.min(1.0, Math.atan2(o.pos[0] - a.pos[0], o.pos[1] - a.pos[1])));
    }
    // film cheat: in their own closeup, a speaker turns mostly toward the camera
    const sc = scenes.find((x) => t >= x.fromSec && t < x.toSec);
    if (sc && sc.type === "closeup" && sc.who === a.who) rest *= 0.3;
    if (a.lastEnd >= 0 && t - a.lastEnd < 0.35) return angleLerp(a.lastDir, rest, ease((t - a.lastEnd) / 0.35));
    return rest;
  };

  // ---------------- camera ----------------
  const idx = Math.max(0, scenes.findIndex((s) => t >= s.fromSec && t < s.toSec));
  const camFor = (s: CamScene, tt: number): Cam => {
    const local = tt - s.fromSec;
    const len = Math.max(0.01, s.toSec - s.fromSec);
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const sway = Math.sin(tt * 0.7) * 0.25;
    const wideD = 15 + spread * 1.5;
    const wide: Cam = { pos: v(cx * 0.6 + sway, 6.2, cz + wideD), target: v(cx * 0.6, 2.9, cz), fov: 50 };
    if (s.type === "closeup" && s.who) {
      const a = actors.find((x) => x.who === s.who) ?? actors[0];
      // stay mostly in front of the face even when they turn to someone
      const h = Math.max(-0.55, Math.min(0.55, headingOf(a)));
      const d = 10 - Math.min(1, local / len) * 1; // slow push-in
      const sz = sizeOf(a.who);
      return { pos: v(a.pos[0] + Math.sin(h) * d * sz, 1.2 + 4.2 * sz, a.pos[1] + Math.cos(h) * d * sz), target: v(a.pos[0], 0.4 + 3.6 * sz, a.pos[1]), fov: 50 };
    }
    if (s.type === "tour") return { pos: v(cx, 3.2, cz + 15 + spread), target: v(cx, 8.4, cz), fov: 52 };
    const kind = s.type === "street" ? s.camera ?? "wide" : "wide";
    // "low:mia", "close:mia" ... centre that actor instead of the group
    const fa = s.who ? actors.find((x) => x.who === s.who) : undefined;
    if (fa) {
      const g = { ...s, who: undefined };
      const base = camFor(g, tt);
      const dx = fa.pos[0] - cx;
      const dz = fa.pos[1] - cz;
      const k = kind === "low" || kind === "close" ? 1 : 0.6;
      const sc = kind === "low" ? 0.55 : kind === "close" ? 0.75 : 1;
      const off = new THREE.Vector3(dx * k, 0, dz * k);
      // pull in closer when focusing one actor
      const pos = base.pos.clone().add(off);
      const target = base.target.clone().add(off);
      pos.sub(target).multiplyScalar(sc).add(target);
      if (kind === "low") target.y = 1.2 + 3 * sizeOf(fa.who);
      return { pos, target, fov: base.fov };
    }
    if (kind === "close") return { pos: v(cx + sway * 0.5, 5.6, cz + 12 + spread * 1.1), target: v(cx, 3.4, cz), fov: 50 };
    if (kind === "orbit") {
      const a = interpolate(local, [0, len], [-0.75, 0.75]);
      const r = 14 + spread * 1.3;
      return { pos: v(cx + Math.sin(a) * r, 6.5, cz + Math.cos(a) * r), target: v(cx, 2.8, cz), fov: 50 };
    }
    if (kind === "top") return { pos: v(cx, 30, cz + 9), target: v(cx, 0, cz), fov: 50 };
    if (kind === "low") return { pos: v(cx, 0.8, cz + 9 + spread), target: v(cx, 4.6, cz), fov: 64 };
    if (kind === "dive") {
      const k = Math.pow(Math.min(1, local / len), 2.4);
      const tgt = v(...DIVE_TARGET[set]);
      return { pos: wide.pos.clone().lerp(tgt.clone().add(v(0, 0.3, 1.2)), k), target: wide.target.clone().lerp(tgt, Math.min(1, k * 1.6)), fov: 50 - k * 12 };
    }
    return wide;
  };
  const scene = scenes[idx] ?? { type: "street", camera: "wide", fromSec: 0, toSec: 999 };
  let cam = camFor(scene, t);
  // glide between street cameras (wide <-> close <-> orbit ...); closeups and tours cut
  const prev = scenes[idx - 1];
  const glides = (s?: CamScene) => s && s.type === "street" && s.camera !== "dive";
  if (glides(scene) && glides(prev)) {
    const k = spring({ frame: Math.round((t - scene.fromSec) * fps), fps, config: { damping: 20, stiffness: 70 } });
    if (k < 0.999) {
      const from = camFor(prev!, scene.fromSec - 0.001);
      cam = { pos: from.pos.lerp(cam.pos, k), target: from.target.lerp(cam.target, k), fov: from.fov + (cam.fov - from.fov) * k };
    }
  }

  // ---------------- extras ----------------
  const nExtras = spec.extras ?? (set === "town" ? 4 : set === "classroom" ? 8 : 0);
  const extras: React.ReactNode[] = [];
  const seats: [number, number][] = [
    [-10, -1.4],
    [10, -1.4],
    [-5.5, -1.4],
    [5.5, -1.4],
    [-10, 4.1],
    [10, 4.1],
    [-5.5, 4.1],
    [5.5, 4.1],
  ];
  for (let i = 0; i < nExtras; i++) {
    const look = EXTRA_LOOKS[i % EXTRA_LOOKS.length];
    const jump = excite > 0.5 ? { jump: 22 + rand(i) * 20, phase: rand(i + 3) * 6 } : {};
    let pose: Pose3D = { phase: rand(i) * 9, ...jump, ...(cheer ? { cheer: true } : {}) };
    let pos: [number, number, number];
    let heading = 0;
    if (set === "classroom") {
      const [x, z] = seats[i % seats.length];
      pos = [x, 0.55, z - 1.4];
      pose = { ...pose, sit: !cheer, jump: cheer ? pose.jump : 0 };
      heading = x > 0 ? -0.35 : 0.35;
    } else if (i < 2 && set === "town") {
      // walkers crossing the street behind the cast
      const dirn = i === 0 ? 1 : -1;
      const x = (((t * 2.4 + i * 30) % 70) - 35) * dirn;
      pos = [x, 0, -6.6 - i * 1.6];
      heading = (dirn * Math.PI) / 2;
      pose = { walk: true, phase: i };
    } else {
      const side = i % 2 ? 1 : -1;
      pos = [side * (9 + (i % 3) * 2.2), 0, -2.5 - (i % 3)];
      heading = -side * 0.5;
    }
    extras.push(<Character3D key={`x${i}`} look={look} pose={pose} position={pos} heading={heading} scale={0.92} stride={pose.walk ? t * 1.2 : undefined} />);
  }

  return (
    <ThreeCanvas width={width} height={height} shadows flat gl={{ antialias: true, preserveDrawingBuffer: true }} camera={{ fov: 50, near: 0.1, far: 400, position: [0, 7, 22] }}>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 55, 140]} />
      <CameraRig cam={cam} />
      <Lights night={night} indoor={set !== "town"} />
      {set === "town" ? <TownSet {...spec.options} t={t} /> : set === "classroom" ? <ClassroomSet {...spec.options} /> : <BedroomSet {...spec.options} />}
      {extras}
      {actors.map((a) => {
        const look = looks[a.who];
        if (!look) return null;
        const enterK = a.enterAt === undefined ? 1 : t < a.enterAt ? 0 : spring({ frame: Math.round((t - a.enterAt) * fps), fps, config: { damping: 12, stiffness: 120 } });
        const exitK = a.exitAt === undefined || t < a.exitAt ? 1 : Math.max(0, 1 - (t - a.exitAt) / 0.3);
        const k = enterK * exitK * sizeOf(a.who);
        // in a closeup, nobody may stand between the camera and the subject
        if (scene.type === "closeup" && scene.who !== a.who) {
          const c2 = new THREE.Vector2(cam.pos.x, cam.pos.z);
          const s2 = new THREE.Vector2(cam.target.x, cam.target.z);
          const p2 = new THREE.Vector2(a.pos[0], a.pos[1]);
          const dir = s2.clone().sub(c2);
          const len = dir.length();
          const along = p2.clone().sub(c2).dot(dir.normalize());
          const side = Math.abs(p2.clone().sub(c2).cross(dir));
          if (along > 0 && along < len - 0.5 && side < 2.6) return null;
        }
        const pose: Pose3D = { ...(poseOf(a.who) as Pose3D) };
        if (a.walking) pose.walk = a.walking;
        return (
          <React.Fragment key={a.who}>
            {k > 0.01 && (
              <Character3D
                audioSrc={srcOf(a.who)}
                talkLevel={talkOf(a.who)}
                look={look}
                pose={pose}
                position={[a.pos[0], 0, a.pos[1]]}
                heading={headingOf(a)}
                scale={k}
                stride={a.dist * 0.35}
                gain={a.who === "girl" ? 11 : 9}
              />
            )}
            {a.enterAt !== undefined && <Poof3D at={a.pos} local={Math.round((t - a.enterAt) * fps)} />}
            {a.exitAt !== undefined && <Poof3D at={a.pos} local={Math.round((t - a.exitAt) * fps)} />}
          </React.Fragment>
        );
      })}
      {/* frame is read so the canvas re-renders every frame */}
      <group userData={{ frame }} />
    </ThreeCanvas>
  );
};
