"use client";

import { useEffect, useLayoutEffect } from "react";
import { useCompare } from "@/context/CompareProvider";
import { projectToUrl } from "@/lib/url/projection";
import { COMPARE_IDS_PARAM } from "@/lib/url/compare";

// Page-scoped so the global provider does not write ?ids= onto every route.
export default function CompareUrlSync({ initialIds }: { initialIds: string[] }) {
  const { compareIds, seed } = useCompare();

  // The server prop changes only on navigation, never on our own replaceState.
  useLayoutEffect(() => {
    seed(initialIds);
  }, [initialIds, seed]);

  useEffect(() => {
    projectToUrl((url) => {
      url.searchParams.delete(COMPARE_IDS_PARAM);
      const rest = url.searchParams.toString();
      url.search =
        compareIds.length > 0
          ? (rest ? `${rest}&` : "") + `${COMPARE_IDS_PARAM}=${compareIds.join(",")}`
          : rest;
    });
  }, [compareIds]);

  return null;
}
