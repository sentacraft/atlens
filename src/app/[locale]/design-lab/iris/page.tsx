"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  solveAllBlades,
  thetaRange,
  bladeShapePath,
  buildDerivedConfig,
  computeThetaOpen,
  DEFAULT_IRIS_CONFIG,
  apertureInradius,
  findThetaForInradius,
  findThetaForFStop,
  type IrisMechanismConfig,
} from "@/lib/iris/kinematics";
import { readFromConfig, exportToConfig } from "./actions";
import { IRIS_HERO, IRIS_NAV, IRIS_LAB, R_HOUSING } from "@/config/iris-config";
import type { IrisConfig, IrisAnimation } from "@/config/iris-config";
import Iris from "@/components/iris/Iris";

const VIEWBOX = "-150 -150 300 300";

const FSTOP_SEQUENCE: (number | "A")[] = ["A", 1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
const FSTOP_ARC_SPAN = 125;                                  // degrees
const FSTOP_ANGLE_STEP = FSTOP_ARC_SPAN / (FSTOP_SEQUENCE.length - 1);  // ~13.9° per step
const FSTOP_A_COLOR = "#f87171";                             // Auto marker red (Tailwind red-400)

function fStopToRingAngle(f: number): number {
  return Math.log2(Math.max(0.5, f)) * 2 * FSTOP_ANGLE_STEP;
}

function IrisStage({
  config,
  theta,
  showMechanics,
  showFStopRing = false,
  fStopRingOuter = true,
  fStop = 1.4,
  strokeWidth,
  bladeColor,
  strokeColor,
  uid,
}: {
  config: IrisMechanismConfig;
  theta: number;
  showMechanics: boolean;
  showFStopRing?: boolean;
  fStopRingOuter?: boolean;
  fStop?: number;
  strokeWidth: number;
  bladeColor: string;
  strokeColor: string;
  uid: string;
}) {
  const { N } = config;
  const stepDeg = 360 / N;

  // Only blade[0]'s transform is needed: blade i = rotate(stepDeg * i) ∘ blade[0].
  const blades = useMemo(
    () => solveAllBlades(theta, config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theta, config.N, config.pivotRadius, config.pinDistance, config.slotOffset]
  );
  const shape = useMemo(
    () => bladeShapePath(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.bladeLength, config.bladeWidth, config.bladeCurvature, config.pinDistance]
  );

  if (blades.length === 0) {
    return null;

  }

  const b0 = blades[0];
  const b0AngleDeg = (b0.bladeAngle * 180) / Math.PI;
  const b0Transform = `translate(${b0.pivotPos.x.toFixed(3)},${b0.pivotPos.y.toFixed(3)}) rotate(${b0AngleDeg.toFixed(3)})`;

  return (
    <svg
      viewBox={VIEWBOX}
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      <defs>
        <clipPath id={`clip-${uid}`}>
          <circle r={R_HOUSING} />
        </clipPath>
        {/* Blade i's stroke is masked wherever the next floor((N-1)/2) blades cover it, which keeps the overlap symmetric at small apertures. */}
        {Array.from({ length: N }, (_, i) => {
          const maskCount = Math.floor((N - 1) / 2);
          return (
            <mask id={`mask-stroke-${i}-${uid}`} key={i}>
              <rect x="-150" y="-150" width="300" height="300" fill="white" />
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
          );
        })}
      </defs>

      <circle r="150" fill="#f5f5f4" />
      <circle r={R_HOUSING} fill="#ede9e4" />

      {showMechanics && (
        <g opacity="0.8">
          <circle
            r={config.pivotRadius}
            fill="none"
            stroke="#1a3a5c"
            strokeWidth="0.6"
            strokeDasharray="3 3"
          />
          {blades.map((blade, i) => (
            <g key={i}>
              <circle
                cx={blade.pivotPos.x}
                cy={blade.pivotPos.y}
                r="3"
                fill="#0d1f33"
                stroke="#1e4976"
                strokeWidth="0.8"
              />
              <circle
                cx={blade.pivotPos.x}
                cy={blade.pivotPos.y}
                r="1"
                fill="#3a7fc1"
              />
            </g>
          ))}
        </g>
      )}

      <g clipPath={`url(#clip-${uid})`}>
        {Array.from({ length: N }, (_, i) => (
          <g key={i} transform={`rotate(${(stepDeg * i).toFixed(3)})`}>
            <g transform={b0Transform}>
              <path d={shape} fill={bladeColor} stroke="none" />
            </g>
          </g>
        ))}
        {Array.from({ length: N }, (_, i) => (
          <g key={i} mask={`url(#mask-stroke-${i}-${uid})`}>
            <g transform={`rotate(${(stepDeg * i).toFixed(3)})`}>
              <g transform={b0Transform}>
                <path d={shape} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
              </g>
            </g>
          </g>
        ))}
      </g>

      {showMechanics && (
        <g
          transform={`rotate(${((theta * 180) / Math.PI).toFixed(3)})`}
          opacity="0.7"
        >
          <circle
            r={R_HOUSING + 20}
            fill="none"
            stroke="#2a3a2a"
            strokeWidth="16"
            opacity="0.4"
          />
          {Array.from({ length: N }, (_, i) => {
            const slotAngle =
              (i * 2 * Math.PI) / N + config.slotOffset + theta;
            const r1 = 30;
            const r2 = R_HOUSING + 28;
            return (
              <line
                key={i}
                x1={r1 * Math.cos(slotAngle)}
                y1={r1 * Math.sin(slotAngle)}
                x2={r2 * Math.cos(slotAngle)}
                y2={r2 * Math.sin(slotAngle)}
                stroke="#3a5c3a"
                strokeWidth="1.5"
              />
            );
          })}
          {blades.map((blade, i) => (
            <circle
              key={i}
              cx={blade.guidePinPos.x}
              cy={blade.guidePinPos.y}
              r="2.5"
              fill="#0d330d"
              stroke="#2a6b2a"
              strokeWidth="0.8"
            />
          ))}
        </g>
      )}

      {!showMechanics && (
        <circle
          r={R_HOUSING - config.bladeWidth / 2}
          fill="none"
          stroke="#f5f5f4"
          strokeWidth={config.bladeWidth + 1}
        />
      )}

      <circle
        r={R_HOUSING}
        fill="none"
        stroke="#d6d3d1"
        strokeWidth="0.8"
      />
      <circle
        r={R_HOUSING + 5}
        fill="none"
        stroke="#e7e5e4"
        strokeWidth="2"
      />

      {showFStopRing && (() => {
        const blackEdge = R_HOUSING - config.bladeWidth;
        const ringR     = blackEdge;
        const labelR    = fStopRingOuter ? blackEdge + 4 : blackEdge - 10;

        const isValid = isFinite(fStop) && fStop >= 1;
        const ringRot = isValid ? -90 - fStopToRingAngle(fStop) : -90;
        const ringRotStr = ringRot.toFixed(3);

        const markerNear = fStopRingOuter ? labelR + 2    : ringR - 2;
        const markerFar  = fStopRingOuter ? labelR + 7.6  : ringR - 7.6;
        return (
          <g>
            <line
              x1="0" y1={-markerNear}
              x2="0" y2={-markerFar}
              stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"
            />
            <g transform={`rotate(${ringRotStr})`}>
              <circle r={ringR} fill="none" stroke="#d4d4d8" strokeWidth="0.6" />
              {FSTOP_SEQUENCE.map((f, i) => {
                const deg = i * FSTOP_ANGLE_STEP;
                const rad = (deg * Math.PI) / 180;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);
                const lx = labelR * cos;
                const ly = labelR * sin;
                const isA = f === "A";
                const label = isA ? "A"
                  : (f === 1.4 || f === 2.8 || f === 5.6) ? (f as number).toFixed(1)
                  : String(f);
                return (
                  <g key={label}>
                    <text
                      x={lx.toFixed(3)} y={ly.toFixed(3)}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize="7" fill={isA ? FSTOP_A_COLOR : "#71717a"}
                      fontWeight={isA ? "600" : "normal"}
                      fontFamily="ui-monospace, SFMono-Regular, monospace"
                      transform={`rotate(${(deg + 90).toFixed(3)}, ${lx.toFixed(3)}, ${ly.toFixed(3)})`}
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        );
      })()}
    </svg>
  );
}

const FSTOP_OPTIONS = FSTOP_SEQUENCE.filter((f): f is number => f !== "A");

function formatFStop(f: number): string {
  if (!isFinite(f) || f > 22) {
    return "f/—";
  }
  return `f/${f.toFixed(1)}`;
}

export default function ApertureV2Lab() {
  const [config, setConfig] = useState<IrisMechanismConfig>(DEFAULT_IRIS_CONFIG);

  type StudioProfile = "lab" | "production:hero" | "production:nav";
  const [selectedProfile, setSelectedProfile] = useState<StudioProfile>("lab");
  const [previewSize, setPreviewSize] = useState(IRIS_LAB.size);
  const [previewAnimKey, setPreviewAnimKey] = useState(0);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const setField = (patch: Partial<IrisMechanismConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...patch };
      const rp = R_HOUSING - next.bladeWidth / 2;
      const dMax = next.bladeLength - 1;
      next.pinDistance = Math.max(rp, Math.min(dMax, next.pinDistance));
      return next;
    });
    setIsPlaying(false);
    startRef.current = undefined;
  };

  async function handleLoad() {
    const key = selectedProfile === "production:hero" ? "IRIS_HERO"
      : selectedProfile === "production:nav" ? "IRIS_NAV" : "IRIS_LAB";
    const v = await readFromConfig(key);
    if (!v) {
      return;
    }
    applyConfig(v);
  }

  function applyConfig(v: IrisConfig) {
    setConfig(buildDerivedConfig(v, R_HOUSING));
    if (v.bladeColor) {
      setBladeGray(parseInt(v.bladeColor.slice(1, 3), 16));
    }
    if (v.strokeColor) {
      setStrokeGray(parseInt(v.strokeColor.slice(1, 3), 16));
    }
    if (v.strokeWidth !== undefined) {
      setStrokeWidth(v.strokeWidth);
    }
    setOpenFStop(v.openFStop);
    setDefaultFStop(v.defaultFStop);
    const hc = v.interactive?.type === "hover" ? v.interactive : null;
    setInteractive(hc !== null);
    setOnMount(v.onMount);
    setClosedFStop(v.closedFStop ?? 22);
    setChaseTauMs(v.chaseTauMs ?? 60);
    setEaseOutMs(hc?.easeOutMs ?? 700);
    setCatchupMs(hc?.catchupMs ?? 300);
    setHotzoneScaleH(hc?.hotzoneScaleH ?? 1.5);
    setHotzoneScaleV(hc?.hotzoneScaleV ?? 1.0);
    setPreviewSize(v.size);
    setIsPlaying(false);
    startRef.current = undefined;
  }

  async function handleExport() {
    setExportStatus("Saving…");
    const profileSize = selectedProfile === "production:hero" ? IRIS_HERO.size
      : selectedProfile === "production:nav" ? IRIS_NAV.size : IRIS_LAB.size;
    const stored: IrisConfig = {
      N: config.N,
      pinDistance: config.pinDistance,
      slotOffset: config.slotOffset,
      bladeLength: config.bladeLength,
      bladeWidth: config.bladeWidth,
      openFStop,
      defaultFStop,
      size: profileSize,
      bladeColor: grayHex(bladeGray),
      strokeColor: grayHex(strokeGray),
      strokeWidth,
      interactive: interactive ? {
        type: "hover" as const,
        hotzoneScaleH,
        hotzoneScaleV,
        easeOutMs,
        catchupMs,
      } : undefined,
      onMount,
      closedFStop,
      chaseTauMs,
    };
    const key = selectedProfile === "production:hero" ? "IRIS_HERO"
      : selectedProfile === "production:nav" ? "IRIS_NAV" : "IRIS_LAB";
    const res = await exportToConfig(key, stored);
    setExportStatus(res.ok ? `✓ Written to ${key}` : `✗ ${res.error}`);
    if (res.ok) {
      setTimeout(() => setExportStatus(null), 3000);
    }
  }

  useEffect(() => {
    readFromConfig("IRIS_LAB").then(v => {
      if (v) {
        applyConfig(v);
      }
    });
  }, []);  

  const derivedConfig = useMemo(
    () => buildDerivedConfig(config, R_HOUSING),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.N, config.pinDistance, config.slotOffset,
     config.bladeLength, config.bladeWidth]
  );

  const range = useMemo(
    () => ({
      min: computeThetaOpen(derivedConfig, R_HOUSING),
      max: thetaRange(derivedConfig).max,
    }),
    [derivedConfig]
  );

  const [theta, setTheta] = useState(() => {
    const initDerived = buildDerivedConfig(DEFAULT_IRIS_CONFIG, R_HOUSING);
    return computeThetaOpen(initDerived, R_HOUSING);
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.35); // Hz
  const [showMechanics, setShowMechanics] = useState(false);
  const [showFStopRing, setShowFStopRing] = useState(false);
  const [fStopRingOuter, setFStopRingOuter] = useState(true);
  const [interactive, setInteractive] = useState(false);
  const [onMount, setOnMount] = useState<IrisAnimation | undefined>(undefined);
  const [openFStop, setOpenFStop] = useState(1.4);
  const [defaultFStop, setDefaultFStop] = useState(5.6);
  const [closedFStop, setClosedFStop] = useState(22);
  const [chaseTauMs, setChaseTauMs] = useState(60);
  const [easeOutMs, setEaseOutMs] = useState(700);
  const [catchupMs, setCatchupMs] = useState(300);
  const [hotzoneScaleH, setHotzoneScaleH] = useState(1.5);
  const [hotzoneScaleV, setHotzoneScaleV] = useState(1.0);
  const [strokeWidth, setStrokeWidth] = useState(0.5);
  const [bladeGray, setBladeGray] = useState(24);   // 0=black … 255=white; default ≈ zinc-900
  const [strokeGray, setStrokeGray] = useState(63); // default ≈ zinc-700

  function grayHex(v: number) {
    const h = Math.round(v).toString(16).padStart(2, "0");
    return `#${h}${h}${h}`;
  }

  const previewConfig = useMemo((): IrisConfig => ({
    N: config.N,
    pinDistance: config.pinDistance,
    slotOffset: config.slotOffset,
    bladeLength: config.bladeLength,
    bladeWidth: config.bladeWidth,
    openFStop,
    defaultFStop,
    size: previewSize,
    bladeColor: grayHex(bladeGray),
    strokeColor: grayHex(strokeGray),
    strokeWidth,
    interactive: undefined,
    onMount,
    closedFStop,
    chaseTauMs,
   
  }), [config.N, config.pinDistance, config.slotOffset, config.bladeLength, config.bladeWidth,
      openFStop, defaultFStop, closedFStop, chaseTauMs,
      previewSize, bladeGray, strokeGray, strokeWidth, onMount]);

  const rafRef = useRef<number | undefined>(undefined);
  const startRef = useRef<number | undefined>(undefined);
  const thetaRef = useRef(theta);
  const irisContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    thetaRef.current = theta;
  }, [theta]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      startRef.current = undefined;
      return;
    }

    function tick(now: number) {
      if (!startRef.current) {
        const { min, max } = range;
        const mid = (min + max) / 2;
        const amp = (max - min) / 2;
        const normalised = (thetaRef.current - mid) / amp; // [-1, 1]
        const phase = Math.asin(Math.max(-1, Math.min(1, normalised)));
        startRef.current = now - (phase / (speed * 2 * Math.PI)) * 1000;
      }
      const elapsed = (now - startRef.current) / 1000;
      const { min, max } = range;
      const mid = (min + max) / 2;
      const amp = (max - min) / 2;
      const newTheta = mid + amp * Math.sin(elapsed * speed * 2 * Math.PI);
      thetaRef.current = newTheta;
      setTheta(newTheta);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying, speed, range]);

  useEffect(() => {
    setTheta(range.min);
    thetaRef.current = range.min;
    startRef.current = undefined;
  }, [range]);

  const openPct = Math.round(
    ((theta - range.min) / (range.max - range.min)) * 100
  );

  const inradiusCurrent = useMemo(
    () => apertureInradius(theta, derivedConfig),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theta, derivedConfig.N, derivedConfig.pivotRadius, derivedConfig.pinDistance,
     derivedConfig.slotOffset, derivedConfig.bladeLength, derivedConfig.bladeWidth,
     derivedConfig.bladeCurvature]
  );
  const inradiusOpen = useMemo(
    () => apertureInradius(range.min, derivedConfig),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [range.min, derivedConfig.N, derivedConfig.pivotRadius, derivedConfig.pinDistance,
     derivedConfig.slotOffset, derivedConfig.bladeLength, derivedConfig.bladeWidth,
     derivedConfig.bladeCurvature]
  );
  const fStop = inradiusCurrent > 0.5
    ? openFStop * (inradiusOpen / inradiusCurrent)
    : Infinity;

  const autoTheta = useMemo(
    () => findThetaForFStop(defaultFStop, derivedConfig, range, openFStop),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defaultFStop, openFStop, range.min, range.max, derivedConfig.N, derivedConfig.pivotRadius,
     derivedConfig.pinDistance, derivedConfig.slotOffset, derivedConfig.bladeLength,
     derivedConfig.bladeWidth, derivedConfig.bladeCurvature]
  );
  const ringFStop = openPct === 0 ? 1.0 : fStop;
  const displayTheta = openPct === 0 ? autoTheta : theta;

  const followTargetRef      = useRef(0);
  const followEntryOffsetRef = useRef(0);
  const followEntryTimeRef   = useRef(0);
  const wasInHotzoneRef      = useRef(false);
  const followChaseRafRef    = useRef<number | null>(null);
  const followLeaveRafRef    = useRef<number | null>(null);
  const followLastFrameRef   = useRef(0);

  useEffect(() => () => {
    if (followChaseRafRef.current) {
      cancelAnimationFrame(followChaseRafRef.current);
    }
    if (followLeaveRafRef.current) {
      cancelAnimationFrame(followLeaveRafRef.current);
    }
  }, []);

  useEffect(() => {
    if (!interactive) {
      wasInHotzoneRef.current = false;
      if (followChaseRafRef.current) {
        cancelAnimationFrame(followChaseRafRef.current); followChaseRafRef.current = null;
      }
      if (followLeaveRafRef.current) {
        cancelAnimationFrame(followLeaveRafRef.current); followLeaveRafRef.current = null;
      }
      return;
    }

    function startChase() {
      if (followChaseRafRef.current) {
        return;
      } // already running
      followLastFrameRef.current = performance.now();
      function chaseTick(now: number) {
        const dt = Math.min(now - followLastFrameRef.current, 64); // cap at ~4 frames
        followLastFrameRef.current = now;
        const k    = 1 - Math.exp(-dt / chaseTauMs);
        const cur  = thetaRef.current;
        const next = cur + (followTargetRef.current - cur) * k;
        setTheta(next);
        thetaRef.current = next;
        followChaseRafRef.current = requestAnimationFrame(chaseTick);
      }
      followChaseRafRef.current = requestAnimationFrame(chaseTick);
    }

    function stopChase() {
      if (followChaseRafRef.current) {
        cancelAnimationFrame(followChaseRafRef.current); followChaseRafRef.current = null;
      }
    }

    function handleMouseMove(e: MouseEvent) {
      if (!irisContainerRef.current) {
        return;
      }
      const rect = irisContainerRef.current.getBoundingClientRect();

      const scale    = rect.width / 300;
      const irisSVGR = R_HOUSING - derivedConfig.bladeWidth;
      const D        = 2 * irisSVGR * scale;

      const cx = rect.left + rect.width  / 2;
      const cy = rect.top  + rect.height / 2;
      const hotLeft   = cx - D * hotzoneScaleH;
      const hotRight  = cx + D * hotzoneScaleH;
      const hotTop    = cy - D * hotzoneScaleV;
      const hotBottom = cy + D * hotzoneScaleV;

      const inHot =
        e.clientX >= hotLeft && e.clientX <= hotRight &&
        e.clientY >= hotTop  && e.clientY <= hotBottom;

      if (!inHot) {
        if (wasInHotzoneRef.current) {
          wasInHotzoneRef.current = false;
          stopChase();
          if (followLeaveRafRef.current) {
            cancelAnimationFrame(followLeaveRafRef.current);
          }
          const fromTheta = thetaRef.current;
          const toTheta   = autoTheta;
          const startMs   = performance.now();
          function leaveTick(now: number) {
            const p     = Math.min(1, (now - startMs) / easeOutMs);
            const eased = 1 - (1 - p) ** 3;
            const v     = fromTheta + (toTheta - fromTheta) * eased;
            setTheta(v);
            thetaRef.current = v;
            if (p < 1) {
              followLeaveRafRef.current = requestAnimationFrame(leaveTick);
            }
            else {
              followLeaveRafRef.current = null;
            }
          }
          followLeaveRafRef.current = requestAnimationFrame(leaveTick);
        }
        return;
      }

      if (followLeaveRafRef.current) {
        cancelAnimationFrame(followLeaveRafRef.current); followLeaveRafRef.current = null;
      }
      startChase();

      // Hotzone position maps linearly to inradius, not f-stop, so the wide end feels faster.
      const t       = Math.max(0, Math.min(1, (e.clientX - hotLeft) / (hotRight - hotLeft)));
      const rOpen   = inradiusOpen;
      const r22     = (openFStop * rOpen) / closedFStop;
      const targetR = rOpen + t * (r22 - rOpen); // linear in diameter
      const rawTarget = findThetaForInradius(targetR, derivedConfig, range);

      if (!wasInHotzoneRef.current) {
        followEntryOffsetRef.current = thetaRef.current - rawTarget;
        followEntryTimeRef.current   = performance.now();
        wasInHotzoneRef.current      = true;

      }

      const p                  = Math.min(1, (performance.now() - followEntryTimeRef.current) / catchupMs);
      const off                = followEntryOffsetRef.current * (1 - p) ** 2;
      followTargetRef.current  = rawTarget + off; // chase RAF reads this every frame
      startRef.current         = undefined;
    }

    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      stopChase();
      wasInHotzoneRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, openFStop, closedFStop, chaseTauMs, easeOutMs, catchupMs, hotzoneScaleH, hotzoneScaleV,
      range.min, range.max, inradiusOpen, autoTheta, derivedConfig.bladeWidth,
      derivedConfig.N, derivedConfig.pivotRadius, derivedConfig.pinDistance,
      derivedConfig.slotOffset, derivedConfig.bladeLength, derivedConfig.bladeCurvature]);

  return (
    <main
      style={{ background: "#f5f5f4", minHeight: "100vh" }}
      className="flex flex-col"
    >
      <div className="pt-8 pb-4" style={{ paddingLeft: 100, paddingRight: 100 }}>
        <div className="text-xs text-zinc-600 uppercase tracking-wider mb-1">
          Design Lab
        </div>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">
          Iris — Kinematic Parameter Studio
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          3-body kinematic model · base plate + actuator ring + {config.N}{" "}
          rigid blades · solved analytically
        </p>
      </div>

      <div className="flex-1 flex pb-8 gap-8 items-start" style={{ paddingLeft: 100, paddingRight: 100 }}>
        <div className="flex flex-col items-center gap-5">
          <div
            ref={irisContainerRef}
            style={{ width: 480, height: 480 }}
          >
            <IrisStage
              config={derivedConfig}
              theta={displayTheta}
              showMechanics={showMechanics}
              showFStopRing={showFStopRing}
              fStopRingOuter={fStopRingOuter}
              fStop={ringFStop}
              strokeWidth={strokeWidth}
              bladeColor={grayHex(bladeGray)}
              strokeColor={grayHex(strokeGray)}
              uid="main"
            />
          </div>

          <div className="w-full" style={{ maxWidth: 480 }}>
            <input
              type="range"
              min={range.min}
              max={range.max}
              step={0.001}
              value={theta}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setTheta(v);
                thetaRef.current = v;
                startRef.current = undefined;
              }}
              className="w-full"
              style={{ accentColor: "#52525b" }}
            />
            <div className="flex justify-between text-xs font-mono mt-1">
              <span className="text-zinc-500">open</span>
              <span className="text-zinc-600">
                {openPct}%
                <span className="text-zinc-400 ml-2">·</span>
                <span className="ml-2">{formatFStop(fStop)}</span>
              </span>
              <span className="text-zinc-500">closed</span>
            </div>
          </div>

        </div>

        <div className="flex flex-col items-center gap-2" style={{ paddingTop: 4 }}>
          <span className="text-xs font-mono text-zinc-400">
            {previewConfig.size} px
          </span>
          <Iris key={previewAnimKey} config={previewConfig} uid="lab-preview" />
        </div>

        <div style={{ flexShrink: 0, width: 580, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", columnGap: 32, paddingTop: 4 }}>

          <div className="space-y-5">
            <section className="space-y-2.5">
              <p className="text-sm font-semibold text-zinc-800 uppercase tracking-wide pt-3">Studio</p>
              <div className="flex gap-1.5">
                {(["lab", "production:hero", "production:nav"] as const).map((profile) => (
                  <button
                    key={profile}
                    onClick={() => setSelectedProfile(profile)}
                    className="flex-1 rounded py-1.5 text-xs font-mono font-medium transition-colors"
                    style={selectedProfile === profile
                      ? { background: "#18181b", color: "#fff", border: "1px solid #18181b" }
                      : { background: "#fff", color: "#3f3f46", border: "1px solid #d4d4d8" }}
                  >
                    {profile === "lab" ? "Lab"
                      : profile === "production:hero" ? "Hero"
                      : "Nav"}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={handleLoad}
                  className="flex-1 rounded py-1.5 text-xs font-medium transition-colors"
                  style={{ background: "#fff", color: "#3f3f46", border: "1px solid #d4d4d8" }}
                >
                  Load
                </button>
                <button
                  onClick={handleExport}
                  className="flex-1 rounded py-1.5 text-xs font-medium transition-colors"
                  style={{ background: "#18181b", color: "#fff", border: "1px solid #18181b" }}
                >
                  → Export
                </button>
              </div>
              {exportStatus && (
                exportStatus.startsWith("✓") ? (
                  <p className="text-xs font-mono text-green-600">{exportStatus}</p>
                ) : (
                  <pre className="text-xs font-mono text-red-500 whitespace-pre-wrap break-all max-h-48 overflow-y-auto rounded bg-red-50 p-2 border border-red-200">
                    {exportStatus}
                  </pre>
                )
              )}
              {selectedProfile !== "lab" && (
                <p className="text-xs font-mono text-zinc-400">
                  {selectedProfile === "production:hero" ? IRIS_HERO.size : IRIS_NAV.size} px production
                </p>
              )}
            </section>

            <section className="space-y-3">
              <p className="text-sm font-semibold text-zinc-800 uppercase tracking-wide pt-3">Animation</p>
              <button
                onClick={() => {
                  if (interactive) {
                    return;
                  } // disabled in follow-mouse mode
                  setIsPlaying((p) => !p);
                }}
                className="w-full rounded py-2 text-sm font-medium transition-colors"
                style={interactive
                  ? { background: "#fff", color: "#a1a1aa", border: "1px solid #e4e4e7", cursor: "not-allowed" }
                  : isPlaying
                    ? { background: "#18181b", color: "#fff", border: "1px solid #18181b" }
                    : { background: "#fff", color: "#3f3f46", border: "1px solid #d4d4d8" }}
              >
                {isPlaying && !interactive ? "⏸ Pause" : "▶ Play"}
              </button>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Speed</span>
                  <span className="font-mono">{speed.toFixed(2)} Hz</span>
                </div>
                <input type="range" min={0.05} max={1.5} step={0.05} value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full" style={{ accentColor: "#18181b" }}
                />
              </div>
              <label
                className="flex items-center gap-2 text-sm cursor-pointer select-none"
                style={{ color: "#3f3f46" }}
              >
                <input
                  type="checkbox"
                  checked={interactive}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setInteractive(on);
                    if (on) {
                      setIsPlaying(false);
                      startRef.current = undefined;
                    }
                  }}
                  style={{ accentColor: "#18181b", width: 14, height: 14 }}
                />
                Interactive (follow mouse)
              </label>
              <label
                className="flex items-center gap-2 text-sm cursor-pointer select-none"
                style={{ color: "#3f3f46" }}
              >
                <input
                  type="checkbox"
                  checked={onMount !== undefined}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setOnMount(checked ? { type: "sweep", sweepMs: 800, totalMs: 1000 } : undefined);
                    if (checked) {
                      setPreviewAnimKey(k => k + 1);
                    }
                  }}
                  style={{ accentColor: "#18181b", width: 14, height: 14 }}
                />
                Init Animation
              </label>
              {onMount !== undefined && onMount.type === "sweep" && (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Sweep</span>
                      <span className="text-zinc-700 font-mono">{onMount.sweepMs} ms</span>
                    </div>
                    <input type="range" min={200} max={2000} step={50} value={onMount.sweepMs}
                      onChange={(e) => {
                        const sweepMs = parseFloat(e.target.value);
                        setOnMount((prev): IrisAnimation | undefined => prev ? { ...prev, sweepMs } : prev);
                        setPreviewAnimKey(k => k + 1);
                      }}
                      className="w-full" style={{ accentColor: "#18181b" }}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Total</span>
                      <span className="text-zinc-700 font-mono">{onMount.totalMs} ms</span>
                    </div>
                    <input type="range"
                      min={onMount.sweepMs + 100} max={3000} step={50}
                      value={onMount.totalMs}
                      onChange={(e) => {
                        const totalMs = parseFloat(e.target.value);
                        setOnMount((prev): IrisAnimation | undefined => prev ? { ...prev, totalMs } : prev);
                        setPreviewAnimKey(k => k + 1);
                      }}
                      className="w-full" style={{ accentColor: "#18181b" }}
                    />
                  </div>
                </>
              )}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Open F-Stop</span>
                  <span className="font-mono">{formatFStop(openFStop)}</span>
                </div>
                <select
                  value={openFStop}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setOpenFStop(v);
                    if (defaultFStop < v) {
                      setDefaultFStop(v);
                    }
                  }}
                  style={{
                    width: "100%", padding: "5px 8px", borderRadius: 4,
                    border: "1px solid #d4d4d8", background: "#fff",
                    color: "#3f3f46", fontSize: 12, fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {FSTOP_OPTIONS.map(f => (
                    <option key={f} value={f}>{formatFStop(f)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Default F-Stop</span>
                  <span className="font-mono">{formatFStop(defaultFStop)}</span>
                </div>
                <select
                  value={defaultFStop}
                  onChange={(e) => setDefaultFStop(parseFloat(e.target.value))}
                  style={{
                    width: "100%", padding: "5px 8px", borderRadius: 4,
                    border: "1px solid #d4d4d8", background: "#fff",
                    color: "#3f3f46", fontSize: 12, fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {FSTOP_OPTIONS.filter(f => f >= openFStop).map(f => (
                    <option key={f} value={f}>{formatFStop(f)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Closed F-Stop</span>
                  <span className="font-mono">{formatFStop(closedFStop)}</span>
                </div>
                <select
                  value={closedFStop}
                  onChange={(e) => setClosedFStop(parseFloat(e.target.value))}
                  style={{
                    width: "100%", padding: "5px 8px", borderRadius: 4,
                    border: "1px solid #d4d4d8", background: "#fff",
                    color: "#3f3f46", fontSize: 12, fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {FSTOP_OPTIONS.filter(f => f > openFStop).map(f => (
                    <option key={f} value={f}>{formatFStop(f)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Chase τ</span>
                  <span className="text-zinc-700 font-mono">{chaseTauMs} ms</span>
                </div>
                <input type="range" min={10} max={200} step={5} value={chaseTauMs}
                  onChange={(e) => setChaseTauMs(parseFloat(e.target.value))}
                  className="w-full" style={{ accentColor: "#18181b" }}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Ease Out</span>
                  <span className="text-zinc-700 font-mono">{easeOutMs} ms</span>
                </div>
                <input type="range" min={100} max={2000} step={50} value={easeOutMs}
                  onChange={(e) => setEaseOutMs(parseFloat(e.target.value))}
                  className="w-full" style={{ accentColor: "#18181b" }}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Catchup</span>
                  <span className="text-zinc-700 font-mono">{catchupMs} ms</span>
                </div>
                <input type="range" min={50} max={1000} step={10} value={catchupMs}
                  onChange={(e) => setCatchupMs(parseFloat(e.target.value))}
                  className="w-full" style={{ accentColor: "#18181b" }}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Hotzone H</span>
                  <span className="text-zinc-700 font-mono">{hotzoneScaleH.toFixed(1)}×</span>
                </div>
                <input type="range" min={0.5} max={3} step={0.1} value={hotzoneScaleH}
                  onChange={(e) => setHotzoneScaleH(parseFloat(e.target.value))}
                  className="w-full" style={{ accentColor: "#18181b" }}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Hotzone V</span>
                  <span className="text-zinc-700 font-mono">{hotzoneScaleV.toFixed(1)}×</span>
                </div>
                <input type="range" min={0.5} max={3} step={0.1} value={hotzoneScaleV}
                  onChange={(e) => setHotzoneScaleV(parseFloat(e.target.value))}
                  className="w-full" style={{ accentColor: "#18181b" }}
                />
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-sm font-semibold text-zinc-800 uppercase tracking-wide pt-3">Overlay</p>
              <button
                onClick={() => setShowMechanics((v) => !v)}
                className="w-full rounded py-2 text-sm font-medium text-left px-3 transition-colors"
                style={showMechanics
                  ? { background: "#18181b", color: "#fff", border: "1px solid #18181b" }
                  : { background: "#fff", color: "#3f3f46", border: "1px solid #d4d4d8" }}
              >
                {showMechanics ? "◆ " : "◇ "}Mechanics
              </button>
              <button
                onClick={() => setShowFStopRing((v) => !v)}
                className="w-full rounded py-2 text-sm font-medium text-left px-3 transition-colors"
                style={showFStopRing
                  ? { background: "#18181b", color: "#fff", border: "1px solid #18181b" }
                  : { background: "#fff", color: "#3f3f46", border: "1px solid #d4d4d8" }}
              >
                {showFStopRing ? "◆ " : "◇ "}F-stop Ring
              </button>
              {showFStopRing && (
                <button
                  onClick={() => setFStopRingOuter((v) => !v)}
                  className="w-full rounded py-1.5 text-xs font-medium text-left px-3 transition-colors"
                  style={fStopRingOuter
                    ? { background: "#18181b", color: "#fff", border: "1px solid #18181b" }
                    : { background: "#fff", color: "#3f3f46", border: "1px solid #d4d4d8" }}
                >
                  {fStopRingOuter ? "● " : "○ "}Outer
                </button>
              )}
            </section>
          </div>

          <div className="space-y-5">
            <section className="space-y-2.5">
              <p className="text-sm font-semibold text-zinc-800 uppercase tracking-wide pt-3">Blades</p>
              <div className="flex gap-1.5">
                {[5, 6, 7, 9].map((n) => (
                  <button
                    key={n}
                    onClick={() => setField({ N: n })}
                    className="flex-1 rounded py-1.5 text-sm font-mono font-medium transition-colors"
                    style={config.N === n
                      ? { background: "#18181b", color: "#fff", border: "1px solid #18181b" }
                      : { background: "#fff", color: "#3f3f46", border: "1px solid #d4d4d8" }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {([
                { label: "Length", field: "bladeLength" as const, min: 80, max: 160, step: 1, fmt: (v: number) => v + " px" },
                { label: "Width",  field: "bladeWidth"  as const, min: 10, max: 45,  step: 1, fmt: (v: number) => v + " px" },
              ] as const).map(({ label, field, min, max, step, fmt }) => (
                <div key={field} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">{label}</span>
                    <span className="text-zinc-700 font-mono">{fmt(config[field])}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={config[field]}
                    onChange={(e) => setField({ [field]: parseFloat(e.target.value) })}
                    className="w-full" style={{ accentColor: "#18181b" }}
                  />
                </div>
              ))}
            </section>

            <section className="space-y-2.5">
              <p className="text-sm font-semibold text-zinc-800 uppercase tracking-wide pt-3">Mechanism</p>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Pivot r</span>
                <span className="text-zinc-500 font-mono">
                  {derivedConfig.pivotRadius.toFixed(0)} px
                  <span className="text-zinc-400"> (auto)</span>
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Pin dist</span>
                  <span className="text-zinc-700 font-mono">{config.pinDistance} px</span>
                </div>
                <input type="range"
                  min={derivedConfig.pivotRadius} max={config.bladeLength - 1} step={1}
                  value={config.pinDistance}
                  onChange={(e) => setField({ pinDistance: parseFloat(e.target.value) })}
                  className="w-full" style={{ accentColor: "#18181b" }}
                />
                <div className="flex justify-between text-xs text-zinc-400 font-mono">
                  <span>{Math.ceil(derivedConfig.pivotRadius)}</span>
                  <span>{config.bladeLength - 1}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Slot δ</span>
                  <span className="text-zinc-700 font-mono">{((config.slotOffset * 180) / Math.PI).toFixed(0)}°</span>
                </div>
                <input type="range"
                  min={Math.PI / 18} max={7 * Math.PI / 18} step={0.01}
                  value={config.slotOffset}
                  onChange={(e) => setField({ slotOffset: parseFloat(e.target.value) })}
                  className="w-full" style={{ accentColor: "#18181b" }}
                />
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="space-y-2.5">
              <p className="text-sm font-semibold text-zinc-800 uppercase tracking-wide pt-3">Appearance</p>

              <div className="space-y-1">
                <div className="flex justify-between text-xs items-center">
                  <span className="text-zinc-500">Fill</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-700 font-mono">{grayHex(bladeGray)}</span>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: grayHex(bladeGray), border: "1px solid #d4d4d8" }} />
                  </div>
                </div>
                <input type="range" min={0} max={255} step={1} value={bladeGray}
                  onChange={(e) => setBladeGray(parseFloat(e.target.value))}
                  className="w-full" style={{ accentColor: "#18181b" }}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs items-center">
                  <span className="text-zinc-500">Stroke color</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-700 font-mono">{grayHex(strokeGray)}</span>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: grayHex(strokeGray), border: "1px solid #d4d4d8" }} />
                  </div>
                </div>
                <input type="range" min={0} max={255} step={1} value={strokeGray}
                  onChange={(e) => setStrokeGray(parseFloat(e.target.value))}
                  className="w-full" style={{ accentColor: "#18181b" }}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Stroke width</span>
                  <span className="text-zinc-700 font-mono">{strokeWidth.toFixed(1)} px</span>
                </div>
                <input type="range" min={0} max={10} step={0.1} value={strokeWidth}
                  onChange={(e) => setStrokeWidth(parseFloat(e.target.value))}
                  className="w-full" style={{ accentColor: "#18181b" }}
                />
              </div>

            </section>

            <button
              onClick={() => {
                setConfig(DEFAULT_IRIS_CONFIG);
                setIsPlaying(false);
                startRef.current = undefined;
              }}
              className="w-full rounded py-1.5 text-xs font-medium transition-colors"
              style={{ background: "#fff", color: "#71717a", border: "1px solid #d4d4d8" }}
            >
              Reset defaults
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}
