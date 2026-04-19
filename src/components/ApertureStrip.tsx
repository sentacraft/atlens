"use client";

// Lightweight aperture strip for mobile touch interaction.
// Renders a horizontally scrollable row of f-stop labels with feathered edges,
// mimicking the visible portion of a physical aperture ring.
//
// Semi-controlled: the external `fStop` prop drives the display position before
// the user's first interaction (e.g. during init animation sync). Once the user
// touches the strip, it becomes fully self-managed — snap positions are
// authoritative and the external prop is ignored.
//
// Every mark maps to an f-stop value: numeric marks map to themselves, the "A"
// mark maps to defaultFStop. All marks share identical snap/drive logic.

import { useRef, useState, useEffect } from "react";

// ── Marks ─────────────────────────────────────────────────────────────────────

type Mark = number | "A";

// "A" at index 0 maps to defaultFStop. All other marks are numeric f-stops.
const MARKS: Mark[] = ["A", 1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];

// Pixel spacing between consecutive marks. Chosen so ~3 marks are visible in
// the unfeathered centre zone.
const SPACING = 31; // reduced 30% from original 48, then an additional 10%

// Index of the nearest numeric mark to a given f-stop value.
function nearestNumericIndex(fStop: number): number {
  let best = 1;
  for (let i = 2; i < MARKS.length; i++) {
    if (Math.abs((MARKS[i] as number) - fStop) < Math.abs((MARKS[best] as number) - fStop)) {
      best = i;
    }
  }
  return best;
}

// Continuous mark index for a given scroll offset.
// Positive offset = strip moved right = lower index (toward A).
function offsetToIndex(offset: number, defaultIdx: number): number {
  return Math.max(0, Math.min(MARKS.length - 1, defaultIdx - offset / SPACING));
}

// Interpolated f-stop value for a continuous index.
// idx 0–1 interpolates between defaultFStop (A) and MARKS[1] (f/1.4).
// idx ≥ 1 interpolates between adjacent numeric marks as before.
function indexToFStop(idx: number, defaultFStop: number): number {
  if (idx < 1) {
    const frac = Math.max(0, idx);
    return defaultFStop + ((MARKS[1] as number) - defaultFStop) * frac;
  }
  const lo = Math.floor(idx);
  const hi = Math.min(MARKS.length - 1, lo + 1);
  return (MARKS[lo] as number) + ((MARKS[hi] as number) - (MARKS[lo] as number)) * (idx - lo);
}

// Continuous mark index for a given f-stop value (inverse of indexToFStop).
function fStopToIndex(fStop: number): number {
  if (fStop <= (MARKS[1] as number)) return 1;
  for (let i = 1; i < MARKS.length - 1; i++) {
    const lo = MARKS[i] as number;
    const hi = MARKS[i + 1] as number;
    if (fStop <= hi) return i + (fStop - lo) / (hi - lo);
  }
  return MARKS.length - 1;
}

function formatMark(mark: Mark): string {
  if (mark === "A") return "A";
  return (mark === 1.4 || mark === 2.8 || mark === 5.6)
    ? (mark as number).toFixed(1)
    : String(mark);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ApertureStripProps {
  /** F-stop the iris rests at — defines the strip centre (offset = 0). */
  defaultFStop: number;
  /**
   * Current f-stop from the parent Iris. Drives the strip position before the
   * user's first interaction (e.g. during init animation). Ignored after first touch.
   */
  fStop?: number;
  /**
   * True while the parent Iris is running its init animation. When this
   * transitions to false, the strip snaps to the A mark (resting position).
   */
  animating?: boolean;
  /** Delay before first appearance (ms). */
  showDelay?: number;
  /** Called on snap or drag with the target f-stop value. */
  onDrive: (fStop: number) => void;
}

export default function ApertureStrip({
  defaultFStop,
  fStop,
  animating = false,
  showDelay = 0,
  onDrive,
}: ApertureStripProps) {
  // defaultIdx: the mark index that sits at centre when offset = 0.
  const defaultIdx = nearestNumericIndex(defaultFStop);

  const [visible,  setVisible]  = useState(false);
  const [offset,   setOffset]   = useState(() => defaultIdx * SPACING); // start at A
  const [snapping, setSnapping] = useState(false);

  const dragRef              = useRef<{ startX: number; startOffset: number } | null>(null);
  const lastValidOffsetRef   = useRef(0);
  const snappingRef          = useRef(false);
  const userHasInteractedRef = useRef(false);

  // Clamp limits: rightmost = "A" at index 0, leftmost = f/22 at last index.
  const maxOffset =  defaultIdx * SPACING;
  const minOffset = -(MARKS.length - 1 - defaultIdx) * SPACING;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), showDelay);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync offset from external fStop — only while animating and before user touch.
  useEffect(() => {
    if (!animating || fStop === undefined || userHasInteractedRef.current || dragRef.current || snappingRef.current) return;
    const idx    = fStopToIndex(fStop);
    const target = Math.max(minOffset, Math.min(maxOffset, (defaultIdx - idx) * SPACING));
    setOffset(target);
  }, [animating, fStop, defaultIdx, minOffset, maxOffset]);

  // Track animation start/end transitions.
  // On start (false → true): release user-hold so the strip follows the animation.
  // On end   (true → false): snap back to A if the user hasn't re-grabbed the strip.
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

  // Resolve the f-stop value for a given mark index.
  // A (idx 0) maps to defaultFStop; all others map to their numeric value.
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
    if (!dragRef.current) return;
    // If the button was released outside the browser window, pointerup never
    // fired — detect this here and end the drag cleanly.
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
    if (!dragRef.current) return;
    const raw = dragRef.current.startOffset + (e.clientX - dragRef.current.startX);
    dragRef.current = null;
    snapToNearest(Math.max(minOffset, Math.min(maxOffset, raw)));
  }

  function onPointerCancel() {
    if (!dragRef.current) return;
    dragRef.current = null;
    snapToNearest(lastValidOffsetRef.current);
  }

  // Total pixel width of the marks row.
  const rowWidth = MARKS.length * SPACING;
  // Left edge so that mark[defaultIdx] sits at container centre when offset = 0.
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
      {/* Centre indicator tick */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 -top-0.5 -translate-x-1/2 w-px h-1.5 bg-current opacity-70 text-zinc-400 dark:text-zinc-300"
      />

      {/* Scrollable label track — overflow clips the marks row */}
      <div
        className="mt-2.5 h-[25px] overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none text-zinc-500 dark:text-zinc-400"
        style={{
          maskImage:       "linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%)",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {/* Marks row — absolutely positioned so the overflow clip works */}
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
