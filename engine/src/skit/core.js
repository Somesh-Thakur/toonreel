// ToonReel skit builder: turns a skit spec (cast + beats) into SkitReel props.
// Shared by the CLI (real TTS timings) and the web studio (estimated timings).
//
// buildProps(spec, voiced) where voiced[beatIndex] = { dur, caps: [{ text, startMs, endMs }] }
// for every beat that has `say`. Use estimateLine() when there is no real audio yet.

const GAP = 0.12;
const START = 0.15;
const SLOTS = ["broker", "girl", "uncle"];
/** worlds rendered by the 3D stage (blocky toy characters); everything else is 2D */
export const WORLDS_3D = ["town", "classroom", "bedroom"];

/** Rough timing for a line without TTS (≈2.6 words/s), with per-word caption timings. */
export function estimateLine(text, wordsPerSec = 2.6) {
  const words = text.split(/\s+/).filter(Boolean);
  const caps = [];
  let t = 0;
  for (const w of words) {
    const d = (0.18 + w.length * 0.045) * (2.6 / wordsPerSec);
    caps.push({ text: " " + w, startMs: Math.round(t * 1000), endMs: Math.round((t + d) * 1000), timestampMs: Math.round((t + d / 2) * 1000), confidence: null });
    t += d + (/[.,!?…]$/.test(w) ? 0.18 : 0.04);
  }
  return { dur: Math.max(0.6, t), caps };
}

/** Which character slot (broker/girl/uncle) each cast member uses. */
export function slotMap(spec) {
  const map = {};
  let n = 0;
  // a narrator is a voice only: never drawn, never takes a character slot
  spec.cast.forEach((c) => (map[c.id] = c.narrator ? "narrator" : c.slot || SLOTS[n++]));
  return map;
}

const CAPTION_BOTTOM = {
  wide: { home: 1180, station: 800, cart: 1380, shop: 760, studio: 1200, town: 470, classroom: 470, bedroom: 470 },
  closeup: 1250,
  closeup3d: 330,
  close: 560,
  close3d: 380,
  tour: { tall: 440, photo: 640, wide: 700 },
};

const TOUR_LAYOUT = {
  tall: { screen: { x: 160, y: 250, w: 760, h: 1013 }, chars: { scale: 0.4, y: 2000, brokerX: 190, girlX: 540, uncleX: 890 }, stickerTop: 365 },
  photo: { screen: { x: 40, y: 300, w: 1000, h: 750 }, chars: { scale: 0.5, y: 2010, brokerX: 190, girlX: 540, uncleX: 890 } },
  wide: { screen: { x: 40, y: 300, w: 1000, h: 563 }, chars: { scale: 0.55, y: 2010, brokerX: 190, girlX: 540, uncleX: 890 } },
};

export function buildProps(spec, voiced) {
  const world = spec.world || "home";
  const wo = spec.world_options || {};
  const slots = slotMap(spec);
  const layoutName = spec.tour?.layout || "tall";
  const layout = TOUR_LAYOUT[layoutName];

  // ---------------- timeline ----------------
  let t = START;
  const beats = spec.beats.map((b, i) => {
    let dur = 0;
    if (b.say) dur = voiced[i].dur + GAP;
    else if (b.pause) dur = b.pause;
    else if (b.enter) dur = 0.45;
    else if (b.dive) dur = typeof b.dive === "number" ? b.dive : 0.6;
    else if (b.shutter) dur = b.shutter;
    else if (b.exit) dur = 0.45;
    else if (b.move) dur = b.walk ?? 1.4;
    const beat = { ...b, i, from: t, to: t + dur };
    t += dur;
    return beat;
  });
  const end = +(t + (spec.end_hold ?? 2.4)).toFixed(2);

  // carry scene / crowd / rain state forward
  let scene = beats[0]?.scene || "wide";
  let crowdState = "calm";
  let rain = false;
  for (const b of beats) {
    if (b.dive) b.scene = "dive";
    else if (b.cta && !b.scene) b.scene = "cta";
    else if (b.scene) scene = b.scene;
    b.scene = b.scene || scene;
    if (b.scene !== "dive" && b.scene !== "cta") scene = b.scene;
    if (b.crowd) crowdState = b.crowd;
    b.crowdState = crowdState;
    if (b.rain !== undefined) rain = b.rain;
    b.raining = rain;
  }

  // ---------------- scenes (merge runs) ----------------
  const scenes = [];
  for (const b of beats) {
    const kind = b.scene;
    let s;
    if (kind.startsWith("closeup:")) s = { type: "closeup", who: slots[kind.split(":")[1]] };
    else if (kind === "tour") s = { type: "tour" };
    else if (kind === "cta") s = { type: "cta" };
    else {
      // "low:mia" = low camera focused on mia (3D worlds)
      const [cam, id] = kind.split(":");
      s = { type: "street", camera: ["dive", "close", "orbit", "top", "low"].includes(cam) ? cam : "wide" };
      if (id && slots[id]) s.who = slots[id];
    }
    const last = scenes[scenes.length - 1];
    if (last && JSON.stringify({ ...last, fromSec: 0, toSec: 0 }) === JSON.stringify({ ...s, fromSec: 0, toSec: 0 })) last.toSec = b.to;
    else scenes.push({ ...s, fromSec: b.from, toSec: b.to });
  }
  if (scenes.length) scenes[scenes.length - 1].toSec = end + 1;

  // ---------------- captions + zones ----------------
  const captions = [];
  const zones = [];
  for (const b of beats) {
    if (!b.say) continue;
    const who = slots[b.say];
    const off = Math.round(b.from * 1000);
    for (const c of voiced[b.i].caps) {
      captions.push({ ...c, startMs: c.startMs + off, endMs: c.endMs + off, timestampMs: (c.timestampMs ?? c.startMs) + off, speaker: who });
    }
    if (b.captions === false) continue;
    const k = b.scene;
    const is3d = WORLDS_3D.includes(world);
    const bottom = k.startsWith("closeup")
      ? is3d ? CAPTION_BOTTOM.closeup3d : CAPTION_BOTTOM.closeup
      : k === "tour"
        ? CAPTION_BOTTOM.tour[layoutName]
        : k.split(":")[0] === "close" || (is3d && ["top", "low"].includes(k.split(":")[0]))
          ? is3d ? CAPTION_BOTTOM.close3d : CAPTION_BOTTOM.close
          : CAPTION_BOTTOM.wide[world] ?? 1180;
    zones.push({ fromSec: b.from, toSec: b.to, bottom });
  }

  // ---------------- per-beat extras ----------------
  const poses = [];
  const stickers = [];
  const bubbles = [];
  const insets = [];
  const shots = [];
  const sfx = [];
  const confetti = [];
  const quiz = [];
  const price = [];
  let cta = null;
  let brokerOutAt = 0;
  let shutterOpenAt = 999;
  let shutterDur = 1;
  let hookUntil = beats[0] ? beats[0].to : 2;
  let openQuiz = null;
  let openCard = null;

  const closeCard = (at) => {
    if (openCard) {
      price.push({ ...openCard, toSec: at });
      openCard = null;
    }
  };

  for (const b of beats) {
    if (b.exit) sfx.push({ src: "sfx/magic.wav", atSec: b.from, volume: 0.6 });
    if (b.move) sfx.push({ src: "sfx/whoosh.wav", atSec: b.from, volume: 0.15 });
    if (b.enter) {
      brokerOutAt = b.from;
      sfx.push({ src: "sfx/magic.wav", atSec: b.from, volume: 0.6 });
    }
    if (b.shutter) {
      shutterOpenAt = b.from;
      shutterDur = b.shutter;
      sfx.push({ src: "sfx/shutter.wav", atSec: b.from, volume: 0.5 });
    }
    if (b.dive) sfx.push({ src: "sfx/whoosh.wav", atSec: b.from + 0.1, volume: 0.6 });
    for (const name of b.sfx || []) sfx.push({ src: `sfx/${name}.wav`, atSec: b.from, volume: 0.55 });
    for (const [id, pose] of Object.entries(b.pose || {})) poses.push({ who: slots[id], fromSec: b.from, toSec: b.to + 0.2, pose });
    if (b.sticker) {
      const st = typeof b.sticker === "string" ? { text: b.sticker } : b.sticker;
      stickers.push({ ...st, fromSec: b.from, toSec: b.to });
      sfx.push({ src: "sfx/pop.wav", atSec: b.from, volume: 0.45 });
    }
    for (const bb of b.bubbles || []) bubbles.push({ ...bb, fromSec: b.from + (bb.delay || 0), toSec: b.to });
    if (b.inset) insets.push({ x: 80, y: 250, w: 430, h: 560, trimSec: 0, ...b.inset, trimSec: b.inset.trim ?? b.inset.trimSec ?? 0, fromSec: b.from, toSec: b.to });
    if (b.confetti) confetti.push({ fromSec: b.from, toSec: b.to + 1 });
    if (b.hook_end) hookUntil = b.to;

    // shots (tour footage / photos / title cards), split across the beat
    const list = b.shots || (b.shot ? [b.shot] : []);
    list.forEach((sh, j) => {
      const a = b.from + ((b.to - b.from) * j) / list.length;
      const z = b.from + ((b.to - b.from) * (j + 1)) / list.length;
      const base = { fromSec: +a.toFixed(3), toSec: +z.toFixed(3), zoom: sh.zoom || [1.0, 1.08], origin: sh.origin };
      if (sh.title) shots.push({ ...base, kind: "title", src: "", text: sh.title, bg: sh.bg });
      else if (sh.image) shots.push({ ...base, kind: "image", src: sh.image, pan: sh.pan });
      else shots.push({ ...base, kind: "video", src: sh.src, trimSec: sh.trim ?? 0 });
    });

    // price / info card: stays up until the next card, a `card: null`, or the CTA
    if (b.card !== undefined || b.cta) closeCard(b.from);
    if (b.card) {
      openCard = { fromSec: b.from, title: b.card.title || "", price: b.card.value, unit: b.card.unit || "", sub: b.card.sub };
      sfx.push({ src: "sfx/pop.wav", atSec: b.from, volume: 0.5 });
    }

    // quiz: opens on its beat, locks on a `lock` beat, reveals on a `reveal` beat
    // default board position sits over the lower part of the tour screen, clear of the captions
    if (b.quiz) openQuiz = { top: { tall: 760, photo: 640, wide: 560 }[layoutName], ...b.quiz, fromSec: b.from, lockAtSec: 1e9, revealAtSec: 1e9 };
    if (b.lock && openQuiz) {
      openQuiz.lockAtSec = b.from + (b.lock_delay ?? Math.max(0, (b.to - b.from) * 0.55));
      sfx.push({ src: "sfx/boom.wav", atSec: openQuiz.lockAtSec, volume: 0.7 });
    }
    if (b.reveal && openQuiz) {
      openQuiz.revealAtSec = b.from;
      quiz.push({ ...openQuiz, toSec: b.to + 0.6 });
      sfx.push({ src: "sfx/ding.wav", atSec: b.from, volume: 0.7 });
      openQuiz = null;
    }

    if (b.cta) {
      cta = { atSec: b.from, line: b.cta.line || "", phone: b.cta.value || "", footer: b.cta.footer };
      sfx.push({ src: "sfx/applause.wav", atSec: b.from, volume: 0.4 });
    }
  }
  closeCard(end + 1);
  if (openQuiz) quiz.push({ ...openQuiz, toSec: end + 1 });

  // crowd windows
  const crowd = [];
  for (const b of beats) {
    const st = b.crowdState;
    const state = st === "cheer" ? { excite: 1, cheer: true } : st === "excited" ? { excite: 0.8 } : { excite: 0.15 };
    const last = crowd[crowd.length - 1];
    if (last && last.state === st) last.toSec = b.to;
    else crowd.push({ fromSec: b.from, toSec: b.to, state: st, ...state });
  }
  if (crowd.length) crowd[crowd.length - 1].toSec = end + 1;

  // rain windows
  let rainWin = null;
  const rb = beats.filter((b) => b.raining);
  if (rb.length) rainWin = { fromSec: rb[0].from, toSec: rb[rb.length - 1].to + 0.3 };

  // looks / colors / tracks by slot
  const looks = { broker: {}, girl: {} };
  const colors = {};
  for (const c of spec.cast) {
    if (c.narrator) {
      if (c.color) colors.narrator = c.color;
      continue;
    }
    looks[slots[c.id]] = c.look || {};
    if (c.color) colors[slots[c.id]] = c.color;
  }
  if (!spec.cast.some((c) => slots[c.id] === "uncle")) delete looks.uncle;

  // ---------------- 3D stage: positions, walks, facing, entrances ----------------
  let stage3d;
  if (WORLDS_3D.includes(world)) {
    const actorsCast = spec.cast.filter((c) => !c.narrator);
    const spots = { 1: [0], 2: [-3.2, 3.2], 3: [-4.6, 0, 4.6] }[actorsCast.length] || actorsCast.map((_, i) => -4.6 + i * 3);
    const pos = {};
    const actors = actorsCast.map((c, i) => {
      pos[c.id] = c.pos || [spots[i], 0];
      return { who: slots[c.id], pos: pos[c.id] };
    });
    const actorOf = (id) => actors.find((a) => a.who === slots[id]);
    const moves = [];
    const faces = [];
    const sizes = [];
    for (const b of beats) {
      if (b.enter && actorOf(b.enter)) actorOf(b.enter).enterAt = b.from;
      if (b.exit && actorOf(b.exit)) actorOf(b.exit).exitAt = b.from;
      for (const [id, m] of Object.entries(b.move || {})) {
        const to = Array.isArray(m) ? m : m.to;
        if (!pos[id]) continue;
        moves.push({ who: slots[id], fromSec: b.from, toSec: b.to, from: pos[id], to, run: !!m.run });
        pos[id] = to;
      }
      for (const [id, size] of Object.entries(b.size || {})) {
        if (!pos[id]) continue;
        sizes.push({ who: slots[id], atSec: b.from, size });
        const prev = [...sizes].reverse().find((x, k) => k > 0 && x.who === slots[id]);
        sfx.push({ src: `sfx/${size < (prev?.size ?? 1) ? "shrink" : "grow"}.wav`, atSec: b.from, volume: 0.5 });
      }
      for (const [id, face] of Object.entries(b.face || {})) {
        faces.push({ who: slots[id], fromSec: b.from, toSec: 1e9, face: spec.cast.some((c) => c.id === face) ? slots[face] : face });
      }
    }
    // a later `face` for the same actor replaces the earlier one
    for (const f of faces) {
      const next = faces.find((g) => g !== f && g.who === f.who && g.fromSec > f.fromSec);
      if (next) f.toSec = next.fromSec;
    }
    stage3d = { set: world, options: { night: wo.night, sign: wo.sign, signSub: wo.signSub, board: wo.board, poster: wo.poster }, actors, moves, faces, sizes, extras: wo.extras };
  }

  const props = {
    durationSec: end,
    world,
    station: { board: wo.board || "STATION", boardLocal: wo.boardLocal, banner: wo.banner || "OPEN" },
    cartLabel: wo.cartLabel,
    studioSign: wo.sign ? { sign: wo.sign, sub: wo.signSub } : undefined,
    street: {
      interior: wo.interior,
      sign1: wo.shopSign1 || "",
      sign2: wo.shopSign2 || "",
      shutterOpenAt,
      shutterDur,
      brokerOutAt,
    },
    tour: { style: world === "studio" ? "studio" : "warm", ...layout },
    colors,
    sfx,
    captions,
    captionZones: zones,
    scenes,
    crowd: crowd.map(({ state, ...c }) => c),
    bubbles,
    poses,
    shots,
    stickers,
    insets,
    quiz,
    confetti: cta ? [...confetti] : confetti,
    rain: rainWin || undefined,
    price,
    cta: cta || { atSec: end + 10, line: "", phone: "" },
    hook: spec.hook ? { text: spec.hook.text || spec.hook, untilSec: spec.hook.until ?? hookUntil, top: spec.hook.top ?? 230 } : { text: "", untilSec: 0 },
    looks,
    stage3d,
  };

  // every key explicit: Remotion fills missing input props from the composition's defaultProps (the demo skit),
  // so an absent `rain` or `stage3d` would leak in from the demo
  for (const k of Object.keys(props)) if (props[k] === undefined) props[k] = null;
  if (!props.tracks) props.tracks = {};

  // audio cues the CLI turns into a crowd track
  const crowdCues = [];
  for (const b of beats) {
    if (b.crowd === "cheer") crowdCues.push({ kind: "cheer", atSec: b.from });
    if (b.crowd === "excited") crowdCues.push({ kind: "chatter", atSec: b.from });
  }
  return { props, timeline: beats.map((b) => ({ i: b.i, from: b.from, to: b.to, say: b.say, text: b.text })), crowdCues, slots };
}
