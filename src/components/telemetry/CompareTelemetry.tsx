"use client";

import {
  useCompareScrollTelemetry,
  useCompareViewTelemetry,
} from "./CompareTelemetry.hooks";

interface Props {
  lensIds: string[];
}

export default function CompareTelemetry({ lensIds }: Props) {
  useCompareViewTelemetry(lensIds);
  useCompareScrollTelemetry(lensIds);
  return null;
}
