"use client";

// Semi-controlled: `fStop` drives the position until the user's first touch, then is ignored.

import { useRef, useState, useEffect } from "react";

type Mark = number | "A";

const MARKS: Mark[] = ["A", 1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];

const SPACING = 31;

function nearestNumericIndex(fStop: number): number {
  let best = 1;
  for (let i = 2; i < MARKS.length; i++) {
    if (Math.abs((MARKS[i] as number) - fStop) < Math.abs((MARKS[best] as number) - fStop)) {
      best = i;
    }
  }
  return best;
}

function offsetToIndex(offset: number, defaultIdx: number): number {
  return Math.max(0, Math.min(MARKS.length - 1, defaultIdx - offset / SPACING));
}

function indexToFStop(idx: number, defaultFStop: number): number {
  if (idx < 1) {
    const frac = Math.max(0, idx);
    return defaultFStop + ((MARKS[1] as number) - defaultFStop) * frac;
  }
  const lo = Math.floor(idx);
  const hi = Math.min(MARKS.length - 1, lo + 1);
  return (MARKS[lo] as number) + ((MARKS[hi] as number) - (MARKS[lo] as number)) * (idx - lo);
}

function fStopToIndex(fStop: number): number {
  if (fStop <= (MARKS[1] as number)) {
    return 1;
  }
  for (let i = 1; i < MARKS.length - 1; i++) {
    const lo = MARKS[i] as number;
    const hi = MARKS[i + 1] as number;
    if (fStop <= hi) {
      return i + (fStop - lo) / (hi - lo);
    }
  }
  return MARKS.length - 1;
}

function formatMark(mark: Mark): string {
  if (mark === "A") {
    return "A";
  }
  return (mark === 1.4 || mark === 2.8 || mark === 5.6)
    ? (mark as number).toFixed(1)
    : String(mark);
}

interface ApertureStripProps {
  defaultFStop: number;
  fStop?: number;
  animating?: boolean;
  showDelay?: number;
  onDrive: (fStop: number) => void;
}

export default function ApertureStrip({
  defaultFStop,
  fStop,
  animating = false,
  showDelay = 0,
  onDrive,
}: ApertureStripProps) {
  const defaultIdx = nearestNumericIndex(defaultFStop);

  const [visible,  setVisible]  = useState(false);
  const [offset,   setOffset]   = useState(() => defaultIdx * SPACING); // start at A
  const [snapping, setSnapping] = useState(false);

  const dragRef              = useRef<{ startX: number; startOffset: number } | null>(null);
  const lastValidOffsetRef   = useRef(0);
  const snappingRef          = useRef(false);
  const userHasInteractedRef = useRef(false);

  const maxOffset =  defaultIdx * SPACING;
  const minOffset = -(MARKS.length - 1 - defaultIdx) * SPACING;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), showDelay);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!animating || fStop === undefined || userHasInteractedRef.current || dragRef.current || snappingRef.current) {
      return;
    }
    const idx    = fStopToIndex(fStop);
    const target = Math.max(minOffset, Math.min(maxOffset, (defaultIdx - idx) * SPACING));
    setOffset(target);
  }, [animating, fStop, defaultIdx, minOffset, maxOffset]);

  const prevAnimatingRef = useRef(animating);
  useEffect(() => {
    if (!prevAnimatingRef.current && animating) {
      userHasInteractedRef.current = false;
    }
    if (prevAnimatingRef.current && !animating && !userHasInteractedRef.current) {
      setOffset(maxOffset);
    }
    prevAnimatingRef.current = animating;
  }, [animating, maxOffset]);

  function markFStopValue(idx: number): number {
    return idx === 0 ? defaultFStop : MARKS[idx] as number;
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startOffset: offset };
    userHasInteractedRef.current = true;
    setSnapping(false);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) {
      return;
    }
    // A button released outside the window never fires pointerup.
    if (e.buttons === 0) {
      dragRef.current = null;
      snapToNearest(lastValidOffsetRef.current);
      return;
    }
    const raw     = dragRef.current.startOffset + (e.clientX - dragRef.current.startX);
    const clamped = Math.max(minOffset, Math.min(maxOffset, raw));
    lastValidOffsetRef.current = clamped;
    setOffset(clamped);
    onDrive(indexToFStop(offsetToIndex(clamped, defaultIdx), defaultFStop));
  }

  function snapToNearest(clamped: number) {
    const continuous = offsetToIndex(clamped, defaultIdx);
    const nearestIdx = Math.round(continuous);
    setSnapping(true);
    snappingRef.current = true;
    setTimeout(() => { setSnapping(false); snappingRef.current = false; }, 220);
    setOffset((defaultIdx - nearestIdx) * SPACING);
    onDrive(markFStopValue(nearestIdx));
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) {
      return;
    }
    const raw = dragRef.current.startOffset + (e.clientX - dragRef.current.startX);
    dragRef.current = null;
    snapToNearest(Math.max(minOffset, Math.min(maxOffset, raw)));
  }

  function onPointerCancel() {
    if (!dragRef.current) {
      return;
    }
    dragRef.current = null;
    snapToNearest(lastValidOffsetRef.current);
  }

  const rowWidth = MARKS.length * SPACING;
  const rowLeft  = `calc(50% - ${(defaultIdx + 0.5) * SPACING}px)`;

  return (
    <div
      className="relative"
      style={{
        opacity:       visible ? 1 : 0,
        transition:    "opacity 0.6s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        aria-hidden="true"
        className="absolute left-1/2 -top-0.5 -translate-x-1/2 w-px h-1.5 bg-current opacity-70 text-zinc-400"
      />

      <div
        className="mt-2.5 h-[25px] overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none text-zinc-500"
        style={{
          maskImage:       "linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%)",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div
          className="absolute flex items-center h-full will-change-transform"
          style={{
            width:      rowWidth,
            left:       rowLeft,
            transform:  `translateX(${offset}px)`,
            transition: snapping ? "transform 0.22s ease-out" : "none",
          }}
        >
          {MARKS.map((mark, i) => (
            mark === "A" ? (
              <div
                key={i}
                className="flex-shrink-0 text-center text-xs font-semibold tracking-[0.03em] text-red-400"
                style={{ width: SPACING, opacity: 0.85 }}
              >
                A
              </div>
            ) : (
              <div
                key={i}
                className="flex-shrink-0 text-center text-xs font-medium tracking-[0.03em] tabular-nums opacity-60"
                style={{ width: SPACING }}
              >
                {formatMark(mark)}
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}
