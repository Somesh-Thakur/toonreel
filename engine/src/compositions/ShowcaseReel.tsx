import type { Caption } from "@remotion/captions";
import { Audio, Video } from "@remotion/media";
import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Character2D, type CharacterLook } from "../components/Character2D";
import { captionFont, titleFont } from "../components/fonts";
import { FilmLook, HookTitle, ProgressBar } from "../components/Overlays";
import { ReelCaptions, type CaptionStyle } from "../components/ReelCaptions";

export type Shot = {
  src: string; // inside studio/public
  kind: "video" | "image";
  fromSec: number; // timeline start
  toSec: number; // timeline end
  trimSec?: number; // video: start offset in source
  zoom?: [number, number]; // scale from -> to
  origin?: string; // transform-origin, e.g. "50% 20%"
  pan?: [number, number]; // translateY % from -> to (images)
  enter?: "cut" | "flash" | "whip";
  blur?: number;
  /** which part of a non-9:16 photo/video stays visible after cover-crop, e.g. "0% 0%" */
  objectPosition?: string;
  /** brightness multiplier for dim footage (default 1.04) */
  bright?: number;
  /** translateX % (constant) */
  panX?: number;
  /** pulsing ring to point something out: [x, y, radius] in 1080x1920 px */
  ring?: [number, number, number];
};

export type ShowcaseReelProps = {
  voice: string;
  captions: Caption[];
  /** hide captions after this ms (e.g. while the phone number is read out) */
  captionsUntilMs?: number;
  durationSec: number;
  shots: Shot[];
  hook: string;
  hookUntilSec: number;
  badge?: string; // persistent top-left ribbon, e.g. "NEW" or "FOR RENT"
  location: string;
  locationAtSec: number;
  locationUntilSec?: number;
  /** extra pop-up chips, e.g. carpet area */
  stickers?: { text: string; icon?: "pin" | "area" | "none"; atSec: number; untilSec: number; top?: number }[];
  priceTitle: string; // "RENT"
  price: string; // "₹80,000"
  priceUnit: string; // "/ month"
  priceAtSec: number;
  priceUntilSec: number;
  ctaAtSec: number;
  ctaLine: string; // "Call / WhatsApp"
  phone: string; // the big line on the CTA card, e.g. a phone number or @handle
  ctaFooter?: string;
  look?: CharacterLook;
  sfx?: { whoosh?: string; pop?: string };
  captionStyle?: CaptionStyle;
};

const ShotView: React.FC<{ shot: Shot }> = ({ shot }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = Math.max(1, Math.round((shot.toSec - shot.fromSec) * fps));
  const [z0, z1] = shot.zoom ?? [1.05, 1.15];
  const [p0, p1] = shot.pan ?? [0, 0];
  const z = interpolate(frame, [0, len], [z0, z1], { extrapolateRight: "clamp" });
  const p = interpolate(frame, [0, len], [p0, p1], { extrapolateRight: "clamp" });
  const whip = shot.enter === "whip" ? interpolate(frame, [0, 6], [1, 0], { extrapolateRight: "clamp" }) : 0;
  const flash = shot.enter === "flash" ? interpolate(frame, [0, 7], [0.9, 0], { extrapolateRight: "clamp" }) : 0;
  const style: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: shot.objectPosition ?? "50% 50%",
  };
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translateX(${whip * 60 + (shot.panX ?? 0)}%) translateY(${p}%) scale(${z})`,
          transformOrigin: shot.origin ?? "50% 50%",
          filter: `contrast(1.08) saturate(1.15) brightness(${shot.bright ?? 1.04}) blur(${whip * 18 + (shot.blur ?? 0)}px)`,
        }}
      >
        {shot.kind === "video" ? (
          <Video objectFit="cover" src={staticFile(shot.src)} trimBefore={Math.round((shot.trimSec ?? 0) * fps)} muted style={style} />
        ) : (
          <Img src={staticFile(shot.src)} style={style} />
        )}
      </AbsoluteFill>
      {shot.ring && (
        <div
          style={{
            position: "absolute",
            left: shot.ring[0] - shot.ring[2],
            top: shot.ring[1] - shot.ring[2],
            width: shot.ring[2] * 2,
            height: shot.ring[2] * 2,
            borderRadius: "50%",
            border: "10px solid #FFD400",
            boxShadow: "0 0 30px rgba(255,212,0,.8)",
            transform: `scale(${spring({ frame, fps, config: { damping: 9 } }) * (1 + Math.sin(frame / 3) * 0.06)})`,
          }}
        />
      )}
      {flash > 0 && <AbsoluteFill style={{ background: "#fff", opacity: flash }} />}
    </AbsoluteFill>
  );
};

const pop = (frame: number, fps: number) => spring({ frame, fps, config: { damping: 11, stiffness: 200 } });

export const LocationPin: React.FC<{ text: string; icon?: "pin" | "area" | "none"; top?: number }> = ({
  text,
  icon = "pin",
  top = 340,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = pop(frame, fps);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: top }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          background: "#fff",
          borderRadius: 999,
          padding: "18px 40px 18px 22px",
          boxShadow: "0 14px 40px rgba(0,0,0,.35)",
          transform: `scale(${s}) rotate(${(1 - s) * -8}deg)`,
          fontFamily: captionFont,
          fontWeight: 800,
          fontSize: 54,
          color: "#111",
        }}
      >
        {icon === "pin" && (
          <svg width={64} height={64} viewBox="0 0 24 24">
            <path d="M12 2C8 2 5 5 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-4-3-7-7-7z" fill="#E53935" />
            <circle cx={12} cy={9} r={2.7} fill="#fff" />
          </svg>
        )}
        {icon === "area" && (
          <svg width={64} height={64} viewBox="0 0 24 24">
            <rect x={3} y={3} width={18} height={18} rx={2} fill="none" stroke="#1E88E5" strokeWidth={2.4} />
            <path d="M7 17 L17 7 M13 7h4v4 M7 13v4h4" fill="none" stroke="#1E88E5" strokeWidth={2.2} strokeLinecap="round" />
          </svg>
        )}
        {text}
      </div>
    </AbsoluteFill>
  );
};

export const PriceCard: React.FC<{ title: string; price: string; unit: string; sub?: string }> = ({ title, price, unit, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = pop(frame, fps);
  const shine = interpolate(frame, [8, 26], [-120, 220], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: `rgba(0,0,0,${0.45 * Math.min(1, s)})` }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          width: 820,
          padding: "40px 0 46px",
          borderRadius: 40,
          background: "linear-gradient(160deg,#FFE259,#FFA751)",
          border: "8px solid #111",
          boxShadow: "0 24px 60px rgba(0,0,0,.5)",
          textAlign: "center",
          transform: `scale(${0.4 + 0.6 * s}) rotate(${(1 - s) * 10 - 2}deg)`,
          color: "#111",
        }}
      >
        <div style={{ fontFamily: titleFont, fontSize: 70, letterSpacing: 6 }}>{title}</div>
        <div style={{ fontFamily: titleFont, fontSize: 190, lineHeight: 1 }}>{price}</div>
        <div style={{ fontFamily: captionFont, fontWeight: 800, fontSize: 60 }}>{unit}</div>
        {sub && (
          <div style={{ marginTop: 10, display: "inline-block", background: "#111", color: "#FFD400", fontFamily: captionFont, fontWeight: 800, fontSize: 46, borderRadius: 999, padding: "8px 28px" }}>{sub}</div>
        )}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${shine}%`,
            width: 120,
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,.7),transparent)",
            transform: "skewX(-20deg)",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const Badge: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = pop(frame, fps);
  return (
    <div
      style={{
        position: "absolute",
        top: 230,
        left: 0,
        background: "#E53935",
        color: "#fff",
        fontFamily: titleFont,
        fontSize: 52,
        letterSpacing: 3,
        padding: "12px 34px 12px 40px",
        borderRadius: "0 20px 20px 0",
        boxShadow: "0 8px 24px rgba(0,0,0,.4)",
        transform: `translateX(${(s - 1) * 100}%)`,
      }}
    >
      {text}
    </div>
  );
};

export const CtaCard: React.FC<{ line: string; phone: string; footer?: string }> = ({ line, phone, footer }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = pop(frame, fps);
  const pulse = 1 + Math.sin(frame / 5) * 0.025;
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 330 }}>
      <div
        style={{
          width: 900,
          borderRadius: 44,
          background: "#fff",
          border: "8px solid #111",
          boxShadow: "0 24px 60px rgba(0,0,0,.5)",
          padding: "36px 30px 44px",
          textAlign: "center",
          transform: `translateY(${(1 - s) * 300}px) scale(${pulse})`,
          opacity: Math.min(1, s * 1.5),
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", gap: 26, marginBottom: 14 }}>
          {/* call icon */}
          <div style={{ width: 96, height: 96, borderRadius: 999, background: "#1E88E5", display: "grid", placeItems: "center" }}>
            <svg width={56} height={56} viewBox="0 0 24 24">
              <path
                fill="#fff"
                d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"
              />
            </svg>
          </div>
          {/* chat icon */}
          <div style={{ width: 96, height: 96, borderRadius: 999, background: "#25D366", display: "grid", placeItems: "center" }}>
            <svg width={58} height={58} viewBox="0 0 24 24">
              <path fill="#fff" d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z" />
              <path
                fill="#25D366"
                d="M9.2 7.6c.2 0 .4 0 .5.4l.7 1.6c0 .2 0 .4-.1.5l-.5.6c-.1.1-.2.3 0 .5.6 1 1.4 1.8 2.5 2.4.2.1.4.1.5 0l.6-.7c.2-.2.3-.2.5-.1l1.6.8c.2.1.3.2.3.4 0 .9-.6 1.6-1.5 1.8-2.6.5-6.6-3.3-6.3-6 .1-.9.7-1.4 1.2-1.4z"
              />
            </svg>
          </div>
        </div>
        <div style={{ fontFamily: captionFont, fontWeight: 800, fontSize: 56, color: "#111" }}>{line}</div>
        <div style={{ fontFamily: titleFont, fontSize: 150, lineHeight: 1.05, color: "#111", letterSpacing: 2 }}>{phone}</div>
        {footer && (
          <div
            style={{
              marginTop: 14,
              display: "inline-block",
              background: "#111",
              color: "#FFD400",
              fontFamily: captionFont,
              fontWeight: 800,
              fontSize: 44,
              borderRadius: 999,
              padding: "10px 30px",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

/** Walkthrough of a place/product (shop, office, venue, product) narrated by a 2D character. */
export const ShowcaseReel: React.FC<ShowcaseReelProps> = (p) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const f = (sec: number) => Math.round(sec * fps);
  const voiceSrc = staticFile(p.voice);
  // captions start after the hook title (no doubled text) and stop before the number read-out
  const caps = p.captions.filter(
    (c) => c.startMs >= p.hookUntilSec * 1000 - 50 && (!p.captionsUntilMs || c.startMs < p.captionsUntilMs),
  );
  const inCta = frame >= f(p.ctaAtSec);
  // character grows + moves up when the CTA starts
  const ctaT = spring({ frame: frame - f(p.ctaAtSec), fps, config: { damping: 14 } });
  const charScale = interpolate(ctaT, [0, 1], [0.42, 0.62]);
  const charX = interpolate(ctaT, [0, 1], [220, 300]);

  return (
    <AbsoluteFill style={{ background: "#111" }}>
      {p.shots.map((s, i) => (
        <Sequence key={i} from={f(s.fromSec)} durationInFrames={Math.max(1, f(s.toSec) - f(s.fromSec))} name={`Shot ${i + 1}`}>
          <ShotView shot={s} />
        </Sequence>
      ))}
      <FilmLook grain={0.03} vignette={inCta ? 0.7 : 0.35} />

      {p.badge && (
        <Sequence from={f(p.hookUntilSec)} name="Badge">
          <Badge text={p.badge} />
        </Sequence>
      )}
      <Sequence
        from={f(p.locationAtSec)}
        durationInFrames={f((p.locationUntilSec ?? p.priceAtSec) - p.locationAtSec)}
        name="Location"
      >
        <LocationPin text={p.location} />
      </Sequence>
      {(p.stickers ?? []).map((st, i) => (
        <Sequence key={`st${i}`} from={f(st.atSec)} durationInFrames={Math.max(1, f(st.untilSec - st.atSec))} name={`Sticker ${st.text}`}>
          <LocationPin text={st.text} icon={st.icon ?? "none"} top={st.top ?? 340} />
        </Sequence>
      ))}

      {!inCta && <ReelCaptions captions={caps} style={{ bottom: 720, ...p.captionStyle }} />}

      <Sequence from={f(p.priceAtSec)} durationInFrames={f(p.priceUntilSec - p.priceAtSec)} name="Price">
        <PriceCard title={p.priceTitle} price={p.price} unit={p.priceUnit} />
      </Sequence>
      <Sequence from={f(p.ctaAtSec)} name="CTA">
        <CtaCard line={p.ctaLine} phone={p.phone} footer={p.ctaFooter} />
      </Sequence>

      <Character2D audioSrc={voiceSrc} look={p.look} scale={charScale} x={charX} y={1935} />

      <Sequence durationInFrames={f(p.hookUntilSec)} name="Hook">
        <HookTitle text={p.hook} top={300} />
      </Sequence>
      <ProgressBar color="#FFD400" />

      <Audio src={voiceSrc} />
      {p.sfx?.whoosh &&
        p.shots.slice(1).map((s, i) => (
          <Sequence key={`w${i}`} from={Math.max(0, f(s.fromSec) - 4)} durationInFrames={20} layout="none">
            <Audio src={staticFile(p.sfx!.whoosh!)} volume={0.35} />
          </Sequence>
        ))}
      {p.sfx?.pop &&
        [p.locationAtSec, p.priceAtSec, p.ctaAtSec, p.hookUntilSec].map((t, i) => (
          <Sequence key={`p${i}`} from={f(t)} durationInFrames={15} layout="none">
            <Audio src={staticFile(p.sfx!.pop!)} volume={0.6} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};
