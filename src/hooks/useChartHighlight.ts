"use client";

import { useCallback, useState } from "react";
import { projectToUrl } from "@/lib/url/projection";
import { writeChartHighlight, type ChartHighlight } from "@/lib/url/charts";

/**
 * The pinned highlight, mirrored into the URL so a shared link opens with it, plus a hover preview
 * that stays out of the URL. `shown` is what the chart should emphasize right now.
 */
export function useChartHighlight(initial: ChartHighlight) {
  const [pinned, setPinned] = useState<ChartHighlight>(initial);
  const [preview, setPreview] = useState<ChartHighlight>({});

  const pin = useCallback((next: ChartHighlight) => {
    setPinned(next);
    projectToUrl((url) => writeChartHighlight(url, next));
  }, []);

  const shown: ChartHighlight = {
    brand: preview.brand ?? pinned.brand,
    focal: preview.focal ?? pinned.focal,
  };

  return { pinned, shown, pin, setPreview };
}
