import { buildProps, estimateLine } from "@engine/skit/core.js";

/**
 * Spec -> props for the in-browser preview.
 * No TTS here: line timings are estimated, mouths follow the captions, and footage the
 * browser can't see (local files) is shown as a labelled title card.
 */
export function previewProps(spec) {
  const voiced = {};
  spec.beats.forEach((b, i) => {
    if (b.say && b.text) voiced[i] = estimateLine(b.text);
  });
  const safe = {
    ...spec,
    beats: spec.beats.map((b, i) => {
      const nb = { ...b };
      if (nb.say && !nb.text) delete nb.say;
      const fix = (sh) => (sh.title ? sh : { title: `🎬 ${(sh.src || sh.image || "your clip").split(/[\\/]/).pop()}`, bg: "#263238" });
      if (nb.shot) nb.shot = fix(nb.shot);
      if (nb.shots) nb.shots = nb.shots.map(fix);
      delete nb.inset;
      return nb;
    }),
    world_options: { ...(spec.world_options || {}), interior: undefined },
  };
  const { props } = buildProps(safe, voiced);
  props.sfx = []; // sound effects play in the real render only
  props.tracks = {};
  return props;
}
