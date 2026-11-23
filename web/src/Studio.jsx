import { Player } from "@remotion/player";
import React, { useEffect, useMemo, useState } from "react";
import { SkitReel } from "@engine/compositions/SkitReel";
import { previewProps } from "./preview.js";

const VOICES = [
  "en-US-AndrewNeural", "en-US-AvaNeural", "en-US-BrianNeural", "en-US-EmmaNeural", "en-GB-RyanNeural", "en-GB-SoniaNeural",
  "en-IN-PrabhatNeural", "en-IN-NeerjaNeural", "hi-IN-MadhurNeural", "hi-IN-SwaraNeural", "mr-IN-ManoharNeural", "mr-IN-AarohiNeural",
  "ta-IN-ValluvarNeural", "te-IN-MohanNeural", "bn-IN-BashkarNeural", "gu-IN-NiranjanNeural", "es-ES-AlvaroNeural", "fr-FR-HenriNeural",
  "de-DE-ConradNeural", "ar-SA-HamedNeural", "pt-BR-AntonioNeural", "ja-JP-KeitaNeural",
];
const WORLDS = {
  town: "3D · Town street",
  classroom: "3D · Classroom",
  bedroom: "3D · Bedroom",
  home: "2D · Living room",
  station: "2D · Railway station",
  cart: "2D · Food cart",
  studio: "2D · Game-show studio",
  shop: "2D · Shop with shutter",
};
const IS3D = (w) => ["town", "classroom", "bedroom"].includes(w);
const BEAT_TYPES = { say: "Line of dialogue", pause: "Pause", enter: "Magic entrance", exit: "Vanish (3D)", move: "Walk (3D)", dive: "Camera dive", shutter: "Shutter opens" };
const ACTS = ["", "cheer", "dance", "wave", "point", "shock", "sad", "angry", "spin", "sit", "lie"];
const STYLES = ["suit", "kurti", "chef", "hoodie", "uniform"];
const HATS = ["none", "cap", "beret", "helmet", "chef"];
const HAIR = ["short", "long", "bun"];

const typeOf = (b) => Object.keys(BEAT_TYPES).find((k) => k in b) || "say";
const clone = (o) => JSON.parse(JSON.stringify(o));

export function Studio({ examples }) {
  const names = Object.keys(examples);
  const [spec, setSpec] = useState(() => clone(examples[names[0]]));
  const [json, setJson] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [tab, setTab] = useState("beats");
  const [copied, setCopied] = useState("");

  useEffect(() => setJson(JSON.stringify(spec, null, 2)), [spec]);
  const props = useMemo(() => {
    try {
      return previewProps(spec);
    } catch (e) {
      return null;
    }
  }, [spec]);

  const update = (fn) => setSpec((s) => {
    const n = clone(s);
    fn(n);
    return n;
  });
  const actors = spec.cast.filter((c) => !c.narrator);
  const sceneOptions = IS3D(spec.world)
    ? ["wide", "close", "orbit", "top", "low", ...actors.flatMap((c) => [`closeup:${c.id}`, `close:${c.id}`, `low:${c.id}`]), "dive", "tour"]
    : ["wide", "close", ...actors.map((c) => `closeup:${c.id}`), "tour", "cta"];

  const download = () => {
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${spec.name || "my-reel"}.json` });
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const copy = async (text, what) => {
    await navigator.clipboard?.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(""), 1600);
  };
  const cmd = `node tools/skit.mjs ${spec.name || "my-reel"}.json`;

  return (
    <section className="studio" id="studio">
      <div className="studio__head">
        <h2>Studio</h2>
        <p className="section-lead">Build a skit here and watch it play. The preview is silent with estimated timing; your render adds real voices, sound effects and exact lip-sync.</p>
        <div className="studio__bar">
          <label className="field field--inline">
            <span>Start from</span>
            <select onChange={(e) => setSpec(clone(examples[e.target.value]))} defaultValue={names[0]}>
              {names.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <button className="btn btn--yellow" type="button" onClick={download}>
            Download skit.json
          </button>
          <button className="btn" type="button" onClick={() => copy(cmd, "cmd")}>
            {copied === "cmd" ? "Copied" : "Copy render command"}
          </button>
          <button className="btn" type="button" onClick={() => copy(`Make this skit into a reel with the toonreel skill:\n\n${JSON.stringify(spec, null, 2)}`, "ai")}>
            {copied === "ai" ? "Copied" : "Copy prompt for your AI"}
          </button>
        </div>
      </div>

      <div className="studio__grid">
        <div className="editor">
          <div className="tabs" role="tablist">
            {[["beats", "Beats"], ["cast", "Cast"], ["set", "Set & hook"], ["json", "JSON"]].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)}>
                {l}
              </button>
            ))}
          </div>

          {tab === "set" && (
            <div className="panel">
              <label className="field">
                <span>File name</span>
                <input value={spec.name || ""} onChange={(e) => update((s) => (s.name = e.target.value.replace(/[^\w-]/g, "-")))} />
              </label>
              <label className="field">
                <span>Opening set</span>
                <select value={spec.world} onChange={(e) => update((s) => (s.world = e.target.value))}>
                  {Object.entries(WORLDS).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              {spec.world === "station" && <TextField label="Station board" value={spec.world_options?.board} onChange={(v) => update((s) => ((s.world_options ||= {}).board = v))} />}
              {spec.world === "station" && <TextField label="Banner on the building" value={spec.world_options?.banner} onChange={(v) => update((s) => ((s.world_options ||= {}).banner = v))} />}
              {spec.world === "cart" && <TextField label="Cart label" value={spec.world_options?.cartLabel} onChange={(v) => update((s) => ((s.world_options ||= {}).cartLabel = v))} />}
              {spec.world === "studio" && <TextField label="Studio sign" value={spec.world_options?.sign} onChange={(v) => update((s) => ((s.world_options ||= {}).sign = v))} />}
              {spec.world === "town" && <TextField label="Shop sign" value={spec.world_options?.sign} onChange={(v) => update((s) => ((s.world_options ||= {}).sign = v))} />}
              {spec.world === "classroom" && <TextField label="Chalkboard (use / for a new line)" value={(spec.world_options?.board || "").replace(/\n/g, " / ")} onChange={(v) => update((s) => ((s.world_options ||= {}).board = v.split(/\s*\/\s*/).join("\n")))} />}
              {spec.world === "bedroom" && <TextField label="Poster" value={spec.world_options?.poster} onChange={(v) => update((s) => ((s.world_options ||= {}).poster = v))} />}
              {IS3D(spec.world) && <Check label="Night time" value={!!spec.world_options?.night} onChange={(v) => update((s) => ((s.world_options ||= {}).night = v))} />}
              {spec.world === "shop" && <TextField label="Shop sign" value={spec.world_options?.shopSign1} onChange={(v) => update((s) => ((s.world_options ||= {}).shopSign1 = v))} />}
              <TextField label="Hook (put *one word* in stars for yellow)" value={spec.hook?.text ?? spec.hook ?? ""} onChange={(v) => update((s) => (s.hook = { ...(typeof s.hook === "object" ? s.hook : {}), text: v }))} />
              <label className="field">
                <span>Footage shape on the tour screen</span>
                <select value={spec.tour?.layout || "tall"} onChange={(e) => update((s) => (s.tour = { ...(s.tour || {}), layout: e.target.value }))}>
                  <option value="tall">Vertical (phone video)</option>
                  <option value="photo">Photo (4:3)</option>
                  <option value="wide">Wide (16:9)</option>
                </select>
              </label>
            </div>
          )}

          {tab === "cast" && (
            <div className="panel">
              {spec.cast.map((c, i) => (
                <fieldset className="card" key={i}>
                  <legend>{c.narrator ? "Narrator (voice only)" : `Character ${i + 1}`}</legend>
                  <Check label="Narrator: a voice with captions, never drawn" value={!!c.narrator} onChange={(v) => update((s) => (v ? (s.cast[i].narrator = true) : delete s.cast[i].narrator))} />
                  <div className="row">
                    <TextField label="Name (id)" value={c.id} onChange={(v) => update((s) => renameCast(s, i, v))} />
                    <label className="field">
                      <span>Voice</span>
                      <input list="voices" value={c.voice} onChange={(e) => update((s) => (s.cast[i].voice = e.target.value))} />
                    </label>
                  </div>
                  <div className="row">
                    <TextField label="Speed (e.g. +10%)" value={c.rate || ""} onChange={(v) => update((s) => (s.cast[i].rate = v))} />
                    <TextField label="Pitch (e.g. -15Hz)" value={c.pitch || ""} onChange={(v) => update((s) => (s.cast[i].pitch = v))} />
                  </div>
                  <div className="row">
                    <Select label="Outfit" value={c.look?.style || "suit"} options={STYLES} onChange={(v) => update((s) => ((s.cast[i].look ||= {}).style = v))} />
                    <Select label="Hat" value={c.look?.hat || "none"} options={HATS} onChange={(v) => update((s) => ((s.cast[i].look ||= {}).hat = v))} />
                    <Select label="Hair" value={c.look?.hairStyle || "short"} options={HAIR} onChange={(v) => update((s) => ((s.cast[i].look ||= {}).hairStyle = v))} />
                  </div>
                  <div className="row row--checks">
                    <Check label="Female features" value={!!c.look?.female} onChange={(v) => update((s) => ((s.cast[i].look ||= {}).female = v))} />
                    <Check label="Glasses" value={!!c.look?.glasses} onChange={(v) => update((s) => ((s.cast[i].look ||= {}).glasses = v))} />
                    <Check label="Mustache" value={c.look?.mustache !== false} onChange={(v) => update((s) => ((s.cast[i].look ||= {}).mustache = v))} />
                    <label className="field field--color">
                      <span>Outfit colour</span>
                      <input type="color" value={c.look?.outfit || "#1F3A5F"} onChange={(e) => update((s) => ((s.cast[i].look ||= {}).outfit = e.target.value))} />
                    </label>
                    <label className="field field--color">
                      <span>Skin</span>
                      <input type="color" value={c.look?.skin || "#E8B48A"} onChange={(e) => update((s) => ((s.cast[i].look ||= {}).skin = e.target.value))} />
                    </label>
                  </div>
                  {spec.cast.length > 1 && (
                    <button className="link" type="button" onClick={() => update((s) => s.cast.splice(i, 1))}>
                      Remove character
                    </button>
                  )}
                </fieldset>
              ))}
              {actors.length < 3 && (
                <button className="btn" type="button" onClick={() => update((s) => s.cast.push({ id: `char${s.cast.length + 1}`, voice: "en-US-AvaNeural", look: { style: "hoodie", hat: "cap" } }))}>
                  Add a character
                </button>
              )}
              <datalist id="voices">
                {VOICES.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
          )}

          {tab === "beats" && (
            <ol className="beats">
              {spec.beats.map((b, i) => (
                <li className="beat" key={i}>
                  <div className="beat__top">
                    <span className="beat__n">{i + 1}</span>
                    <select value={typeOf(b)} aria-label="Beat type" onChange={(e) => update((s) => (s.beats[i] = changeType(s.beats[i], e.target.value, s.cast)))}>
                      {Object.entries(BEAT_TYPES).map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </select>
                    {["enter", "exit"].includes(typeOf(b)) && (
                      <select value={b[typeOf(b)]} aria-label="Who" onChange={(e) => update((s) => (s.beats[i][typeOf(b)] = e.target.value))}>
                        {actors.map((c) => (
                          <option key={c.id}>{c.id}</option>
                        ))}
                      </select>
                    )}
                    {typeOf(b) === "say" && (
                      <select value={b.say} aria-label="Who speaks" onChange={(e) => update((s) => (s.beats[i].say = e.target.value))}>
                        {spec.cast.map((c) => (
                          <option key={c.id}>{c.id}</option>
                        ))}
                      </select>
                    )}
                    <select value={b.scene || ""} aria-label="Scene" onChange={(e) => update((s) => (e.target.value ? (s.beats[i].scene = e.target.value) : delete s.beats[i].scene))}>
                      <option value="">same scene</option>
                      {sceneOptions.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                    <div className="beat__tools">
                      <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => update((s) => s.beats.splice(i - 1, 0, s.beats.splice(i, 1)[0]))}>
                        ↑
                      </button>
                      <button type="button" aria-label="Move down" disabled={i === spec.beats.length - 1} onClick={() => update((s) => s.beats.splice(i + 1, 0, s.beats.splice(i, 1)[0]))}>
                        ↓
                      </button>
                      <button type="button" aria-label="Delete beat" onClick={() => update((s) => s.beats.splice(i, 1))}>
                        ×
                      </button>
                    </div>
                  </div>
                  {typeOf(b) === "say" && <textarea rows={2} value={b.text || ""} placeholder="What they say" onChange={(e) => update((s) => (s.beats[i].text = e.target.value))} />}
                  {typeOf(b) === "move" && (() => {
                    const [id, to] = Object.entries(b.move)[0] || [actors[0]?.id, [0, 0]];
                    const xz = Array.isArray(to) ? to : to.to;
                    const set = (nid, nxz) => update((s) => (s.beats[i].move = { [nid]: nxz }));
                    return (
                      <div className="row">
                        <Select label="Who walks" value={id} options={actors.map((c) => c.id)} onChange={(v) => set(v, xz)} />
                        <NumberField label="To x (−8 … 8)" value={xz[0]} min={-12} onChange={(v) => set(id, [v, xz[1]])} />
                        <NumberField label="To z (−4 … 4)" value={xz[1]} min={-8} onChange={(v) => set(id, [xz[0], v])} />
                        <NumberField label="Seconds" value={b.walk ?? 1.4} onChange={(v) => update((s) => (s.beats[i].walk = v))} />
                      </div>
                    );
                  })()}
                  {typeOf(b) === "pause" && <NumberField label="Seconds" value={b.pause} onChange={(v) => update((s) => (s.beats[i].pause = v))} />}
                  <details className="beat__more">
                    <summary>Extras</summary>
                    <div className="row">
                      <TextField label="Screen title card" value={b.shot?.title || ""} onChange={(v) => update((s) => (v ? (s.beats[i].shot = { title: v }) : delete s.beats[i].shot))} />
                      <TextField label="Sticker" value={typeof b.sticker === "string" ? b.sticker : b.sticker?.text || ""} onChange={(v) => update((s) => (v ? (s.beats[i].sticker = v) : delete s.beats[i].sticker))} />
                    </div>
                    <div className="row">
                      <TextField label="Card value (e.g. ₹65,000)" value={b.card?.value || ""} onChange={(v) => update((s) => (v ? (s.beats[i].card = { ...(s.beats[i].card || { title: "PRICE", unit: "" }), value: v }) : delete s.beats[i].card))} />
                      <TextField label="Card title" value={b.card?.title || ""} onChange={(v) => update((s) => s.beats[i].card && (s.beats[i].card.title = v))} />
                    </div>
                    <div className="row">
                      <TextField label="CTA big line (ends the reel)" value={b.cta?.value || ""} onChange={(v) => update((s) => (v ? (s.beats[i].cta = { ...(s.beats[i].cta || { line: "Follow us" }), value: v }) : delete s.beats[i].cta))} />
                      <TextField label="CTA small line" value={b.cta?.line || ""} onChange={(v) => update((s) => s.beats[i].cta && (s.beats[i].cta.line = v))} />
                    </div>
                    <div className="row row--checks">
                      <Select label="Crowd" value={b.crowd || ""} options={["", "calm", "excited", "cheer"]} onChange={(v) => update((s) => (v ? (s.beats[i].crowd = v) : delete s.beats[i].crowd))} />
                      <Select label="Rain" value={b.rain === undefined ? "" : String(b.rain)} options={["", "true", "false"]} onChange={(v) => update((s) => (v ? (s.beats[i].rain = v === "true") : delete s.beats[i].rain))} />
                      <Check label="Confetti" value={!!b.confetti} onChange={(v) => update((s) => (v ? (s.beats[i].confetti = true) : delete s.beats[i].confetti))} />
                      <Select label="Speaker acts" value={(b.say && Object.keys(b.pose?.[b.say] || {}).find((k) => ACTS.includes(k))) || ""} options={IS3D(spec.world) ? ACTS : ["", "cheer"]} onChange={(v) => update((s) => {
                        const id = s.beats[i].say;
                        if (!id) return;
                        s.beats[i].pose ||= {};
                        if (v) s.beats[i].pose[id] = v === "cheer" ? { cheer: true, jump: 40 } : { [v]: true };
                        else delete s.beats[i].pose[id];
                      })} />
                      {IS3D(spec.world) && b.say && (
                        <Select label="Speaker size" value={b.size?.[b.say] !== undefined ? String(b.size[b.say]) : ""} options={["", "0.4", "0.7", "1", "1.5", "2.2"]} onChange={(v) => update((s) => {
                          const id = s.beats[i].say;
                          if (v) (s.beats[i].size ||= {})[id] = parseFloat(v);
                          else delete s.beats[i].size;
                        })} />
                      )}
                    </div>
                  </details>
                </li>
              ))}
              <li className="beat beat--add">
                <button className="btn" type="button" onClick={() => update((s) => s.beats.push({ say: s.cast[0].id, text: "" }))}>
                  Add a line
                </button>
                <button className="btn" type="button" onClick={() => update((s) => s.beats.push({ pause: 0.8 }))}>
                  Add a pause
                </button>
                {IS3D(spec.world) && (
                  <button className="btn" type="button" onClick={() => update((s) => s.beats.push({ move: { [actors[0].id]: [0, 1] }, walk: 1.4 }))}>
                    Add a walk
                  </button>
                )}
              </li>
            </ol>
          )}

          {tab === "json" && (
            <div className="panel">
              <p className="hint">Full format, including quizzes, footage shots, bubbles and poses, is in SKILL.md. Edit and apply.</p>
              <textarea className="json" spellCheck={false} value={json} onChange={(e) => setJson(e.target.value)} />
              {jsonError && <p className="error">{jsonError}</p>}
              <button
                className="btn btn--yellow"
                type="button"
                onClick={() => {
                  try {
                    const parsed = JSON.parse(json);
                    if (!Array.isArray(parsed.beats) || !Array.isArray(parsed.cast)) throw new Error("A skit needs a cast list and a beats list.");
                    setSpec(parsed);
                    setJsonError("");
                  } catch (e) {
                    setJsonError(e.message);
                  }
                }}
              >
                Apply JSON
              </button>
            </div>
          )}
        </div>

        <div className="preview">
          <div className="phone phone--studio">
            {props ? (
              <Player
                key={JSON.stringify(props).length}
                component={SkitReel}
                inputProps={props}
                durationInFrames={Math.max(30, Math.ceil(props.durationSec * 30))}
                compositionWidth={1080}
                compositionHeight={1920}
                fps={30}
                controls
                loop
                acknowledgeRemotionLicense
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <p className="error">This skit can't be previewed yet. Check that every line has a speaker.</p>
            )}
          </div>
          {props && <p className="preview__meta">About {Math.round(props.durationSec)} seconds, {spec.beats.filter((b) => b.say).length} lines</p>}
        </div>
      </div>
    </section>
  );
}

function renameCast(s, i, v) {
  const old = s.cast[i].id;
  const id = v.replace(/[^\w-]/g, "");
  s.cast[i].id = id;
  for (const b of s.beats) {
    if (b.say === old) b.say = id;
    if (b.enter === old) b.enter = id;
    if (b.exit === old) b.exit = id;
    if (b.scene && b.scene.split(":")[1] === old) b.scene = `${b.scene.split(":")[0]}:${id}`;
    for (const k of ["pose", "move", "size", "face"]) {
      if (b[k]?.[old] !== undefined) {
        b[k][id] = b[k][old];
        delete b[k][old];
      }
    }
  }
}

function changeType(b, type, cast) {
  const keep = { scene: b.scene, crowd: b.crowd, rain: b.rain, sticker: b.sticker, shot: b.shot, card: b.card, cta: b.cta, confetti: b.confetti };
  Object.keys(keep).forEach((k) => keep[k] === undefined && delete keep[k]);
  if (type === "say") return { say: cast[0].id, text: "", ...keep };
  if (type === "pause") return { pause: 0.8, ...keep };
  const firstActor = (cast.find((c) => !c.narrator) || cast[0]).id;
  if (type === "enter") return { enter: firstActor, ...keep };
  if (type === "exit") return { exit: firstActor, ...keep };
  if (type === "move") return { move: { [firstActor]: [0, 1] }, walk: 1.4, ...keep };
  if (type === "dive") return { dive: 0.6 };
  return { shutter: 1.0, ...keep };
}

const TextField = ({ label, value, onChange }) => (
  <label className="field">
    <span>{label}</span>
    <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
  </label>
);
const NumberField = ({ label, value, onChange, min = 0.1 }) => (
  <label className="field field--small">
    <span>{label}</span>
    <input type="number" step="0.1" min={min} value={value ?? 0.8} onChange={(e) => onChange(Number.isFinite(parseFloat(e.target.value)) ? parseFloat(e.target.value) : 0)} />
  </label>
);
const Select = ({ label, value, options, onChange }) => (
  <label className="field">
    <span>{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o || "—"}
        </option>
      ))}
    </select>
  </label>
);
const Check = ({ label, value, onChange }) => (
  <label className="check">
    <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
    <span>{label}</span>
  </label>
);
