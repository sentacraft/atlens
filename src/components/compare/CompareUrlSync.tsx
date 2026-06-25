"use client";

import { useEffect } from "react";
import { useCompare } from "@/context/CompareProvider";
import { projectToUrl } from "@/lib/url/projection";

// Headless: projects compare state onto the compare page's URL (`?ids=A,B,C`),
// and only this page. Mounting it at the page level (not inside a renderer like
// CompareTable) keeps the projection alive if the presentation is swapped, and
// keeps CompareTable purely presentational. Page-scoped on purpose: CompareProvider
// is global, so syncing here (not in the provider) avoids writing ?ids= onto every
// route — other surfaces carry compare state via context only, with nothing to sync.
//
// `history.replaceState` (monkey-patched by Next.js) over `router.replace`: the ids
// are already authoritative on the client, so the address bar updates without an RSC
// round-trip while still notifying usePathname / useSearchParams subscribers. The
// projection is a pure function of compareIds (the URL only carries `ids`).
export default function CompareUrlSync() {
  const { compareIds } = useCompare();

  useEffect(() => {
    projectToUrl((url) => {
      // Own only `ids`; foreign params are left intact. Assign the query as a
      // string (not searchParams.set) so the commas in `ids` stay raw (`A,B`)
      // rather than percent-encoded.
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
