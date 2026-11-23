import { Player } from "@remotion/player";
import React, { useMemo, useState } from "react";
import { SkitReel } from "@engine/compositions/SkitReel";
import { demoSkit } from "@engine/skit/demo.js";
import streetChef from "../../examples/street-chef.json";
import quizShow from "../../examples/quiz-show.json";
import liarTown from "../../examples/liar-town.json";
import mindReader from "../../examples/mind-reader-class.json";
import { previewProps } from "./preview.js";
import { Studio } from "./Studio.jsx";

const REPO = "https://github.com/Somesh-Thakur/toonreel";

export function App() {
  const [heroMode, setHeroMode] = useState("3d");
  const heroProps = useMemo(() => previewProps(heroMode === "3d" ? liarTown : demoSkit), [heroMode]);
  return (
    <>
      <header className="top">
        <a className="logo" href="#top" aria-label="ToonReel home">
          <span className="logo__face" aria-hidden="true">
            <i /> <i />
          </span>
          ToonReel
        </a>
        <nav className="nav" aria-label="Main">
          <a href="#examples">Examples</a>
          <a href="#studio">Studio</a>
          <a href="#install">Install</a>
          <a className="btn btn--ghost" href={REPO} target="_blank" rel="noopener">
            GitHub
          </a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero__copy">
            <h1>Write a skit. Get a cartoon reel.</h1>
            <p className="lead">
              ToonReel is a free, open-source skill for AI agents like Claude Code. Describe a story, and it renders a 1080×1920 reel with lip-synced 3D toy characters or flat 2D cartoons, free voices in 400+ languages, word-by-word captions, crowds, quizzes and a call to action.
            </p>
            <div className="ctas">
              <a className="btn btn--yellow" href="#studio">
                Try the studio
              </a>
              <a className="btn" href="#install">
                Install the skill
              </a>
            </div>
            <ul className="facts">
              <li>No subscriptions, no watermark</li>
              <li>Runs on your own computer</li>
              <li>3D blocky story shorts and 2D skits</li>
              <li>Hindi, English and Hinglish voices built in</li>
            </ul>
          </div>
          <div className="phone" aria-label="Live preview of a ToonReel skit">
            <div className="hero__switch" role="group" aria-label="Preview style">
              {[["3d", "3D"], ["2d", "2D"]].map(([k, l]) => (
                <button key={k} type="button" aria-pressed={heroMode === k} onClick={() => setHeroMode(k)}>
                  {l}
                </button>
              ))}
            </div>
            <Player
              key={heroMode}
              component={SkitReel}
              inputProps={heroProps}
              durationInFrames={Math.ceil(heroProps.durationSec * 30)}
              compositionWidth={1080}
              compositionHeight={1920}
              fps={30}
              autoPlay
              loop
              acknowledgeRemotionLicense
              style={{ width: "100%", height: "100%" }}
            />
            <p className="phone__note">Live in your browser: this is the real engine, playing silently.</p>
          </div>
        </section>

        <section className="examples" id="examples">
          <h2>Made with ToonReel</h2>
          <p className="section-lead">Every reel below was rendered from a single JSON file, with real voices and sound effects. Tap to play with sound.</p>
          <div className="examples__row">
            {[
              { src: "media/liar-town.mp4", poster: "media/liar-town.jpg", title: "In this town, lies shrink you", spec: liarTown, lang: "3D, English" },
              { src: "media/mind-reader-class.mp4", poster: "media/mind-reader-class.jpg", title: "The mind-reading teacher", spec: mindReader, lang: "3D, Indian English" },
              { src: "media/street-chef.mp4", poster: "media/street-chef.jpg", title: "Street chef in the rain", spec: streetChef, lang: "2D, English" },
              { src: "media/quiz-show.mp4", poster: "media/quiz-show.jpg", title: "Game-show quiz", spec: quizShow, lang: "2D, Hinglish" },
            ].map((ex) => (
              <figure className="example" key={ex.src}>
                <video src={ex.src} poster={ex.poster} controls playsInline preload="none" />
                <figcaption>
                  <strong>{ex.title}</strong>
                  <span>
                    {ex.lang}, {ex.spec.beats.length} beats
                  </span>
                </figcaption>
              </figure>
            ))}
            <div className="example example--how">
              <h3>What's in a reel</h3>
              <ul>
                <li>3D blocky toy characters that walk, dance, shrink, grow and vanish, with orbiting, low-angle and top-down cameras</li>
                <li>Original flat-2D characters: suits, chefs, kurtas, hoodies, caps, buns</li>
                <li>Lip-sync driven by the real voice track</li>
                <li>3D sets: town street, classroom, bedroom, by day or night. 2D sets: shop, food cart, game show, station, living room</li>
                <li>A narrator voice for "In this town…" story shorts</li>
                <li>Crowds that chatter and cheer, rain, confetti, speech bubbles</li>
                <li>Your footage or photos on a "live tour" screen</li>
                <li>Price cards, stickers, quiz boards and a final call to action</li>
              </ul>
            </div>
          </div>
        </section>

        <Studio
          examples={{
            "In this town (3D)": liarTown,
            "Mind-reading teacher (3D)": mindReader,
            "Street chef (2D, English)": streetChef,
            "Quiz show (2D, Hinglish)": quizShow,
            "Blank skit (2D)": blankSkit(),
          }}
        />

        <section className="install" id="install">
          <h2>Install the skill</h2>
          <p className="section-lead">You need Python 3.10+, Node 18+ and ffmpeg. Everything else installs itself.</p>
          <div className="install__grid">
            <div className="step">
              <h3>Claude Code</h3>
              <pre>
                <code>{`git clone ${REPO} ~/.claude/skills/toonreel\ncd ~/.claude/skills/toonreel\nbash setup.sh        # Windows: .\\setup.ps1`}</code>
              </pre>
              <p>Then ask: “Make a 40-second cartoon reel about…”</p>
            </div>
            <div className="step">
              <h3>Any agent (skills CLI)</h3>
              <pre>
                <code>{`npx skills add Somesh-Thakur/toonreel`}</code>
              </pre>
              <p>Works with Codex, Gemini CLI, Cursor, Copilot and others that read SKILL.md or AGENTS.md.</p>
            </div>
            <div className="step">
              <h3>Without an agent</h3>
              <pre>
                <code>{`node tools/skit.mjs my-reel.json --check\nnode tools/skit.mjs my-reel.json`}</code>
              </pre>
              <p>Export a skit from the studio above, then render it yourself.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <p>
          ToonReel is MIT-licensed. Built by <a href="https://someshthakur.tech/">Somesh Thakur</a>. Rendering uses <a href="https://remotion.dev">Remotion</a> (free for individuals and small teams) and free Edge neural voices.
        </p>
        <a href={REPO} target="_blank" rel="noopener">
          Star it on GitHub
        </a>
      </footer>
    </>
  );
}

function blankSkit() {
  return {
    name: "my-reel",
    world: "home",
    hook: { text: "Your *hook* here" },
    tour: { layout: "tall" },
    cast: [
      { id: "host", voice: "en-US-AndrewNeural", rate: "+10%", look: { style: "suit", hat: "none", glasses: true, mustache: false, outfit: "#1F3A5F" } },
      { id: "friend", voice: "en-US-AvaNeural", rate: "+8%", color: "#FF7CC3", look: { style: "kurti", hat: "none", hairStyle: "long", female: true, mustache: false, outfit: "#00897B" } },
    ],
    beats: [
      { say: "friend", text: "I have a problem nobody can solve!", scene: "closeup:friend" },
      { enter: "host", scene: "wide" },
      { say: "host", text: "Relax, I've got the answer right here." },
      { dive: 0.6 },
      { say: "host", text: "Here's what makes it special.", scene: "tour", shot: { title: "Feature one" }, sticker: "Feature one" },
      { say: "friend", text: "Wow, that's perfect!", pose: { friend: { cheer: true, jump: 40 } }, confetti: true },
      { say: "host", text: "Follow for more!", cta: { line: "Follow us", value: "@yourhandle" } },
    ],
  };
}
