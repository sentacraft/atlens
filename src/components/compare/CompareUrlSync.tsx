"use client";

import { useEffect, useLayoutEffect } from "react";
import { useCompare } from "@/context/CompareProvider";
import { projectToUrl } from "@/lib/url/projection";

// Headless: syncs the compare page's `?ids` ⇄ compare context. Page-scoped so the
// global provider doesn't write ?ids= onto every route.
export default function CompareUrlSync({ initialIds }: { initialIds: string[] }) {
  const { compareIds, seed } = useCompare();

  // Seed from the server prop (changes only on navigation, not on our own
  // replaceState — so no read/write cycle); layout effect to land before paint.
  useLayoutEffect(() => {
    seed(initialIds);
  }, [initialIds, seed]);

  // Project context → URL. Assign url.search as a string so the commas stay raw.
  useEffect(() => {
    projectToUrl((url) => {
      url.searchParams.delete("ids");
      const rest = url.searchParams.toString();
      url.search =
        compareIds.length > 0
          ? (rest ? `${rest}&` : "") + `ids=${compareIds.join(",")}`
          : rest;
    });
  }, [compareIds]);

  return null;
}
