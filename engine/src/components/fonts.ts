import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadDeva } from "@remotion/google-fonts/NotoSansDevanagari";

export const anton = loadAnton("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const poppins = loadPoppins("normal", { weights: ["800"], subsets: ["latin"] }).fontFamily;
export const deva = loadDeva("normal", { weights: ["800"], subsets: ["devanagari", "latin"] }).fontFamily;

/** Poppins for Latin, falls back to Noto Devanagari for Hindi script. */
export const captionFont = `${poppins}, ${deva}, sans-serif`;
export const titleFont = `${anton}, ${deva}, sans-serif`;
