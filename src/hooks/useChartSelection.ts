"use client";

import { useCallback, useState } from "react";
import { projectToUrl } from "@/lib/url/projection";
import { writeChartSelection, type ChartSelection } from "@/lib/url/charts";

/**
 * The chosen brand and focused lens, mirrored into the URL so a shared link opens with them, plus a
 * brand hover preview that stays out of the URL. `shown` is what the chart should apply right now.
 */
export function useChartSelection(initial: ChartSelection) {
  const [selected, setSelected] = useState<ChartSelection>(initial);
  const [preview, setPreview] = useState<ChartSelection>({});

  const select = useCallback((next: ChartSelection) => {
    setSelected(next);
    projectToUrl((url) => writeChartSelection(url, next));
  }, []);

  const shown: ChartSelection = { brand: preview.brand ?? selected.brand, lens: selected.lens };

  return { selected, shown, select, setPreview };
}
