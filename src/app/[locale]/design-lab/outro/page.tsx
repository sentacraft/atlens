"use client";

// Design Lab · Outro — a clean, full-viewport end card for recording the
// closing frame of a demo video: the animated brand Iris alongside the
// "Atlens" wordmark + URL (+ optional tagline). Layout, gap, alignment, size,
// loop, aperture strip and light/dark are all tweakable from a bottom control
// bar that hides with the "h" key so the recording frame stays clean. The
// aperture strip is driven purely by the Iris config's `apertureStrip` flag
// (no viewport gating).

import { useEffect, useMemo, useState } from "react";
import Iris from "@/components/iris/Iris";
import { IRIS_HERO } from "@/config/iris-config";

const LOOP_MS = 2600;
const TAGLINE = "Find & compare Fujifilm lenses";

export default function OutroPage() {
  const [showStrip, setShowStrip] = useState(false);
  const [loop, setLoop] = useState(false);
  const [dark, setDark] = useState(false);
  const [vertical, setVertical] = useState(false);
  const [tagline, setTagline] = useState(false);
  const [topAlign, setTopAlign] = useState(false);
  const [size, setSize] = useState(100);
  const [gap, setGap] = useState(27);
  const [controls, setControls] = useState(true);
  const [replay, setReplay] = useState(0);

  // Stable config reference — Iris has config-dependent effects, so passing a
  // fresh object literal every render would loop ("Maximum update depth").
  const irisConfig = useMemo(() => ({ ...IRIS_HERO, apertureStrip: showStrip }), [showStrip]);

  // Re-mount the Iris to replay its onMount sweep.
  const triggerReplay = () => setReplay((r) => r + 1);

  // Auto-loop the open/close animation while recording.
  useEffect(() => {
    if (!loop) {
      return;
    }
    const id = setInterval(triggerReplay, LOOP_MS);
    return () => clearInterval(id);
  }, [loop]);

  // "h" toggles the control bar so the recording crop stays clean; space replays.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "h" || e.key === "H") {
        setControls((c) => !c);
      }
      if (e.key === " ") {
        e.preventDefault();
        triggerReplay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const align = vertical ? "items-center" : topAlign ? "items-start" : "items-center";

  return (
    <div
      className={`fixed inset-0 z-[100] grid place-items-center ${dark ? "bg-zinc-950" : "bg-white"}`}
    >
      {/* Recording frame */}
      <div
        className={`flex px-10 ${vertical ? "flex-col" : "flex-row"} ${align}`}
        style={{ gap }}
      >
        <div className="shrink-0" style={{ width: size }}>
          <Iris key={replay} config={irisConfig} size={size} />
        </div>

        <div className={`flex flex-col ${vertical ? "items-center text-center" : ""}`}>
          <span
            className={`font-heading text-6xl font-bold leading-none tracking-tight sm:text-7xl ${dark ? "text-zinc-50" : "text-zinc-900"}`}
          >
            Atlens
          </span>
          {tagline && (
            <span
              className={`mt-3 text-base tracking-wide ${dark ? "text-zinc-300" : "text-zinc-500"}`}
            >
              {TAGLINE}
            </span>
          )}
          <span
            className={`mt-2 text-lg tracking-wide ${dark ? "text-zinc-500" : "text-zinc-400"}`}
          >
            atlens.app
          </span>
        </div>
      </div>

      {/* Controls — press "h" to hide, space to replay */}
      {controls && (
        <div className="fixed bottom-5 left-1/2 flex max-w-[min(94vw,920px)] -translate-x-1/2 flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl border border-zinc-200 bg-white/95 px-5 py-3 text-sm text-zinc-700 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-200">
          <button
            type="button"
            onClick={triggerReplay}
            className="rounded-md px-2 py-1 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ↻ Replay
          </button>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
            Loop
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={showStrip} onChange={(e) => setShowStrip(e.target.checked)} />
            Aperture strip
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={vertical} onChange={(e) => setVertical(e.target.checked)} />
            Vertical
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={tagline} onChange={(e) => setTagline(e.target.checked)} />
            Tagline
          </label>
          <label className={`flex items-center gap-1.5 ${vertical ? "opacity-40" : ""}`}>
            <input
              type="checkbox"
              checked={topAlign}
              disabled={vertical}
              onChange={(e) => setTopAlign(e.target.checked)}
            />
            Top-align
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
            Dark
          </label>
          <label className="flex items-center gap-1.5">
            Size
            <input
              type="range"
              min={48}
              max={300}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
            <span className="w-9 text-right tabular-nums text-xs text-zinc-400">{size}</span>
          </label>
          <label className="flex items-center gap-1.5">
            Gap
            <input
              type="range"
              min={0}
              max={220}
              value={gap}
              onChange={(e) => setGap(Number(e.target.value))}
            />
            <span className="w-9 text-right tabular-nums text-xs text-zinc-400">{gap}</span>
          </label>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">h: hide · space: replay</span>
        </div>
      )}
    </div>
  );
}
