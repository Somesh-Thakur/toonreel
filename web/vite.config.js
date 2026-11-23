import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));

// The studio imports the real engine components from ../engine/src.
// `dedupe` makes every shared package resolve from web/node_modules, so there is one React / Remotion.
const shared = ["react", "react-dom", "remotion", "@remotion/captions", "@remotion/google-fonts", "@remotion/media", "@remotion/media-utils", "@remotion/transitions", "@remotion/player", "@remotion/three", "three", "@react-three/fiber"];

export default defineConfig({
  base: "/toonreel/",
  plugins: [react()],
  resolve: {
    alias: { "@engine": path.resolve(here, "../engine/src") },
    dedupe: shared,
  },
  server: { fs: { allow: [path.resolve(here, "..")] } },
  build: { outDir: path.resolve(here, "../docs"), emptyOutDir: true, chunkSizeWarningLimit: 2500 },
});
