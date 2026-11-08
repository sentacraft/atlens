"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { useNav } from "@/context/NavProvider";
import SectionChipRow, { type SectionNavItem } from "@/components/nav/SectionChipRow";
import SectionSideRail from "@/components/nav/SectionSideRail";
import { cn } from "@/lib/utils";

/**
 * How the page is laid out decides when the side rail fits in the margin. Static strings, so Tailwind
 * sees them. These viewport widths are the first paint's guess; once mounted, the rail is shown
 * only if it really fits, which also hides it while Iris's side panel narrows the page.
 */
const WIDTH_CLS = {
  reading: { rail: "hidden min-[1072px]:block", chips: "min-[1072px]:hidden" },
  detail: { rail: "hidden min-[1200px]:block", chips: "min-[1200px]:hidden" },
  wide: { rail: "hidden min-[1456px]:block", chips: "min-[1456px]:hidden" },
  none: { rail: "hidden", chips: "" },
} as const;

export type SectionNavWidth = keyof typeof WIDTH_CLS;

/** The rail is 10rem wide, 1.5rem off the page's content, which starts one gutter in. */
const RAIL_ROOM_PX = 144;

/** The same array while its content is the same, so the effects below do not rerun with every render. */
function useStableItems(items: readonly SectionNavItem[]): readonly SectionNavItem[] {
  const key = JSON.stringify(items);
  return useMemo(() => JSON.parse(key) as SectionNavItem[], [key]);
}

/** The ids of the sections that are on the page now: some render late, or only for some visitors. */
function usePresentItems(items: readonly SectionNavItem[]): SectionNavItem[] {
  const [presentIds, setPresentIds] = useState<ReadonlySet<string> | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function check() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setPresentIds((previous) => {
          const next = new Set(items.filter((item) => document.getElementById(item.id)).map((item) => item.id));
          const same = previous && previous.size === next.size && [...next].every((id) => previous.has(id));
          return same ? previous : next;
        });
      }, 50);
    }
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [items]);

  return useMemo(
    () => (presentIds ? items.filter((item) => presentIds.has(item.id)) : [...items]),
    [items, presentIds],
  );
}

/** Whether the page's left margin can hold the side rail; null until measured. */
function useRailFits(markerRef: RefObject<HTMLElement | null>): boolean | null {
  const [fits, setFits] = useState<boolean | null>(null);

  useEffect(() => {
    function measure() {
      const column = markerRef.current?.offsetParent;
      if (column) {
        setFits(column.getBoundingClientRect().left >= RAIL_ROOM_PX);
      }
    }
    measure();
    window.addEventListener("resize", measure);
    // Iris's side panel and the page's own padding change on a transition, with no resize event.
    window.addEventListener("transitionend", measure, true);
    const observer = new MutationObserver(measure);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("transitionend", measure, true);
      observer.disconnect();
    };
  }, [markerRef]);

  return fits;
}

/**
 * Jump links for a long page with sections: a list in the left margin when there is room, else a
 * row of chips under the nav. Put it in the page where the first section begins, inside a
 * `relative` box that is as wide as the page content.
 */
export default function SectionNav({
  items: itemsProp,
  ariaLabel,
  width,
  allItem,
  topSentinelId,
  className,
}: {
  items: readonly SectionNavItem[];
  ariaLabel: string;
  /** The page's width class, for when the margin holds the side rail; none keeps the chips. */
  width: SectionNavWidth;
  /** A first chip for the page top, as on the collections index. */
  allItem?: { label: string; count?: number };
  /** An element at the page top; the "all" chip is selected while it is in view. */
  topSentinelId?: string;
  className?: string;
}) {
  const { navHidden } = useNav();
  const items = useStableItems(itemsProp);
  const markerRef = useRef<HTMLDivElement>(null);
  const present = usePresentItems(items);
  const ids = useMemo(() => present.map((item) => item.id), [present]);
  const { activeId, scrollTo } = useScrollSpy(ids, { topSentinelId });
  const fits = useRailFits(markerRef);
  const [railTop, setRailTop] = useState<number | null>(null);
  const hashHandled = useRef(false);

  // The rail starts level with the first section, whatever sits above it.
  const firstId = present[0]?.id;
  useEffect(() => {
    const column = markerRef.current?.offsetParent;
    if (!column || !firstId) {
      return;
    }
    function place() {
      const first = document.getElementById(firstId ?? "");
      if (column && first) {
        setRailTop(first.getBoundingClientRect().top - column.getBoundingClientRect().top - column.clientTop);
      }
    }
    place();
    const observer = new ResizeObserver(place);
    observer.observe(column);
    return () => observer.disconnect();
  }, [firstId]);

  // A link to #section: sections that render late are not there for the browser's own jump.
  useEffect(() => {
    if (hashHandled.current) {
      return;
    }
    const target = decodeURIComponent(window.location.hash.slice(1));
    if (target && ids.includes(target)) {
      hashHandled.current = true;
      scrollTo(target);
    }
  }, [ids, scrollTo]);

  const select = useCallback(
    (id: string | null) => {
      scrollTo(id);
      const { pathname, search } = window.location;
      window.history.replaceState(null, "", id ? `#${id}` : `${pathname}${search}`);
    },
    [scrollTo],
  );

  if (present.length < 2) {
    return null;
  }
  const cls = WIDTH_CLS[width];

  return (
    <>
      <div ref={markerRef} aria-hidden="true" className="pointer-events-none absolute h-0 w-0" />
      {width !== "none" && (
        <div
          className={cn("absolute right-[calc(100%-1.5rem)] bottom-0 w-40", cls.rail, fits === false && "!hidden")}
          style={{ top: railTop ?? 0, visibility: railTop === null ? "hidden" : undefined }}
        >
          <div
            className="sticky transition-[top] duration-300 ease-in-out"
            style={{ top: navHidden ? "1.5rem" : "calc(var(--nav-height) + 1.5rem)" }}
          >
            <SectionSideRail items={present} activeId={activeId} onSelect={select} ariaLabel={ariaLabel} />
          </div>
        </div>
      )}
      <SectionChipRow
        items={present}
        activeId={activeId}
        onSelect={select}
        allItem={allItem}
        ariaLabel={ariaLabel}
        className={cn(cls.chips, fits === false && "!block", className)}
      />
    </>
  );
}
