// Brand identity configuration — single source of truth for the aperture mark.
// All Iris instances (Navbar, About, OG image, Apple icon) read their
// defaults from here. Update these values via the Aperture V2 Parameter Studio
// at /design-lab/iris and every static usage updates on next build.
//
// Stored fields are the "free parameters" of the iris kinematic model.
// Derived parameters (pivotRadius, bladeCurvature) are always computed at
// render time by buildDerivedConfig() and are never persisted here.

import type { StoredIrisParams } from "@/lib/iris-kinematics";

// ── Shared rendering constant ─────────────────────────────────────────────────
//
// SVG coordinate-space radius of the aperture housing ring. All Iris instances
// (component, OG image, apple icon, Design Lab) use the same scale; the SVG
// viewBox and pixel size control the final rendered size.

export const R_HOUSING = 100;

// ── IrisAnimation ─────────────────────────────────────────────────────────────
//
// Animations are identified by a `type` discriminant so new variants can be
// added to the union without touching existing callsites.
//
// Currently the only variant is "sweep": a two-phase aperture sweep:
//   Phase 1 (0 → sweepMs):       open → closedFStop  (linear target drive)
//   Phase 2 (sweepMs → totalMs): closedFStop → defaultFStop  (chase-smoothed)

export interface IrisSweepAnimation {
  type: "sweep";
  /** Duration of the open → closed sweep (ms). */
  sweepMs: number;
  /** Total duration including the closed → defaultFStop ease-back (ms). */
  totalMs: number;
}

// Extend this union when new animation types are added.
export type IrisAnimation = IrisSweepAnimation;

// ── IrisInteractiveMode ───────────────────────────────────────────────────────
//
// Discriminated union controlling how users interact with an Iris instance.
// The two modes are mutually exclusive — an instance is either hover-driven
// or tap-driven, never both.

export interface IrisHoverMode {
  type: "hover";
  /**
   * Horizontal scale factor applied to the iris diameter to compute the width
   * of the mouse interaction hotzone. Values > 1 widen the area, making the
   * control less sensitive.
   */
  hotzoneScaleH?: number;
  /** Vertical scale factor applied to the iris diameter for the hotzone height. */
  hotzoneScaleV?: number;
  /** Duration of the cubic ease-out return after the pointer leaves (ms). */
  easeOutMs?: number;
  /** Duration over which the entry jump-offset decays to zero (ms). */
  catchupMs?: number;
}

export interface IrisTapMode {
  type: "tap";
  /** Animation to play when the iris is clicked (desktop) or tapped (mobile). */
  animation: IrisAnimation;
}

export type IrisInteractiveMode = IrisHoverMode | IrisTapMode;

// ── IrisConfig ────────────────────────────────────────────────────────────────
//
// Full configuration for an Iris component instance. Extends the kinematic
// StoredIrisParams with size, appearance, and interaction settings. Named
// configs below are the single source of truth — the component does not carry
// separate defaults for these properties.

export interface IrisConfig extends StoredIrisParams {
  // ── Size ────────────────────────────────────────────────────────────────────
  /** Render size in px. */
  size: number;

  // ── Appearance ──────────────────────────────────────────────────────────────
  /** Blade fill colour. Undefined = Tailwind dark/light automatic. */
  bladeColor?: string;
  /** Blade gap stroke colour. Undefined = Tailwind dark/light automatic. */
  strokeColor?: string;
  /** Blade gap stroke width in SVG units. */
  strokeWidth?: number;

  // ── Aperture limits ──────────────────────────────────────────────────────────
  /**
   * Hard stop for aperture — the minimum opening (maximum f-number) reachable
   * by any interaction or animation. Applies globally: hover drag, tap animation
   * end-point, and aperture strip. Defaults to 22 when absent.
   */
  closedFStop?: number;

  // ── Interaction ─────────────────────────────────────────────────────────────
  /**
   * Interaction mode. Absent = no interaction.
   * "hover" — aperture tracks horizontal mouse position across the hotzone.
   * "tap"   — clicking (desktop) or touching (mobile) plays an animation.
   * The two modes are mutually exclusive.
   */
  interactive?: IrisInteractiveMode;
  /**
   * When true, renders a mobile aperture-ring strip below the iris (hidden on
   * md+ screens). Lets touch users drag through f-stops; "A" snaps back to
   * defaultFStop via releaseControl.
   */
  apertureStrip?: boolean;

  // ── Animation ────────────────────────────────────────────────────────────────
  /**
   * Animation to play on component mount. Absence disables the mount animation.
   * Independent of the interaction mode — any Iris can have a mount animation
   * regardless of whether it is interactive.
   */
  onMount?: IrisAnimation;
  /**
   * Exponential-smoothing time constant for the chase loop (ms). Shared by all
   * animation systems: mount animation, hover tracking, and aperture strip drag.
   */
  chaseTauMs?: number;
}

// ── Named configs ─────────────────────────────────────────────────────────────
//
// Three optical-size tiers:
//   IRIS_HERO  → homepage hero (large, mount animation + aperture strip)
//   IRIS_NAV   → navbar icon, OG image, apple icon (small / static renders)
//   IRIS_LAB   → Design Lab workspace (tunable copy of IRIS_HERO, hover mode)
//
// Every field used by the component must be listed explicitly — there is no
// global defaults object. Optional fields absent from a config (e.g. IRIS_NAV
// has no interactive fields) are handled by the component with inline fallbacks.

export const IRIS_HERO: IrisConfig = {
  // Mechanical
  N: 7,
  pinDistance: 85,
  slotOffset: 0.804533,
  bladeLength: 120,
  bladeWidth: 40,
  openFStop: 1.4,
  defaultFStop: 4,
  // Size — matches the tight viewBox: visible iris ≈ 116 px at this render size
  size: 102,
  // Appearance
  bladeColor: "#181818",
  strokeColor: "#b3b3b3",
  strokeWidth: 1,
  // Aperture limits
  closedFStop: 22,
  // Interaction — tap triggers a sweep animation; hover is disabled on the homepage
  interactive: {
    type: "tap",
    animation: { type: "sweep", sweepMs: 800, totalMs: 1500 },
  },
  apertureStrip: true,
  // Animation
  onMount: { type: "sweep", sweepMs: 800, totalMs: 1500 },
  chaseTauMs: 60,
};

export const IRIS_NAV: IrisConfig = {
  // Mechanical
  N: 5,
  pinDistance: 88,
  slotOffset: 0.6283,
  bladeLength: 115,
  bladeWidth: 45,
  openFStop: 1.4,
  defaultFStop: 4,
  // Size
  size: 26,
  // Appearance — explicit colour required for resvg (OG/apple-icon) which
  // cannot evaluate Tailwind classes.
  bladeColor: "#181818",
  strokeColor: "#ffffff",
  strokeWidth: 5,
};

export const IRIS_LAB: IrisConfig = {
  // Mechanical
  N: 7,
  pinDistance: 85,
  slotOffset: 0.804533,
  bladeLength: 120,
  bladeWidth: 40,
  openFStop: 1.4,
  defaultFStop: 4,
  // Size — matches IRIS_HERO
  size: 120,
  // Appearance
  bladeColor: "#181818",
  strokeColor: "#b3b3b3",
  strokeWidth: 1,
  // Aperture limits
  closedFStop: 22,
  // Interaction — hover mode for the Design Lab scrubbing experience
  interactive: {
    type: "hover",
    hotzoneScaleH: 2,
    hotzoneScaleV: 1.0,
    easeOutMs: 700,
    catchupMs: 300,
  },
  // Animation
  onMount: { type: "sweep", sweepMs: 800, totalMs: 1000 },
  chaseTauMs: 60,
};

// Site-level metadata (name, description, theme color, PWA display mode, etc.)
// lives in src/config/site.ts — not here. This file is scoped to Iris rendering
// parameters only.
