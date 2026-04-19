"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { bladePath, coverPoints, R } from "@/lib/iris-pheno-kinematics";
import type { IrisPhenoParams } from "@/lib/iris-pheno-kinematics";
const LOGO_SM_THRESHOLD = 40; // px — mirrors brand.ts threshold for reference

// ── ApertureMark ─────────────────────────────────────────────────────────────

function ApertureMark({
  N, t, halfSpread, overlap, curve, twist, shadowIntensity, bladeStroke,
  fill, gap, size, uid,
}: {
  N: number; t: number; halfSpread: number; overlap: number; curve: number;
  twist: number; shadowIntensity: number; bladeStroke: number;
  fill: string; gap: string; size: number; uid: string;
}) {
  const params: IrisPhenoParams = { N, halfSpread, overlap, curve, twist };
  const stepDeg = 360 / N;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bp   = useMemo(() => bladePath(t, params),    [N, t, halfSpread, overlap, curve, twist]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const poly = useMemo(() => coverPoints(t, params),  [N, t, halfSpread, overlap, curve, twist]);

  return (
    <svg viewBox="-120 -120 240 240" width={size} height={size} style={{ display: "block", flexShrink: 0 }}>
      <defs>
        <clipPath id={`iclip-${uid}`}><circle r={R} /></clipPath>
        {shadowIntensity > 0 && (
          <filter id={`bshadow-${uid}`} x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx={0} dy={0} stdDeviation={shadowIntensity * 5}
              floodColor="black" floodOpacity={0.55} />
          </filter>
        )}
        {Array.from({ length: N }, (_, i) => (
          <mask id={`bmask-${i}-${uid}`} key={i}>
            <rect x="-120" y="-120" width="240" height="240" fill="white" />
            <g transform={`rotate(${stepDeg * ((i + 1) % N)})`}>
              <path d={bp} fill="black" stroke="black"
                strokeWidth={bladeStroke} strokeLinejoin="miter" strokeMiterlimit={10} />
            </g>
          </mask>
        ))}
      </defs>
      <g clipPath={`url(#iclip-${uid})`}>
        {Array.from({ length: N }, (_, i) => (
          <g key={i} mask={`url(#bmask-${i}-${uid})`}>
            <g transform={`rotate(${stepDeg * i})`}>
              <path d={bp} fill={fill} stroke={gap} strokeWidth={bladeStroke}
                strokeLinejoin="miter" strokeMiterlimit={10}
                filter={shadowIntensity > 0 ? `url(#bshadow-${uid})` : undefined} />
            </g>
          </g>
        ))}
      </g>
      <polygon points={poly} fill={gap} />
    </svg>
  );
}

// ── Slider ────────────────────────────────────────────────────────────────────

function Slider({ label, value, min, max, step, onChange, display }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; display?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{display ?? value.toFixed(2)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-zinc-800" />
    </div>
  );
}

// ── ApertureRingControl ───────────────────────────────────────────────────────

const RING_SPACING = 64;
const RING_VALUES = [
  { label: "A",   t: 1.00 }, { label: "16",  t: 0.30 }, { label: "11",  t: 0.40 },
  { label: "8",   t: 0.50 }, { label: "5.6", t: 0.60 }, { label: "4",   t: 0.70 },
  { label: "2.8", t: 0.80 }, { label: "2",   t: 0.90 }, { label: "1.4", t: 1.00 },
] as const;

function ApertureRingControl({ value, onChange }: {
  value: number;
  onChange: (t: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset]   = useState(0);
  const [snapping, setSnapping] = useState(false);
  const isDragging  = useRef(false);
  const dragStart   = useRef<{ x: number; offset: number } | null>(null);

  function indexForValue(v: number) {
    let best = 0, bestDist = Infinity;
    RING_VALUES.forEach((rv, i) => { const d = Math.abs(rv.t - v); if (d < bestDist) { bestDist = d; best = i; } });
    return best;
  }
  function offsetForIndex(i: number) {
    const w = containerRef.current?.offsetWidth ?? 400;
    return w / 2 - (i + 0.5) * RING_SPACING;
  }
  function nearestIndex(raw: number) {
    const w = containerRef.current?.offsetWidth ?? 400;
    return Math.max(0, Math.min(RING_VALUES.length - 1, Math.round((w / 2 - raw) / RING_SPACING - 0.5)));
  }
  function tFromOffset(raw: number) {
    const w = containerRef.current?.offsetWidth ?? 400;
    const pos = (w / 2 - raw) / RING_SPACING - 0.5;
    if (pos <= 0) return RING_VALUES[0].t;
    if (pos >= RING_VALUES.length - 1) return RING_VALUES[RING_VALUES.length - 1].t;
    const lo = Math.floor(pos);
    return RING_VALUES[lo].t + (RING_VALUES[lo + 1].t - RING_VALUES[lo].t) * (pos - lo);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setOffset(offsetForIndex(indexForValue(value))); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!isDragging.current) setOffset(offsetForIndex(indexForValue(value))); }, [value]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true; dragStart.current = { x: e.clientX, offset }; setSnapping(false);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current || !dragStart.current) return;
    const neo = dragStart.current.offset + (e.clientX - dragStart.current.x);
    setOffset(neo); onChange(tFromOffset(neo));
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current || !dragStart.current) return;
    const neo = dragStart.current.offset + (e.clientX - dragStart.current.x);
    isDragging.current = false; dragStart.current = null;
    const idx = nearestIndex(neo);
    setSnapping(true); setOffset(offsetForIndex(idx)); onChange(RING_VALUES[idx].t);
    setTimeout(() => setSnapping(false), 220);
  }

  return (
    <div className="relative">
      <div ref={containerRef}
        className="relative rounded-xl overflow-hidden select-none cursor-grab active:cursor-grabbing"
        style={{ height: 52, backgroundColor: "#1a1a1a" }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="absolute inset-0" style={{
          maskImage: "linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)",
        }}>
          <div className="absolute top-0 h-full flex items-center"
            style={{ left: offset, transition: snapping ? "left 0.2s ease-out" : "none", willChange: "left" }}>
            {RING_VALUES.map((v) => (
              <div key={v.label}
                className="flex items-center justify-center font-bold text-sm tabular-nums"
                style={{ width: RING_SPACING, color: v.label === "A" ? "#C0452D" : "white", letterSpacing: "0.02em" }}>
                {v.label}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute pointer-events-none"
        style={{ left: "50%", top: -10, transform: "translateX(-50%)", width: 2, height: 18, backgroundColor: "white", zIndex: 1 }} />
    </div>
  );
}

// ── constants ─────────────────────────────────────────────────────────────────

const BLADE_OPTIONS  = [5, 6, 7, 9] as const;
const PREVIEW_SIZES  = [16, 24, 32, 48, 64, 128] as const;
const LIGHT_BG = "#f3f4f6";
const DARK_BG  = "#111827";
const THEMES = [
  { fill: "rgb(35,39,43)",   gap: LIGHT_BG, bg: LIGHT_BG, label: "light" },
  { fill: "rgb(225,227,229)", gap: DARK_BG,  bg: DARK_BG,  label: "dark"  },
] as const;

function fStop(t: number) {
  return "f/" + (1.4 * Math.pow(2, (1 - t) * 5)).toFixed(1);
}

// ── ParamControls ─────────────────────────────────────────────────────────────

function ParamControls({
  N, setN, aperture, setAperture,
  halfSpread, setHalfSpread, overlap, setOverlap,
  curve, setCurve, twist, setTwist,
  bladeStroke, setBladeStroke, shadow, setShadow,
  onReset,
}: {
  N: number;           setN: (v: number) => void;
  aperture: number;    setAperture: (v: number) => void;
  halfSpread: number;  setHalfSpread: (v: number) => void;
  overlap: number;     setOverlap: (v: number) => void;
  curve: number;       setCurve: (v: number) => void;
  twist: number;       setTwist: (v: number) => void;
  bladeStroke: number; setBladeStroke: (v: number) => void;
  shadow: number;      setShadow: (v: number) => void;
  onReset: () => void;
}) {
  return (
    <aside className="w-72 shrink-0 space-y-5 rounded-xl border border-gray-200 p-5">
      {/* Blade count */}
      <div>
        <p className="mb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Blade count</p>
        <div className="flex gap-2">
          {BLADE_OPTIONS.map((n) => (
            <button key={n} onClick={() => setN(n)}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                N === n ? "bg-zinc-900 text-zinc-50" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-4">
        <Slider label="Aperture openness" value={aperture} min={0.02} max={0.98} step={0.01}
          onChange={setAperture} display={fStop(aperture)} />
        <Slider label="Blade gap stroke" value={bladeStroke} min={0} max={8} step={0.1}
          onChange={setBladeStroke} display={`${bladeStroke.toFixed(1)}px`} />
        <Slider label="Half-spread (sweep)" value={halfSpread} min={0} max={0.95} step={0.01}
          onChange={setHalfSpread} />
        <Slider label="Blade overlap" value={overlap} min={0.02} max={0.9} step={0.01}
          onChange={setOverlap} display={`${(overlap * 100).toFixed(0)}%`} />
        <Slider label="Side edge curve" value={curve} min={0} max={1.0} step={0.01}
          onChange={setCurve} display={curve === 0 ? "off" : curve.toFixed(2)} />
        <Slider label="Closing twist" value={twist} min={0} max={2} step={0.05}
          onChange={setTwist} display={twist === 0 ? "off" : `${twist.toFixed(2)}×`} />
        <Slider label="Shadow intensity" value={shadow} min={0} max={1} step={0.01}
          onChange={setShadow} display={shadow === 0 ? "off" : shadow.toFixed(2)} />
      </div>

      {/* Reset only — export is handled by Aperture V2 Studio */}
      <div className="pt-1">
        <button onClick={onReset}
          className="w-full rounded-md py-1.5 text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
          Reset
        </button>
        <p className="mt-2 text-xs text-gray-400 text-center">
          Use Aperture V2 Studio to edit brand config
        </p>
      </div>
    </aside>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IrisPhenoLab() {
  // ─ Large section (IRIS_LG) ─────────────────────────────────────────────
  const [lgN,           setLgN]           = useState(7);
  const [lgT,           setLgT]           = useState(0.3);
  const [lgHalfSpread,  setLgHalfSpread]  = useState(0.6);
  const [lgOverlap,     setLgOverlap]     = useState(0.65);
  const [lgCurve,       setLgCurve]       = useState(1.0);
  const [lgTwist,       setLgTwist]       = useState(0.35);
  const [lgBladeStroke, setLgBladeStroke] = useState(0.5);
  const [lgShadow,      setLgShadow]      = useState(0.8);

  // Mouse-driven display aperture (fades to lgT on leave)
  const [lgDisplayT, _setLgDisplayT] = useState(0.3);
  const lgDisplayTRef  = useRef(0.3);
  const lgTRef         = useRef(0.3);
  const lgHoveringRef  = useRef(false);
  const lgPreviewRef   = useRef<HTMLDivElement>(null);
  const lgEntryOffset  = useRef(0);
  const lgEntryTime    = useRef(0);
  const lgEaseRaf      = useRef<number | null>(null);

  function setLgDisplayT(v: number) {
    lgDisplayTRef.current = v;
    _setLgDisplayT(v);
  }

  // Keep lgTRef in sync; mirror to display when not hovering
  useEffect(() => {
    lgTRef.current = lgT;
    if (!lgHoveringRef.current) setLgDisplayT(lgT);
  }, [lgT]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (lgEaseRaf.current) cancelAnimationFrame(lgEaseRaf.current); }, []);

  function lgMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
    if (lgEaseRaf.current) { cancelAnimationFrame(lgEaseRaf.current); lgEaseRaf.current = null; }
    lgHoveringRef.current = true;
    const rect = lgPreviewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const absT = Math.max(0.02, Math.min(0.98, (e.clientX - rect.left) / rect.width));
    lgEntryOffset.current = lgDisplayTRef.current - absT;
    lgEntryTime.current   = performance.now();
  }

  function lgMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!lgHoveringRef.current) return;
    const rect = lgPreviewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const absT = Math.max(0.02, Math.min(0.98, (e.clientX - rect.left) / rect.width));
    const p    = Math.min(1, (performance.now() - lgEntryTime.current) / 180);
    const off  = lgEntryOffset.current * (1 - p) ** 2;
    setLgDisplayT(Math.max(0.02, Math.min(0.98, absT + off)));
  }

  function lgMouseLeave() {
    lgHoveringRef.current = false;
    const fromT    = lgDisplayTRef.current;
    const toT      = lgTRef.current;
    const startMs  = performance.now();
    function tick(now: number) {
      const p     = Math.min(1, (now - startMs) / 700);
      const eased = 1 - (1 - p) ** 3;
      setLgDisplayT(fromT + (toT - fromT) * eased);
      if (p < 1) lgEaseRaf.current = requestAnimationFrame(tick);
      else lgEaseRaf.current = null;
    }
    lgEaseRaf.current = requestAnimationFrame(tick);
  }

  // ─ Small section (IRIS_SM) ─────────────────────────────────────────
  const [smN,           setSmN]           = useState(5);
  const [smT,           setSmT]           = useState(0.35);
  const [smHalfSpread,  setSmHalfSpread]  = useState(0.6);
  const [smOverlap,     setSmOverlap]     = useState(0.65);
  const [smCurve,       setSmCurve]       = useState(1.0);
  const [smTwist,       setSmTwist]       = useState(0.35);
  const [smBladeStroke, setSmBladeStroke] = useState(4.0);
  const [smShadow,      setSmShadow]      = useState(0.4);

  // ─ Reset handlers (local only — no brand.ts I/O) ─────────────────────────
  function handleLgReset() {
    setLgN(7); setLgT(0.3); lgTRef.current = 0.3; setLgDisplayT(0.3);
    setLgHalfSpread(0.6); setLgOverlap(0.65); setLgCurve(1.0);
    setLgTwist(0.35); setLgBladeStroke(0.5); setLgShadow(0.8);
  }

  function handleSmReset() {
    setSmN(5); setSmT(0.35);
    setSmHalfSpread(0.6); setSmOverlap(0.65); setSmCurve(1.0);
    setSmTwist(0.35); setSmBladeStroke(4.0); setSmShadow(0.4);
  }

  // ─ Render ─────────────────────────────────────────────────────────────────
  const lgShared = { N: lgN, halfSpread: lgHalfSpread, overlap: lgOverlap, curve: lgCurve, twist: lgTwist, bladeStroke: lgBladeStroke, shadowIntensity: lgShadow };
  const smShared = { N: smN, halfSpread: smHalfSpread, overlap: smOverlap, curve: smCurve, twist: smTwist, bladeStroke: smBladeStroke, shadowIntensity: smShadow };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 space-y-14">
      {/* Header */}
      <div>
        <div className="mb-1 text-xs text-gray-400 tracking-wide uppercase">Design Lab</div>
        <h1 className="text-2xl font-semibold tracking-tight">Iris Pheno — Phenomenokinematic Model (demo)</h1>
        <p className="mt-1 text-sm text-gray-500">
          Two optical presets, analogous to font optical sizing.
          Large for hero renders (≥{LOGO_SM_THRESHOLD}px), SM for nav and favicon.
        </p>
      </div>

      {/* ── Section 1: Large / IRIS_LG ──────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">
          Large size — <span className="font-mono">IRIS_LG</span>
          <span className="ml-2 font-normal normal-case text-gray-400">(≥{LOGO_SM_THRESHOLD}px)</span>
        </h2>
        <div className="flex gap-6 items-start">
          {/* Preview + ring */}
          <div className="flex-1 min-w-0 space-y-4">
            <div
              ref={lgPreviewRef}
              className="flex gap-4"
              onMouseEnter={lgMouseEnter}
              onMouseMove={lgMouseMove}
              onMouseLeave={lgMouseLeave}
            >
              {THEMES.map((theme, idx) => (
                <div key={idx} className="flex-1 flex items-center justify-center rounded-xl py-14"
                  style={{ backgroundColor: theme.bg }}>
                  <ApertureMark {...lgShared} t={lgDisplayT} fill={theme.fill} gap={theme.gap} size={200} uid={`lg-${idx}`} />
                </div>
              ))}
            </div>
            <ApertureRingControl value={lgT} onChange={setLgT} />
          </div>

          {/* Controls */}
          <ParamControls
            N={lgN} setN={setLgN}
            aperture={lgT} setAperture={setLgT}
            halfSpread={lgHalfSpread} setHalfSpread={setLgHalfSpread}
            overlap={lgOverlap} setOverlap={setLgOverlap}
            curve={lgCurve} setCurve={setLgCurve}
            twist={lgTwist} setTwist={setLgTwist}
            bladeStroke={lgBladeStroke} setBladeStroke={setLgBladeStroke}
            shadow={lgShadow} setShadow={setLgShadow}
            onReset={handleLgReset}
          />
        </div>
      </section>

      {/* ── Section 2: Favicon / IRIS_SM ─────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">
          Favicon / icon size preview — <span className="font-mono">IRIS_SM</span>
          <span className="ml-2 font-normal normal-case text-gray-400">(&lt;{LOGO_SM_THRESHOLD}px)</span>
        </h2>
        <div className="flex gap-6 items-start">
          {/* Preview grid */}
          <div className="flex-1 min-w-0">
            <div className="rounded-xl border border-gray-200 p-6 space-y-6">
              {THEMES.map((theme, tidx) => (
                <div key={tidx} className="flex items-end gap-5 flex-wrap">
                  {PREVIEW_SIZES.map((sz) => (
                    <div key={sz} className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center justify-center rounded"
                        style={{ background: theme.bg, padding: sz < 32 ? 4 : 6 }}>
                        <ApertureMark {...smShared} t={smT} fill={theme.fill} gap={theme.gap} size={sz} uid={`sm-${tidx}-${sz}`} />
                      </div>
                      <span className="text-xs text-gray-400 tabular-nums">{sz}</span>
                    </div>
                  ))}
                  <span className="text-xs text-gray-300 self-end pb-4">{theme.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <ParamControls
            N={smN} setN={setSmN}
            aperture={smT} setAperture={setSmT}
            halfSpread={smHalfSpread} setHalfSpread={setSmHalfSpread}
            overlap={smOverlap} setOverlap={setSmOverlap}
            curve={smCurve} setCurve={setSmCurve}
            twist={smTwist} setTwist={setSmTwist}
            bladeStroke={smBladeStroke} setBladeStroke={setSmBladeStroke}
            shadow={smShadow} setShadow={setSmShadow}
            onReset={handleSmReset}
          />
        </div>
      </section>
    </main>
  );
}
