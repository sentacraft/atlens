// Edited through /design-lab/iris. Derived parameters (pivotRadius, bladeCurvature) are computed
// by buildDerivedConfig() and never stored.

import type { StoredIrisParams } from "@/lib/iris/kinematics";

export const R_HOUSING = 100;

export interface IrisSweepAnimation {
  type: "sweep";
  sweepMs: number;
  totalMs: number;
}

export type IrisAnimation = IrisSweepAnimation;

export interface IrisHoverMode {
  type: "hover";
  hotzoneScaleH?: number;
  hotzoneScaleV?: number;
  easeOutMs?: number;
  catchupMs?: number;
}

export interface IrisTapMode {
  type: "tap";
  animation: IrisAnimation;
}

export type IrisInteractiveMode = IrisHoverMode | IrisTapMode;

export interface IrisConfig extends StoredIrisParams {
  size: number;

  // Undefined: Tailwind classes.
  bladeColor?: string;
  // Undefined: Tailwind classes.
  strokeColor?: string;
  strokeWidth?: number;

  closedFStop?: number;

  interactive?: IrisInteractiveMode;
  apertureStrip?: boolean;

  onMount?: IrisAnimation;
  chaseTauMs?: number;
}

export const IRIS_HERO: IrisConfig = {
  N: 7,
  pinDistance: 85,
  slotOffset: 0.804533,
  bladeLength: 120,
  bladeWidth: 40,
  openFStop: 1.4,
  defaultFStop: 4,
  size: 102,
  bladeColor: "#181818",
  strokeColor: "#b3b3b3",
  strokeWidth: 1,
  closedFStop: 22,
  interactive: {
    type: "tap",
    animation: { type: "sweep", sweepMs: 800, totalMs: 1500 },
  },
  apertureStrip: true,
  onMount: { type: "sweep", sweepMs: 800, totalMs: 1500 },
  chaseTauMs: 60,
};

export const IRIS_ASSISTANT: IrisConfig = {
  N: 7,
  pinDistance: 85,
  slotOffset: 0.804533,
  bladeLength: 120,
  bladeWidth: 40,
  openFStop: 1.4,
  defaultFStop: 4,
  size: 56,
  bladeColor: "#181818",
  strokeColor: "#b3b3b3",
  strokeWidth: 1,
  closedFStop: 22,
  interactive: {
    type: "tap",
    animation: { type: "sweep", sweepMs: 800, totalMs: 1500 },
  },
  apertureStrip: false,
  onMount: { type: "sweep", sweepMs: 800, totalMs: 1500 },
  chaseTauMs: 60,
};

export const IRIS_NAV: IrisConfig = {
  N: 5,
  pinDistance: 88,
  slotOffset: 0.6283,
  bladeLength: 115,
  bladeWidth: 45,
  openFStop: 1.4,
  defaultFStop: 4,
  size: 26,
  // Explicit colours: resvg (OG image, apple icon) cannot evaluate Tailwind classes.
  bladeColor: "#181818",
  strokeColor: "#ffffff",
  strokeWidth: 5,
};

/** The nav mark in the tab bar's colours: the blades follow the tab's text colour, grey or current. */
export const IRIS_TAB_BAR: IrisConfig = {
  ...IRIS_NAV,
  size: 20,
  bladeColor: "currentColor",
};

// No strokeColor: the stroke-background class cuts between blades; without it the translucent
// fills blend into one scalloped shape.
export const IRIS_PLACEHOLDER: IrisConfig = {
  N: 5,
  pinDistance: 88,
  slotOffset: 0.6283,
  bladeLength: 115,
  bladeWidth: 45,
  openFStop: 1.4,
  defaultFStop: 4,
  size: 120,
  // Solid fill: a transparent one lets the lower blade's edge show through the overlap.
  bladeColor: "#d4d4d8",
  strokeColor: "#ffffff",
  strokeWidth: 3,
};

export const IRIS_LAB: IrisConfig = {
  N: 7,
  pinDistance: 85,
  slotOffset: 0.804533,
  bladeLength: 120,
  bladeWidth: 40,
  openFStop: 1.4,
  defaultFStop: 4,
  size: 120,
  bladeColor: "#181818",
  strokeColor: "#b3b3b3",
  strokeWidth: 1,
  closedFStop: 22,
  interactive: {
    type: "hover",
    hotzoneScaleH: 2,
    hotzoneScaleV: 1.0,
    easeOutMs: 700,
    catchupMs: 300,
  },
  onMount: { type: "sweep", sweepMs: 800, totalMs: 1000 },
  chaseTauMs: 60,
};

