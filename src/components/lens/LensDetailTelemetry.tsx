"use client";

import {
  useLensScrollTelemetry,
  useLensViewTelemetry,
} from "./LensDetailTelemetry.hooks";

interface Props {
  lensSlug: string;
}

export default function LensDetailTelemetry({ lensSlug }: Props) {
  useLensViewTelemetry(lensSlug);
  useLensScrollTelemetry(lensSlug);
  return null;
}
