"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Drawer } from "@base-ui/react/drawer";
import { Popover } from "@base-ui/react/popover";
import { CirclePlay, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import ReviewSearchLinks from "@/components/lens/ReviewSearchLinks";
import { useBreakpoint } from "@/hooks/useViewport";
import type { LensLinkTarget } from "@/lib/ai/lens-ref";
import { track } from "@/lib/analytics/analytics";
import { getLensImageUrl, lensImageStyle } from "@/lib/lens/image";
import { buildReviewSearchLinks } from "@/lib/lens/review-search";
import { cn } from "@/lib/utils";

/**
 * A link in Iris's prose that opens searches for the named lenses' reviews and samples on other
 * sites: a popover on wide screens, a bottom drawer on phones. Each lens gets one row of tiles, so
 * every lens the link names is in view at once.
 */
export default function ReviewSearchChip({
  lenses,
  className,
  iconClassName,
  children,
}: {
  lenses: LensLinkTarget[];
  className: string;
  iconClassName: string;
  children?: ReactNode;
}) {
  const t = useTranslations("AskIris.reviewSearch");
  const tReviews = useTranslations("LensReviews");
  const locale = useLocale();
  const isDesktop = useBreakpoint("sm");
  const [open, setOpen] = useState(false);
  const keyword = tReviews("searchKeyword");
  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      track("askiris_review_search", { lens_count: lenses.length });
    }
  };

  // Trails the label, as on the other chips: a leading icon would drop the chip below the line.
  const trigger = (
    <>
      {children}
      <CirclePlay className={iconClassName} aria-hidden />
    </>
  );

  const body = (
    <div className="flex flex-col gap-3">
      <div className={cn("flex flex-col gap-0.5", !isDesktop && "pr-10")}>
        <p className={cn("font-semibold text-zinc-900", isDesktop ? "text-sm" : "text-base")}>{t("title")}</p>
        <p className={cn("text-zinc-500", isDesktop ? "text-xs" : "text-[13px]")}>{t("subtitle")}</p>
      </div>
      {lenses.map((lens) => (
        <section key={lens.id} className="flex flex-col gap-1.5" aria-label={lens.name}>
          <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-zinc-900">
            <span className="relative size-6 shrink-0 rounded-md bg-zinc-100">
              <Image src={getLensImageUrl(lens.id)} alt="" fill sizes="24px" style={lensImageStyle} className="object-contain p-0.5" />
            </span>
            <span className="truncate">{lens.name}</span>
          </p>
          <ReviewSearchLinks links={buildReviewSearchLinks({ names: lens.review, locale, reviewKeyword: keyword })} layout="tiles" />
        </section>
      ))}
    </div>
  );

  return isDesktop ? (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger className={cn(className, "data-[popup-open]:bg-zinc-900 data-[popup-open]:text-white")}>
        {trigger}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="start" sideOffset={8} collisionPadding={12}>
          <Popover.Popup className="w-[22.5rem] max-w-[calc(100vw-24px)] origin-(--transform-origin) rounded-xl bg-white p-3 shadow-lg ring-1 ring-zinc-200 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            {body}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  ) : (
    <Drawer.Root open={open} onOpenChange={onOpenChange} swipeDirection="down">
      <Drawer.Trigger className={className}>{trigger}</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 bg-black/40 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <Drawer.Viewport>
          <Drawer.Popup className="fixed inset-x-0 bottom-0 flex max-h-[calc(var(--app-height)*0.85)] flex-col rounded-t-2xl bg-white pb-[var(--safe-inset-bottom)] ring-1 ring-zinc-200 duration-200 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom">
            <div className="flex shrink-0 touch-none justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-zinc-300" />
            </div>
            <Drawer.Close
              aria-label={t("close")}
              className="absolute top-2 right-2 grid size-11 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100"
            >
              <X className="size-[18px]" aria-hidden />
            </Drawer.Close>
            <div className="overflow-y-auto px-4 pt-1 pb-6">{body}</div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
