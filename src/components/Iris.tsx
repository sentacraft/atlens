"use client";

// Aperture mark component — renders the X-Glass logo using the physical
// iris kinematic model (iris-kinematics.ts).
//
// Accepts a single IrisConfig (from iris-config.ts) covering kinematic params,
// render size, appearance, and interactive behaviour.
//
// Theming: bladeColor/strokeColor in the config override the Tailwind
// fill-*/stroke-* utilities used for automatic light/dark switching.
//
// Interaction modes (mutually exclusive, set via config.interactive):
//   "hover" — aperture tracks horizontal mouse position across a hotzone div
//             sized by hotzoneScaleH/V.
//   "tap"   — clicking (desktop) or touching (mobile) plays the configured
//             animation. Shows a pointer cursor.
//   absent  — no interaction; iris sits at defaultFStop.
//
// Animations: config.onMount plays on mount; interactive.type === "tap" plays
// on click/touch. Both share the same playAnimation() engine and chase loop.
//
// ApertureStrip: when apertureStrip is true in the config, a mobile-only
// touch strip is rendered below the iris (hidden on md+ screens).

import { useState, useRef, useEffect, useMemo } from "react";
import {
  solveAllBlades,
  bladeShapePath,
  thetaRange,
  buildDerivedConfig,
  computeThetaOpen,
  apertureInradius,
  findThetaForInradius,
  findThetaForFStop,
} from "@/lib/iris-kinematics";
import { R_HOUSING, type IrisConfig, type IrisAnimation } from "@/config/iris-config";
import ApertureStrip from "@/components/ApertureStrip";

// ── Component ─────────────────────────────────────────────────────────────────

interface IrisProps {
  config: IrisConfig;
  /**
   * Render size override in px. Falls back to config.size when omitted.
   * Use this only when you need a one-off size that differs from the named
   * config (e.g. about page, poster).
   */
  size?: number;
  /** Must be unique per page — used as SVG def ID prefix. */
  uid?: string;
  className?: string;
}

export default function Iris({
  config: rawConfig,
  size: sizeProp,
  uid = "logo",
  className,
}: IrisProps) {
  const {
    size: configSize,
    interactive,
    apertureStrip = false,
    onMount,
    closedFStop = 22,
    chaseTauMs = 60,
    bladeColor,
    strokeColor,
    strokeWidth,
  } = rawConfig;
  const size = sizeProp ?? configSize;

  // Derive interaction mode flags and hover-specific config.
  const isHover     = interactive?.type === "hover";
  const isTap       = interactive?.type === "tap";
  const hoverConfig = isHover ? interactive : null;
  const hotzoneScaleH = hoverConfig?.hotzoneScaleH ?? 1;
  const hotzoneScaleV = hoverConfig?.hotzoneScaleV ?? 1;
  const easeOutMs     = hoverConfig?.easeOutMs     ?? 700;

  const dc = useMemo(() => buildDerivedConfig(rawConfig, R_HOUSING), [rawConfig]);
  const thetaOpen = useMemo(() => computeThetaOpen(dc, R_HOUSING), [dc]);
  const thetaMax  = useMemo(() => thetaRange(dc).max, [dc]);

  const inradiusOpen = useMemo(() => apertureInradius(thetaOpen, dc), [thetaOpen, dc]);

  const DEFAULT_THETA = useMemo(() =>
    findThetaForFStop(rawConfig.defaultFStop, dc, { min: thetaOpen, max: thetaMax }, rawConfig.openFStop),
  [rawConfig.defaultFStop, rawConfig.openFStop, dc, thetaOpen, thetaMax]);

  const [theta, setTheta] = useState<number>(DEFAULT_THETA);
  const [isAnimating, setIsAnimating] = useState(!!onMount);
  const thetaRef       = useRef<number>(DEFAULT_THETA);
  const animRef        = useRef<number | null>(null);
  const chaseRef       = useRef<number | null>(null);
  const initAnimRef    = useRef<number | null>(null);
  const targetThetaRef = useRef<number>(DEFAULT_THETA);
  const lastFrameRef   = useRef<number>(0);
  const defaultThetaRef = useRef(DEFAULT_THETA);
  defaultThetaRef.current = DEFAULT_THETA;

  const blades = useMemo(
    () => solveAllBlades(theta, dc),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solveAllBlades is a pure
    // function imported from a stable module; adding it to deps would be noise.
    [theta, dc]
  );
  const shape = useMemo(() => bladeShapePath(dc), [dc]);

  useEffect(() => () => {
    if (animRef.current)     cancelAnimationFrame(animRef.current);
    if (chaseRef.current)    cancelAnimationFrame(chaseRef.current);
    if (initAnimRef.current) cancelAnimationFrame(initAnimRef.current);
  }, []);

  // When not in hover mode, keep theta in sync with DEFAULT_THETA so the iris
  // reflects any config change (e.g. Design Lab parameter tuning).
  useEffect(() => {
    if (isHover) return;
    thetaRef.current = DEFAULT_THETA;
    setTheta(DEFAULT_THETA);
  }, [DEFAULT_THETA, isHover]);

  // ── Animation engine ──────────────────────────────────────────────────────
  // Shared by mount animation and tap interaction. Cancels any in-flight
  // animations before starting, so the two triggers can never overlap.
  // startChase / stopChase are function declarations hoisted to the top of
  // this render function — accessible here even though defined below.

  function playAnimation(anim: IrisAnimation) {
    if (anim.type !== "sweep") return;
    const { sweepMs, totalMs } = anim;

    if (animRef.current)     { cancelAnimationFrame(animRef.current);     animRef.current = null; }
    if (initAnimRef.current) { cancelAnimationFrame(initAnimRef.current); initAnimRef.current = null; }

    thetaRef.current = thetaOpen;
    targetThetaRef.current = thetaOpen;
    setTheta(thetaOpen);
    setIsAnimating(true);
    startChase();

    const startTime = performance.now();
    function tick(now: number) {
      const elapsed = now - startTime;
      if (elapsed < sweepMs) {
        targetThetaRef.current = thetaOpen + (elapsed / sweepMs) * (thetaMax - thetaOpen);
        initAnimRef.current = requestAnimationFrame(tick);
      } else if (elapsed < totalMs) {
        const p2 = (elapsed - sweepMs) / (totalMs - sweepMs);
        targetThetaRef.current = thetaMax + p2 * (defaultThetaRef.current - thetaMax);
        initAnimRef.current = requestAnimationFrame(tick);
      } else {
        targetThetaRef.current = defaultThetaRef.current;
        initAnimRef.current = null;
        setIsAnimating(false);
      }
    }
    initAnimRef.current = requestAnimationFrame(tick);
  }

  // ── Mount animation ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!onMount) return;
    playAnimation(onMount);
    return () => {
      if (initAnimRef.current) { cancelAnimationFrame(initAnimRef.current); initAnimRef.current = null; }
      stopChase();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only init effect;
  // thetaOpen/thetaMax read at mount time, stable for the component's lifetime.
  }, []);

  // ── Imperative controls (used by ApertureStrip) ───────────────────────────

  function driveToFStop(fStop: number) {
    if (animRef.current)     { cancelAnimationFrame(animRef.current);     animRef.current = null; }
    if (initAnimRef.current) { cancelAnimationFrame(initAnimRef.current); initAnimRef.current = null; }
    const t = findThetaForFStop(fStop, dc, { min: thetaOpen, max: thetaMax }, rawConfig.openFStop);
    targetThetaRef.current = Math.max(thetaOpen, Math.min(thetaMax, t));
    startChase();
  }

  // ── Derived geometry ──────────────────────────────────────────────────────

  const { N } = dc;
  const stepDeg = 360 / N;
  const maskCount = Math.floor((N - 1) / 2);

  if (blades.length === 0) return null;

  const b0 = blades[0];
  const b0AngleDeg = (b0.bladeAngle * 180) / Math.PI;
  const b0Transform = `translate(${b0.pivotPos.x.toFixed(3)},${b0.pivotPos.y.toFixed(3)}) rotate(${b0AngleDeg.toFixed(3)})`;

  // ViewBox is tight around the visible blade area (clipped at R_HOUSING − bladeWidth).
  // A 2-unit pad prevents subpixel fringing at the clip boundary.
  const vbHalf  = R_HOUSING - dc.bladeWidth + 2;
  const viewBox = `${-vbHalf} ${-vbHalf} ${vbHalf * 2} ${vbHalf * 2}`;

  // ── Chase loop ────────────────────────────────────────────────────────────

  function startChase() {
    if (chaseRef.current) return;
    lastFrameRef.current = performance.now();
    let hasMovedSignificantly = false;
    function chaseTick(now: number) {
      const dt   = Math.min(now - lastFrameRef.current, 64);
      lastFrameRef.current = now;
      const k    = 1 - Math.exp(-dt / chaseTauMs);
      const next = thetaRef.current + (targetThetaRef.current - thetaRef.current) * k;
      thetaRef.current = next;
      setTheta(next);
      const delta = Math.abs(next - targetThetaRef.current);
      if (delta > 0.01) hasMovedSignificantly = true;
      if (hasMovedSignificantly && delta < 0.001) {
        thetaRef.current = targetThetaRef.current;
        setTheta(targetThetaRef.current);
        chaseRef.current = null;
      } else {
        chaseRef.current = requestAnimationFrame(chaseTick);
      }
    }
    chaseRef.current = requestAnimationFrame(chaseTick);
  }

  function stopChase() {
    if (chaseRef.current) { cancelAnimationFrame(chaseRef.current); chaseRef.current = null; }
  }

  // ── Hover interaction ─────────────────────────────────────────────────────
  // Events fire on the hotzone wrapper div (sized by hotzoneScaleH/V), not
  // the SVG itself, so the interactive area can extend beyond the iris footprint.

  function posToDiameterTheta(clientX: number, rect: DOMRect): number {
    const rawPos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    if (inradiusOpen <= 0) return thetaOpen + rawPos * (thetaMax - thetaOpen);
    const r22     = (rawConfig.openFStop * inradiusOpen) / closedFStop;
    const targetR = inradiusOpen + rawPos * (r22 - inradiusOpen);
    return findThetaForInradius(targetR, dc, { min: thetaOpen, max: thetaMax });
  }

  function handleMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
    if (!isHover) return;
    if (animRef.current)     { cancelAnimationFrame(animRef.current);     animRef.current = null; }
    if (initAnimRef.current) { cancelAnimationFrame(initAnimRef.current); initAnimRef.current = null; }
    const rect = e.currentTarget.getBoundingClientRect();
    targetThetaRef.current = posToDiameterTheta(e.clientX, rect);
    startChase();
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isHover) return;
    const rect = e.currentTarget.getBoundingClientRect();
    targetThetaRef.current = posToDiameterTheta(e.clientX, rect);
    startChase();
  }

  function handleMouseLeave() {
    if (!isHover) return;
    stopChase();
    const startTheta = thetaRef.current;
    const startTime  = performance.now();
    function tick(now: number) {
      const p        = Math.min(1, (now - startTime) / easeOutMs);
      const eased    = 1 - (1 - p) ** 3;
      const newTheta = startTheta + (DEFAULT_THETA - startTheta) * eased;
      thetaRef.current = newTheta;
      setTheta(newTheta);
      if (p < 1) animRef.current = requestAnimationFrame(tick);
      else animRef.current = null;
    }
    animRef.current = requestAnimationFrame(tick);
  }

  // ── Tap interaction ───────────────────────────────────────────────────────

  function handleClick() {
    if (interactive?.type !== "tap") return;
    playAnimation(interactive.animation);
  }

  // ── Current f-stop (for ApertureStrip sync) ────────────────────────────────
  // Derived from theta so the strip can mirror the iris position during any
  // animation and after release easing. Uses f = f_open × (r_open / r).

  const currentFStop = useMemo(() => {
    if (!apertureStrip) return undefined;
    const r = apertureInradius(theta, dc);
    if (r <= 0 || inradiusOpen <= 0) return closedFStop;
    return Math.min(closedFStop, rawConfig.openFStop * inradiusOpen / r);
  }, [apertureStrip, theta, dc, inradiusOpen, closedFStop, rawConfig.openFStop]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const wrapperW = isHover ? size * hotzoneScaleH : size;
  const wrapperH = isHover ? size * hotzoneScaleV : size;

  return (
    <div
      className={className}
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}
    >
      {/* Hotzone wrapper — captures mouse/tap events */}
      <div
        style={{
          width:          wrapperW,
          height:         wrapperH,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          cursor:         isTap ? "pointer" : undefined,
        }}
        onMouseEnter={isHover ? handleMouseEnter : undefined}
        onMouseMove={isHover ? handleMouseMove : undefined}
        onMouseLeave={isHover ? handleMouseLeave : undefined}
        onClick={isTap ? handleClick : undefined}
      >
        <svg
          viewBox={viewBox}
          width={size}
          height={size}
          style={{ display: "block", flexShrink: 0, pointerEvents: "none" }}
          aria-hidden="true"
        >
          <defs>
            <clipPath id={`${uid}-clip`}>
              <circle r={R_HOUSING - dc.bladeWidth} />
            </clipPath>
            {Array.from({ length: N }, (_, i) => (
              <mask id={`${uid}-sm-${i}`} key={i}>
                <rect x="-120" y="-120" width="240" height="240" fill="white" />
                {Array.from({ length: maskCount }, (_, k) => {
                  const j = (i + 1 + k) % N;
                  return (
                    <g key={j} transform={`rotate(${(stepDeg * j).toFixed(3)})`}>
                      <g transform={b0Transform}>
                        <path d={shape} fill="black" />
                      </g>
                    </g>
                  );
                })}
              </mask>
            ))}
          </defs>

          <g clipPath={`url(#${uid}-clip)`}>
            {/* Fill pass */}
            {Array.from({ length: N }, (_, i) => (
              <g key={i} transform={`rotate(${(stepDeg * i).toFixed(3)})`}>
                <g transform={b0Transform}>
                  <path
                    d={shape}
                    className={bladeColor ? undefined : "fill-zinc-900 dark:fill-zinc-100"}
                    fill={bladeColor}
                    stroke="none"
                  />
                </g>
              </g>
            ))}
            {/* Stroke pass */}
            {Array.from({ length: N }, (_, i) => (
              <g key={i} mask={`url(#${uid}-sm-${i})`}>
                <g transform={`rotate(${(stepDeg * i).toFixed(3)})`}>
                  <g transform={b0Transform}>
                    <path
                      d={shape}
                      fill="none"
                      className={strokeColor ? undefined : "stroke-background"}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                    />
                  </g>
                </g>
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* Aperture strip — mobile only, hidden on md+ */}
      {apertureStrip && (
        <div className="mt-1" style={{ width: size }}>
          <ApertureStrip
            defaultFStop={rawConfig.defaultFStop}
            fStop={currentFStop}
            animating={isAnimating}
            onDrive={driveToFStop}
          />
        </div>
      )}
    </div>
  );
}
