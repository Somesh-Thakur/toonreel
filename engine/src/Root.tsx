import React from "react";
import { CalculateMetadataFunction, Composition } from "remotion";
import { CaptionedReel, type CaptionedReelProps } from "./compositions/CaptionedReel";
import { CharacterReel, type CharacterReelProps } from "./compositions/CharacterReel";
import { Mascot } from "./compositions/Mascot";
import { ShowcaseReel, type ShowcaseReelProps } from "./compositions/ShowcaseReel";
import { SkitReel, type SkitReelProps } from "./compositions/SkitReel";
import { StoryReel, storyDurationSec, type StoryReelProps } from "./compositions/StoryReel";
// @ts-expect-error plain JS module shared with the CLI and the web studio
import { buildProps, estimateLine } from "./skit/core.js";
// @ts-expect-error plain JS module
import { demoSkit } from "./skit/demo.js";

const FPS = 30;
const W = 1080; // 9:16 vertical (Reels / Shorts / TikTok)
const H = 1920;

const byDuration: CalculateMetadataFunction<{ durationSec: number }> = ({ props }) => ({
  durationInFrames: Math.max(1, Math.ceil(props.durationSec * FPS)),
});
const byStory: CalculateMetadataFunction<StoryReelProps> = ({ props }) => ({
  durationInFrames: Math.max(1, Math.ceil(storyDurationSec(props.clips) * FPS)),
});

// a silent preview of the demo skit (mouths follow the captions); render real skits with tools/skit.mjs
const demoVoiced: Record<number, unknown> = {};
demoSkit.beats.forEach((b: { say?: string; text?: string }, i: number) => {
  if (b.say) demoVoiced[i] = estimateLine(b.text);
});
const demoProps = buildProps(demoSkit, demoVoiced).props as SkitReelProps;

const demoCaptions = [
  { text: " Every", startMs: 0, endMs: 400, timestampMs: 200, confidence: null },
  { text: " reel", startMs: 400, endMs: 800, timestampMs: 600, confidence: null },
  { text: " needs", startMs: 800, endMs: 1200, timestampMs: 1000, confidence: null },
  { text: " a", startMs: 1200, endMs: 1350, timestampMs: 1275, confidence: null },
  { text: " hook.", startMs: 1350, endMs: 2000, timestampMs: 1675, confidence: null },
];

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="SkitReel" component={SkitReel} fps={FPS} width={W} height={H} durationInFrames={600} calculateMetadata={byDuration} defaultProps={demoProps} />
    <Composition
      id="CharacterReel"
      component={CharacterReel}
      fps={FPS}
      width={W}
      height={H}
      durationInFrames={90}
      calculateMetadata={byDuration}
      defaultProps={{ voice: "demo/voice.mp3", captions: demoCaptions, durationSec: 3, hook: "2D *narrator*", scene: "sunset", look: { hat: "cap", style: "hoodie" }, particles: "none" } satisfies CharacterReelProps}
    />
    <Composition
      id="CaptionedReel"
      component={CaptionedReel}
      fps={FPS}
      width={W}
      height={H}
      durationInFrames={90}
      calculateMetadata={byDuration}
      defaultProps={{ video: "demo/clip.mp4", captions: demoCaptions, durationSec: 3, hook: "Your *footage*" } satisfies CaptionedReelProps}
    />
    <Composition
      id="StoryReel"
      component={StoryReel}
      fps={FPS}
      width={W}
      height={H}
      durationInFrames={90}
      calculateMetadata={byStory}
      defaultProps={{ clips: [{ src: "demo/clip.mp4", durationSec: 3, grade: "cold", text: "Day 1" }], durationSec: 3, letterbox: 140 } satisfies StoryReelProps}
    />
    <Composition
      id="ShowcaseReel"
      component={ShowcaseReel}
      fps={FPS}
      width={W}
      height={H}
      durationInFrames={90}
      calculateMetadata={byDuration}
      defaultProps={
        {
          voice: "demo/voice.mp3",
          captions: demoCaptions,
          durationSec: 3,
          shots: [{ src: "demo/clip.mp4", kind: "video", fromSec: 0, toSec: 3 }],
          hook: "Showcase *anything*",
          hookUntilSec: 1.5,
          badge: "NEW",
          location: "Your city",
          locationAtSec: 0.5,
          priceTitle: "PRICE",
          price: "₹999",
          priceUnit: "only",
          priceAtSec: 1.5,
          priceUntilSec: 2.5,
          ctaAtSec: 2.5,
          ctaLine: "Follow for more",
          phone: "@yourhandle",
          look: { style: "suit", hat: "none", glasses: true, mustache: false },
        } satisfies ShowcaseReelProps
      }
    />
    <Composition
      id="Mascot"
      component={Mascot}
      fps={FPS}
      width={W}
      height={H}
      durationInFrames={1}
      defaultProps={{ look: { style: "suit", hat: "none", glasses: true, mustache: false }, pose: { armAngle: -140 } }}
    />
  </>
);
