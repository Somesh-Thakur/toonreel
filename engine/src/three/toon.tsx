// Shared bits for the 3D look: cel-shading ramp, rounded blocks with ink outlines, text textures.
import React, { createContext, useContext, useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/** 3-step toon ramp: hard cartoon shading instead of smooth gradients */
let ramp: THREE.DataTexture | null = null;
export const toonRamp = () => {
  if (ramp) return ramp;
  const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  ramp = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  ramp.minFilter = THREE.NearestFilter;
  ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  return ramp;
};

/** opacity for a whole character (ghost / fade-out gags) */
export const FadeCtx = createContext(1);

export const Toon: React.FC<{ color: string; emissive?: string; map?: THREE.Texture | null }> = ({ color, emissive, map }) => {
  const fade = useContext(FadeCtx);
  return (
    <meshToonMaterial
      color={color}
      gradientMap={toonRamp()}
      emissive={emissive ?? "#000000"}
      map={map ?? null}
      transparent={fade < 1}
      opacity={fade}
      depthWrite={fade >= 1}
    />
  );
};

const geoCache = new Map<string, THREE.BufferGeometry>();
export const roundedBox = (w: number, h: number, d: number, r = 0.12) => {
  const key = `${w}|${h}|${d}|${r}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
    geoCache.set(key, g);
  }
  return g;
};

const INK = "#141414";

/** A rounded block with an inverted-hull ink outline (the "toy cartoon" look). */
export const Block: React.FC<{
  size: [number, number, number];
  color: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  r?: number;
  outline?: number;
  emissive?: string;
  shadow?: boolean;
  map?: THREE.Texture | null;
}> = ({ size, color, position, rotation, r = 0.12, outline = 0.045, emissive, shadow = true, map }) => {
  const [w, h, d] = size;
  const g = roundedBox(w, h, d, r);
  const fade = useContext(FadeCtx);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={g} castShadow={shadow} receiveShadow>
        <Toon color={color} emissive={emissive} map={map} />
      </mesh>
      {outline > 0 && fade > 0.99 && (
        <mesh geometry={g} scale={[(w + outline * 2) / w, (h + outline * 2) / h, (d + outline * 2) / d]}>
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
};

/** Canvas texture with big bold text (signs, chalkboards, posters). */
export const useTextTexture = (lines: string[], opts: { w?: number; h?: number; bg?: string; fg?: string; font?: string; stroke?: string } = {}) => {
  const { w = 1024, h = 256, bg = "#ffd400", fg = "#141414", font = "Anton, Impact, 'Arial Black', sans-serif", stroke } = opts;
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d")!;
    x.fillStyle = bg;
    x.fillRect(0, 0, w, h);
    const n = Math.max(1, lines.length);
    let size = Math.floor((h / n) * 0.72);
    x.textAlign = "center";
    x.textBaseline = "middle";
    // shrink to fit the widest line
    for (;;) {
      x.font = `${size}px ${font}`;
      const widest = Math.max(...lines.map((l) => x.measureText(l).width), 1);
      if (widest < w * 0.9 || size < 12) break;
      size -= 4;
    }
    lines.forEach((l, i) => {
      const y = (h / n) * (i + 0.5);
      if (stroke) {
        x.lineWidth = size * 0.12;
        x.strokeStyle = stroke;
        x.lineJoin = "round";
        x.strokeText(l, w / 2, y);
      }
      x.fillStyle = fg;
      x.fillText(l, w / 2, y);
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.join("\n"), w, h, bg, fg, font, stroke]);
};

/** deterministic pseudo-random (renders must be identical frame to frame) */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
