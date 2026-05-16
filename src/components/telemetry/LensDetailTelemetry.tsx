"use client";

import { useRef } from "react";
import {
  useLensDwellTelemetry,
  useLensScrollTelemetry,
  useLensViewTelemetry,
} from "./LensDetailTelemetry.hooks";

interface Props {
  lensSlug: string;
}

export default function LensDetailTelemetry({ lensSlug }: Props) {
  // Entry timestamp is shared between the view hook (writes it) and the
  // dwell hook (reads it to compute elapsed seconds), so it lives here.
  const enteredAtRef = useRef<number>(0);

  useLensViewTelemetry(lensSlug, enteredAtRef);
  useLensScrollTelemetry(lensSlug);
  useLensDwellTelemetry(lensSlug, enteredAtRef);

  return null;
}
