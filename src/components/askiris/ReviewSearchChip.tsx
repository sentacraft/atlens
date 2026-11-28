"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Drawer } from "@base-ui/react/drawer";
import { Popover } from "@base-ui/react/popover";
import { CirclePlay, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import ReviewSearchLinks from "@/components/lens/ReviewSearchLinks";
import { InlineChipContent } from "@/components/askiris/InlineChipContent";
import { CARD_SELECTED_BORDER_CLS, COMPARE_CHIP_STATE_CLS, POPUP_SCROLL_CLS } from "@/config/ui-tokens";
import { useBreakpoint } from "@/hooks/useViewport";
import type { LensLinkTarget } from "@/lib/ai/lens-ref";
import { track } from "@/lib/analytics/analytics";
import { getLensImageUrl, lensImageStyle } from "@/lib/lens/image";
import { buildReviewSearchLinks } from "@/lib/lens/review-search";
import { cn } from "@/lib/utils";

/**
 * Trigger and popup for external review and sample-photo searches: on desktop, a popover listing
 * each lens with compact platform pills; on mobile, a bottom drawer pairing a lens switcher with
 * a single detail-style platform list so controls never repeat across lenses.
 */
export default function ReviewSearchChip({
  lenses,
  className,
  iconClassName,
  iconPosition,
  ariaLabel,
  children,
}: {
  lenses: LensLinkTarget[];
  className: string;
  iconClassName: string;
  iconPosition: "leading" | "trailing";
  ariaLabel?: string;
  children?: ReactNode;
}) {
  const t = useTranslations("AskIris.reviewSearch");
  const tReviews = useTranslations("LensReviews");
  const locale = useLocale();
  const isDesktop = useBreakpoint("sm");
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const keyword = tReviews("searchKeyword");

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setSelectedIndex(0);
      track("askiris_review_search", { lens_count: lenses.length });
    }
  };

  const icon = <CirclePlay className={iconClassName} aria-hidden />;
  const trigger =
    iconPosition === "leading" ? (
      <>
        {icon}
        {children}
      </>
    ) : (
      <InlineChipContent icon={icon}>{children}</InlineChipContent>
    );

  const header = (
    <div className={cn("flex flex-col gap-0.5", !isDesktop && "pr-10")}>
      <p className={cn("font-semibold text-zinc-900", isDesktop ? "text-sm" : "text-base")}>{t("title")}</p>
      <p className={cn("text-zinc-500", isDesktop ? "text-xs" : "text-[13px]")}>{t("subtitle")}</p>
    </div>
  );

  const desktopBody = (
    <div className="flex flex-col gap-2.5">
      {header}
      <div className="divide-y divide-zinc-100">
        {lenses.map((lens) => (
          <section key={lens.id} className="flex items-start gap-3 py-3 first:pt-1 last:pb-0" aria-label={lens.name}>
            <span className="relative size-11 shrink-0 rounded-[10px] bg-zinc-100">
              <Image src={getLensImageUrl(lens.id)} alt="" fill sizes="44px" style={lensImageStyle} className="object-contain p-1" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug font-semibold text-zinc-900">{lens.name}</p>
              <div className="mt-2">
                <ReviewSearchLinks links={buildReviewSearchLinks({ names: lens.review, locale, reviewKeyword: keyword })} layout="pills" />
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );

  const safeIndex = lenses.length > 0 ? Math.min(selectedIndex, lenses.length - 1) : 0;
  const activeLens = lenses[safeIndex] ?? lenses[0];

  const mobileBody = (
    <div className="flex flex-col gap-3">
      {header}
      {lenses.length > 1 ? (
        <div className={cn("grid gap-2", lenses.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
          {lenses.map((lens, index) => {
            const selected = index === safeIndex;
            return (
              <button
                key={lens.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition-colors",
                  selected
                    ? `${CARD_SELECTED_BORDER_CLS} bg-zinc-50 text-zinc-900 shadow-none`
                    : `${COMPARE_CHIP_STATE_CLS.idle}`,
                )}
              >
                <span className="relative size-13 shrink-0 rounded-[10px] bg-zinc-100">
                  <Image src={getLensImageUrl(lens.id)} alt="" fill sizes="52px" style={lensImageStyle} className="object-contain p-1.5" />
                </span>
                <span className="line-clamp-2 text-xs leading-tight font-semibold">{lens.name}</span>
              </button>
            );
          })}
        </div>
      ) : activeLens ? (
        <div className="flex items-center gap-3">
          <span className="relative size-12 shrink-0 rounded-[10px] bg-zinc-100">
            <Image src={getLensImageUrl(activeLens.id)} alt="" fill sizes="48px" style={lensImageStyle} className="object-contain p-1" />
          </span>
          <p className="min-w-0 text-sm leading-snug font-semibold text-zinc-900">{activeLens.name}</p>
        </div>
      ) : null}
      {activeLens ? (
        <section aria-label={activeLens.name} className="flex flex-col gap-2">
          {lenses.length > 1 ? (
            <p className="text-sm leading-snug font-semibold text-zinc-900">{activeLens.name}</p>
          ) : null}
          <ReviewSearchLinks
            links={buildReviewSearchLinks({ names: activeLens.review, locale, reviewKeyword: keyword })}
            layout="list"
          />
        </section>
      ) : null}
    </div>
  );

  return isDesktop ? (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger
        aria-label={ariaLabel}
        className={cn(className, "data-[popup-open]:border-zinc-900 data-[popup-open]:bg-zinc-900 data-[popup-open]:text-white [&[data-popup-open]_svg]:text-white")}
      >
        {trigger}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="start" sideOffset={8} collisionPadding={12}>
          <Popover.Popup
            className={cn(
              POPUP_SCROLL_CLS,
              "max-h-[min(32rem,calc(100vh-3rem))] w-[26.5rem] max-w-[calc(100vw-24px)] origin-(--transform-origin) rounded-xl bg-white p-3.5 shadow-lg ring-1 ring-zinc-200 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
          >
            {desktopBody}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  ) : (
    <Drawer.Root open={open} onOpenChange={onOpenChange} swipeDirection="down">
      <Drawer.Trigger aria-label={ariaLabel} className={className}>
        {trigger}
      </Drawer.Trigger>
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
            <div className="overflow-y-auto px-4 pt-1 pb-6">{mobileBody}</div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
