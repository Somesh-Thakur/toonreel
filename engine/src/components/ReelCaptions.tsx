import { createTikTokStyleCaptions, type Caption } from "@remotion/captions";
import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { captionFont } from "./fonts";

export type CaptionStyle = {
  /** color of the word being spoken */
  highlight?: string;
  color?: string;
  /** px from bottom of the 1920 frame. ~560 keeps clear of IG UI. */
  bottom?: number;
  fontSize?: number;
  uppercase?: boolean;
  /** how many ms of words to group into one on-screen "page" */
  groupMs?: number;
};

/** Hormozi / TikTok-style word-by-word captions with active-word pop. */
export const ReelCaptions: React.FC<{ captions: Caption[]; style?: CaptionStyle }> = ({
  captions,
  style = {},
}) => {
  const { fps } = useVideoConfig();
  const {
    highlight = "#FFD400",
    color = "#FFFFFF",
    bottom = 560,
    fontSize = 78,
    uppercase = true,
    groupMs = 900,
  } = style;

  const { pages } = useMemo(
    () => createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: groupMs, breakOnSilenceAfterMilliseconds: 500 }),
    [captions, groupMs],
  );

  return (
    <AbsoluteFill>
      {pages.map((page, i) => {
        const next = pages[i + 1];
        const from = Math.round((page.startMs / 1000) * fps);
        // never linger more than 300 ms after the page's last word (prevents overlap between speakers)
        const lastWordEnd = Math.max(...page.tokens.map((tk) => tk.toMs));
        const ownEnd = Math.min(page.startMs + page.durationMs, lastWordEnd) + 300;
        const endMs = next ? Math.min(next.startMs, ownEnd) : ownEnd + 100;
        const dur = Math.max(1, Math.round((endMs / 1000) * fps) - from);
        return (
          <Sequence key={i} from={from} durationInFrames={dur} layout="none" name={`cap ${page.text.slice(0, 18)}`}>
            <Page
              page={page}
              color={color}
              highlight={highlight}
              bottom={bottom}
              fontSize={fontSize}
              uppercase={uppercase}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const Page: React.FC<{
  page: ReturnType<typeof createTikTokStyleCaptions>["pages"][number];
  color: string;
  highlight: string;
  bottom: number;
  fontSize: number;
  uppercase: boolean;
}> = ({ page, color, highlight, bottom, fontSize, uppercase }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = page.startMs + (frame / fps) * 1000;
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 220 } });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: bottom }}>
      <div
        style={{
          width: 900,
          textAlign: "center",
          fontFamily: captionFont,
          fontWeight: 800,
          fontSize,
          lineHeight: 1.15,
          textTransform: uppercase ? "uppercase" : "none",
          transform: `scale(${0.85 + 0.15 * enter})`,
          WebkitTextStroke: "10px black",
          paintOrder: "stroke fill",
          textShadow: "0 8px 24px rgba(0,0,0,.55)",
        }}
      >
        {page.tokens.map((t, i) => {
          const active = nowMs >= t.fromMs && nowMs < t.toMs;
          return (
            <span
              key={i}
              style={{
                color: active ? highlight : color,
                display: "inline-block",
                margin: "0 0.16em",
                transform: active ? "scale(1.06) translateY(-4px)" : "none",
              }}
            >
              {t.text.trim()}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
