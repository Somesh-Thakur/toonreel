import type { Caption } from "@remotion/captions";
import { Audio, Video } from "@remotion/media";
import React from "react";
import { AbsoluteFill, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Character2D, type CharacterLook, type CharacterPose } from "../components/Character2D";
import { FilmLook, HookTitle, ProgressBar } from "../components/Overlays";
import { ReelCaptions } from "../components/ReelCaptions";
import {
  Bubble,
  CartBackdrop,
  CartFront,
  Confetti,
  CrowdBack,
  Poof,
  QuizBoard,
  Rain,
  ShopFront,
  StageDesks,
  StationBackdrop,
  HomeBackdrop,
  TeamCrowd,
  StudioBackdrop,
  TourBackdrop,
} from "../components/Street";
import { Img } from "remotion";
import { CtaCard, LocationPin, PriceCard } from "./ShowcaseReel";

/** "girl" = the 2nd character slot (girl / chef / Gen-Z son…), "uncle" = optional 3rd character */
type Who = "broker" | "girl" | "uncle";
type Win = { fromSec: number; toSec: number };

export type SkitScene = Win &
  (
    | { type: "street"; camera?: "wide" | "close" | "dive" }
    | { type: "girl" }
    | { type: "closeup"; who: Who }
    | { type: "tour" }
    | { type: "cta" }
  );

export type TourShot = Win & {
  src: string;
  kind?: "video" | "image" | "title";
  /** title shots: big text on a colour */
  text?: string;
  bg?: string;
  trimSec?: number;
  zoom?: [number, number];
  origin?: string;
  /** image: translateY % from -> to (pan across a tall photo) */
  pan?: [number, number];
};

type PriceWin = Win & { title: string; price: string; unit: string; sub?: string };

export type SkitReelProps = {
  durationSec: number;
  /** voice tracks per character slot; leave out for a silent preview (mouths follow the captions) */
  tracks?: { broker?: string; girl?: string; uncle?: string; crowd?: string };
  /** pop-up "proof" video windows, e.g. lift footage when someone says "lift hai" */
  insets?: (Win & { src: string; trimSec: number; x: number; y: number; w: number; h: number; label?: string })[];
  sfx?: { src: string; atSec: number; volume?: number }[];
  captions: (Caption & { speaker: Who })[];
  captionZones: (Win & { bottom: number })[];
  scenes: SkitScene[];
  street: { interior?: string; sign1: string; sign2: string; shutterOpenAt: number; shutterDur: number; brokerOutAt: number };
  crowd: (Win & { excite: number; cheer?: boolean })[];
  bubbles: (Win & { text: string; x: number; y: number; tail?: "left" | "right"; color?: string })[];
  poses: (Win & { who: Who; pose: CharacterPose })[];
  shots: TourShot[];
  stickers: (Win & { text: string; icon?: "pin" | "area" | "none" })[];
  price: PriceWin | PriceWin[];
  /** "shop" = office/shop front with shutter; "cart" = food cart on a street; "studio" = game show */
  world?: "shop" | "cart" | "studio" | "station" | "home";
  station?: { board: string; boardLocal?: string; banner?: string };
  studioSign?: { sign: string; sub?: string };
  /** tour layout overrides (defaults: 16:9 screen at top, warm backdrop) */
  tour?: {
    style?: "warm" | "studio";
    screen?: { x: number; y: number; w: number; h: number };
    chars?: { scale: number; y: number; brokerX: number; girlX: number; uncleX?: number };
    /** y of feature stickers (default: just below the screen) */
    stickerTop?: number;
  };
  quiz?: (Win & { question: string; options: string[]; answer: number; lockAtSec: number; revealAtSec: number; top?: number })[];
  confetti?: Win[];
  cartLabel?: string;
  rain?: Win;
  /** tour screen height (563 = 16:9, 750 = 4:3) */
  screenH?: number;
  colors?: { broker?: string; girl?: string; uncle?: string };
  cta: { atSec: number; line: string; phone: string; footer?: string };
  hook: { text: string; untilSec: number; top?: number };
  looks: { broker: CharacterLook; girl: CharacterLook; uncle?: CharacterLook };
};

const inWin = (t: number, w: Win) => t >= w.fromSec && t < w.toSec;

export const SkitReel: React.FC<SkitReelProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const f = (s: number) => Math.round(s * fps);
  const scene = p.scenes.find((s) => inWin(t, s)) ?? p.scenes[p.scenes.length - 1];
  const local = frame - f(scene.fromSec);
  const scr = p.tour?.screen ?? { x: 40, y: 300, w: 1000, h: p.screenH ?? 563 };
  const screenH = scr.h;
  const tc = p.tour?.chars ?? {
    scale: screenH > 600 ? 0.52 : 0.6,
    y: 2010,
    brokerX: 290,
    girlX: 770,
  };
  const len = f(scene.toSec) - f(scene.fromSec);

  const tr = p.tracks ?? {};
  const brokerSrc = tr.broker ? staticFile(tr.broker) : undefined;
  const girlSrc = tr.girl ? staticFile(tr.girl) : undefined;
  const uncleSrc = tr.uncle ? staticFile(tr.uncle) : undefined;
  // preview mode: flap the mouth while that character's caption words are on
  const talkOf = (who: Who) => {
    const ms = t * 1000;
    const on = p.captions.some((c) => c.speaker === who && ms >= c.startMs && ms <= c.endMs + 60);
    return on ? 0.35 + 0.6 * Math.abs(Math.sin(frame / 2.1)) : 0;
  };
  const poseOf = (who: Who): CharacterPose => p.poses.find((x) => x.who === who && inWin(t, x))?.pose ?? {};
  const srcOf = (who: Who) => (who === "broker" ? brokerSrc : who === "girl" ? girlSrc : uncleSrc);
  const lookOf = (who: Who) => (who === "broker" ? p.looks.broker : who === "girl" ? p.looks.girl : p.looks.uncle ?? {});

  // ---------- street world state (continuous across street scenes) ----------
  const shutter = interpolate(t, [p.street.shutterOpenAt, p.street.shutterOpenAt + p.street.shutterDur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const crowdNow = p.crowd.find((c) => inWin(t, c)) ?? { excite: 0.12, cheer: false };
  const out = spring({ frame: frame - f(p.street.brokerOutAt), fps, config: { damping: 14, stiffness: 90 } });
  const showBroker = t >= p.street.brokerOutAt;

  const rainAmt = p.rain
    ? interpolate(t, [p.rain.fromSec, p.rain.fromSec + 0.6, p.rain.toSec - 0.4, p.rain.toSec], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const world = p.world ?? "shop";

  const streetWorld = world === "home" ? (
    <>
      <HomeBackdrop />
      <TeamCrowd excite={crowdNow.excite} cheer={!!crowdNow.cheer} />
      {p.looks.uncle && (
        <Character2D audioSrc={uncleSrc} look={p.looks.uncle} talkLevel={talkOf("uncle")} pose={poseOf("uncle")} scale={0.5} x={230} y={1960} />
      )}
      <Character2D audioSrc={girlSrc} look={p.looks.girl} talkLevel={talkOf("girl")} pose={poseOf("girl")} scale={0.47} x={540} y={1960} gain={11} />
      {showBroker && (
        <Character2D audioSrc={brokerSrc} look={p.looks.broker} talkLevel={talkOf("broker")} pose={poseOf("broker")} scale={0.5 * out} x={850} y={1960} />
      )}
      <Poof x={850} y={1620} localFrame={frame - f(p.street.brokerOutAt)} />
    </>
  ) : world === "station" ? (
    <>
      <StationBackdrop board={p.station?.board ?? "STATION"} boardLocal={p.station?.boardLocal} banner={p.station?.banner} />
      {p.looks.uncle && (
        <Character2D audioSrc={uncleSrc} look={p.looks.uncle} talkLevel={talkOf("uncle")} pose={poseOf("uncle")} scale={0.5} x={260} y={1780} />
      )}
      <Character2D audioSrc={girlSrc} look={p.looks.girl} talkLevel={talkOf("girl")} pose={poseOf("girl")} scale={0.46} x={560} y={1780} gain={10} />
      {showBroker && (
        <Character2D audioSrc={brokerSrc} look={p.looks.broker} talkLevel={talkOf("broker")} pose={poseOf("broker")} scale={0.48 * out} x={850} y={1780} />
      )}
      <Poof x={850} y={1450} localFrame={frame - f(p.street.brokerOutAt)} />
    </>
  ) : world === "studio" ? (
    <>
      <StudioBackdrop sign={p.studioSign?.sign} sub={p.studioSign?.sub} />
      <Character2D audioSrc={brokerSrc} look={p.looks.broker} talkLevel={talkOf("broker")} pose={poseOf("broker")} scale={0.46} x={300} y={1500} />
      <Character2D audioSrc={girlSrc} look={p.looks.girl} talkLevel={talkOf("girl")} pose={poseOf("girl")} scale={0.44} x={780} y={1500} gain={11} />
      <StageDesks hostX={300} guestX={780} y={1270} />
      <CrowdBack excite={crowdNow.excite} cheer={!!crowdNow.cheer} />
    </>
  ) : world === "cart" ? (
    <>
      <CartBackdrop dark={rainAmt} />
      {/* chef stands behind the cart */}
      <Character2D audioSrc={girlSrc} look={p.looks.girl} talkLevel={talkOf("girl")} pose={poseOf("girl")} scale={0.5} x={540} y={1330} gain={10} />
      <CartFront label={p.cartLabel} />
      {showBroker && (
        <Character2D
          audioSrc={brokerSrc}
          look={p.looks.broker} talkLevel={talkOf("broker")}
          pose={poseOf("broker")}
          scale={0.47 * out}
          x={850}
          y={1500}
        />
      )}
      <Poof x={850} y={1250} localFrame={frame - f(p.street.brokerOutAt)} />
      <CrowdBack excite={crowdNow.excite} cheer={!!crowdNow.cheer} />
      <Rain amount={rainAmt} />
    </>
  ) : (
    <>
      <ShopFront shutter={shutter} interior={p.street.interior} sign1={p.street.sign1} sign2={p.street.sign2} />
      {showBroker && (
        <Character2D
          audioSrc={brokerSrc}
          look={p.looks.broker} talkLevel={talkOf("broker")}
          pose={poseOf("broker")}
          scale={interpolate(out, [0, 1], [0.3, 0.5])}
          x={540}
          y={interpolate(out, [0, 1], [1255, 1335])}
        />
      )}
      <CrowdBack excite={crowdNow.excite} cheer={!!crowdNow.cheer} />
    </>
  );

  let body: React.ReactNode = null;
  if (scene.type === "street" || scene.type === "cta") {
    const cam = scene.type === "street" ? scene.camera ?? "wide" : "wide";
    let scale = 1;
    // cart world: frame chef (x540) and broker (x850) together
    let origin = world === "cart" ? "700px 1000px" : "540px 1000px";
    if (cam === "close") scale = interpolate(spring({ frame: local, fps, config: { damping: 18 } }), [0, 1], [1, 1.6]);
    if (cam === "dive") {
      scale = interpolate(local, [0, len], [1.6, 5], { easing: (x) => x * x * x });
      origin = world === "station" ? "830px 580px" : world === "home" ? "885px 615px" : "540px 960px";
    }
    const flash = cam === "dive" ? interpolate(local, [len - 6, len], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
    body = (
      <>
        <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: origin }}>{streetWorld}</AbsoluteFill>
        {flash > 0 && <AbsoluteFill style={{ background: "#fff", opacity: flash }} />}
      </>
    );
  } else if (scene.type === "girl") {
    const s = spring({ frame: local, fps, config: { damping: 15 } });
    body = (
      <>
        <AbsoluteFill style={{ filter: "blur(10px) brightness(.9)", transform: "scale(1.5)", transformOrigin: "540px 1100px" }}>
          {streetWorld}
        </AbsoluteFill>
        <AbsoluteFill style={{ transform: `translateY(${(1 - s) * 400}px)` }}>
          <Character2D audioSrc={girlSrc} look={p.looks.girl} talkLevel={talkOf("girl")} pose={poseOf("girl")} scale={0.92} x={540} y={2040} gain={11} />
        </AbsoluteFill>
        <Rain amount={rainAmt} />
      </>
    );
  } else if (scene.type === "closeup") {
    const s = spring({ frame: local, fps, config: { damping: 15 } });
    body = (
      <>
        <AbsoluteFill style={{ filter: "blur(10px) brightness(.9)", transform: "scale(1.5)", transformOrigin: "540px 1100px" }}>
          {streetWorld}
        </AbsoluteFill>
        <AbsoluteFill style={{ transform: `translateY(${(1 - s) * 400}px)` }}>
          <Character2D audioSrc={srcOf(scene.who)} look={lookOf(scene.who)} talkLevel={talkOf(scene.who)} pose={poseOf(scene.who)} scale={0.92} x={540} y={2040} gain={10} />
        </AbsoluteFill>
      </>
    );
  } else if (scene.type === "tour") {
    const s = spring({ frame: local, fps, config: { damping: 13 } });
    body = (
      <>
        {p.tour?.style === "studio" ? <StudioBackdrop dim={0.25} /> : <TourBackdrop />}
        {/* the "screen" showing the real footage */}
        <div
          style={{
            position: "absolute",
            left: scr.x,
            top: scr.y,
            width: scr.w,
            height: screenH,
            borderRadius: 36,
            border: "10px solid #141414",
            overflow: "hidden",
            background: "#000",
            boxShadow: "0 24px 50px rgba(0,0,0,.35)",
            transform: `scale(${0.6 + 0.4 * s}) rotate(${(1 - s) * -6}deg)`,
          }}
        >
          {p.shots.map((sh, i) => {
            const sf = f(sh.fromSec);
            const d = Math.max(1, f(sh.toSec) - sf);
            const [z0, z1] = sh.zoom ?? [1.0, 1.08];
            const z = interpolate(frame - sf, [0, d], [z0, z1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const [p0, p1] = sh.pan ?? [0, 0];
            const pan = interpolate(frame - sf, [0, d], [p0, p1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const enter = interpolate(frame - sf, [0, 5], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <Sequence key={i} from={sf} durationInFrames={d} layout="none">
                <AbsoluteFill
                  style={{
                    transform: `translateX(${enter * 30}%) scale(${z})`,
                    transformOrigin: sh.origin ?? "50% 50%",
                    filter: `contrast(1.06) saturate(1.1) brightness(1.05) blur(${enter * 10}px)`,
                  }}
                >
                  {sh.kind === "title" ? (
                    <AbsoluteFill style={{ background: sh.bg ?? "linear-gradient(160deg,#1F3A5F,#3B1B6E)", display: "grid", placeItems: "center", padding: 40 }}>
                      <div style={{ fontFamily: "Anton, sans-serif", color: "#FFD400", fontSize: 92, lineHeight: 1.05, textAlign: "center", WebkitTextStroke: "6px #141414", paintOrder: "stroke fill" }}>{sh.text}</div>
                    </AbsoluteFill>
                  ) : sh.kind === "image" ? (
                    // tall photos: render taller than the screen and pan vertically
                    <Img
                      src={staticFile(sh.src)}
                      style={{
                        position: "absolute",
                        width: "100%",
                        height: sh.pan ? "auto" : "100%",
                        objectFit: "cover",
                        top: 0,
                        transform: `translateY(${pan}%)`,
                      }}
                    />
                  ) : (
                    <Video objectFit="cover" src={staticFile(sh.src)} trimBefore={f(sh.trimSec ?? 0)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </AbsoluteFill>
              </Sequence>
            );
          })}
          <div
            style={{
              position: "absolute",
              top: 20,
              left: 20,
              background: "rgba(0,0,0,.6)",
              color: "#fff",
              borderRadius: 999,
              padding: "6px 18px",
              fontFamily: "sans-serif",
              fontWeight: 800,
              fontSize: 30,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ width: 16, height: 16, borderRadius: 99, background: frame % 30 < 15 ? "#FF3B30" : "#7a1a16" }} />
            LIVE TOUR
          </div>
        </div>
        <Character2D audioSrc={brokerSrc} look={p.looks.broker} talkLevel={talkOf("broker")} pose={poseOf("broker")} scale={tc.scale} x={tc.brokerX} y={tc.y} />
        <Character2D audioSrc={girlSrc} look={p.looks.girl} talkLevel={talkOf("girl")} pose={poseOf("girl")} scale={tc.scale * 0.96} x={tc.girlX} y={tc.y} gain={11} />
        {p.looks.uncle && tc.uncleX !== undefined && (
          <Character2D audioSrc={uncleSrc} look={p.looks.uncle} talkLevel={talkOf("uncle")} pose={poseOf("uncle")} scale={tc.scale} x={tc.uncleX} y={tc.y} />
        )}
      </>
    );
  }

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {body}

      {/* stickers (tour) */}
      {p.stickers.map((s, i) => (
        <Sequence key={`st${i}`} from={f(s.fromSec)} durationInFrames={Math.max(1, f(s.toSec) - f(s.fromSec))} layout="none">
          <LocationPin text={s.text} icon={s.icon ?? "none"} top={p.tour?.stickerTop ?? scr.y + screenH + 30} />
        </Sequence>
      ))}

      {(p.quiz ?? []).map((q, i) =>
        inWin(t, q) ? (
          <QuizBoard
            key={`q${i}`}
            question={q.question}
            options={q.options}
            answer={q.answer}
            localFrame={frame - f(q.fromSec)}
            lockFrame={f(q.lockAtSec) - f(q.fromSec)}
            revealFrame={f(q.revealAtSec) - f(q.fromSec)}
            top={q.top ?? 760}
          />
        ) : null,
      )}
      {(p.confetti ?? []).map((c, i) => (inWin(t, c) ? <Confetti key={`cf${i}`} localFrame={frame - f(c.fromSec)} /> : null))}

      {/* pop-up proof windows */}
      {(p.insets ?? []).map((ins, i) => {
        const sf = f(ins.fromSec);
        const d = Math.max(1, f(ins.toSec) - sf);
        const s = spring({ frame: frame - sf, fps, config: { damping: 12, stiffness: 180 } });
        const outS = interpolate(frame - sf, [d - 6, d], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <Sequence key={`in${i}`} from={sf} durationInFrames={d} layout="none">
            <div
              style={{
                position: "absolute",
                left: ins.x,
                top: ins.y,
                width: ins.w,
                height: ins.h,
                borderRadius: 30,
                border: "8px solid #fff",
                boxShadow: "0 18px 40px rgba(0,0,0,.45)",
                overflow: "hidden",
                transform: `scale(${s * outS}) rotate(${(1 - s) * 10 + 3}deg)`,
                background: "#000",
              }}
            >
              <Video objectFit="cover" src={staticFile(ins.src)} trimBefore={f(ins.trimSec)} muted style={{ width: "100%", height: "100%" }} />
              {ins.label && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,.65)",
                    color: "#FFD400",
                    textAlign: "center",
                    fontFamily: "sans-serif",
                    fontWeight: 900,
                    fontSize: 40,
                    padding: "8px 0",
                  }}
                >
                  {ins.label}
                </div>
              )}
            </div>
          </Sequence>
        );
      })}

      {/* crowd speech bubbles */}
      {p.bubbles.map((b, i) =>
        inWin(t, b) ? <Bubble key={`b${i}`} text={b.text} x={b.x} y={b.y} tail={b.tail} color={b.color} localFrame={frame - f(b.fromSec)} /> : null,
      )}

      {/* captions, coloured by speaker, positioned per zone */}
      {p.captionZones.map((z, i) =>
        (["broker", "girl", "uncle"] as Who[]).map((who) => {
          const caps = p.captions.filter((c) => c.speaker === who && c.startMs >= z.fromSec * 1000 && c.startMs < z.toSec * 1000);
          if (!caps.length) return null;
          return (
            <ReelCaptions
              key={`${i}${who}`}
              captions={caps}
              style={{
                bottom: z.bottom,
                highlight:
                  who === "broker"
                    ? p.colors?.broker ?? "#FFD400"
                    : who === "girl"
                      ? p.colors?.girl ?? "#FF7CC3"
                      : p.colors?.uncle ?? "#FF8A65",
                fontSize: 70,
              }}
            />
          );
        }),
      )}

      {(Array.isArray(p.price) ? p.price : [p.price]).map((pw, i) => (
        <Sequence key={`price${i}`} from={f(pw.fromSec)} durationInFrames={f(pw.toSec) - f(pw.fromSec)} name={`Price ${i + 1}`}>
          <PriceCard title={pw.title} price={pw.price} unit={pw.unit} sub={pw.sub} />
        </Sequence>
      ))}
      <Sequence from={f(p.cta.atSec)} name="CTA">
        <CtaCard line={p.cta.line} phone={p.cta.phone} footer={p.cta.footer} />
      </Sequence>

      {p.hook.text && p.hook.untilSec > 0 && (<Sequence durationInFrames={f(p.hook.untilSec)} name="Hook">
        <HookTitle text={p.hook.text} top={p.hook.top ?? 170} />
      </Sequence>)}
      <FilmLook grain={0.025} vignette={0.25} />
      <ProgressBar />

      {brokerSrc && <Audio src={brokerSrc} />}
      {girlSrc && <Audio src={girlSrc} />}
      {uncleSrc && <Audio src={uncleSrc} />}
      {tr.crowd && <Audio src={staticFile(tr.crowd)} volume={0.55} />}
      {(p.sfx ?? []).map((s, i) => (
        <Sequence key={`sfx${i}`} from={f(s.atSec)} layout="none">
          <Audio src={staticFile(s.src)} volume={s.volume ?? 0.5} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
