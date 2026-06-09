"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Popover } from "@base-ui/react/popover";
import { Drawer } from "@base-ui/react/drawer";
import { Tabs } from "@base-ui/react/tabs";
import { useTranslations, useLocale } from "next-intl";
import { Share2, Copy, Check, Download, Loader2, Expand } from "lucide-react";
import { cn } from "@/lib/utils";
import { Z } from "@/config/ui";
import type { Lens } from "@/lib/types";
import { rasterizePoster } from "@/lib/share-image";
import { track } from "@/lib/analytics/analytics";
import { SharePoster, type PosterLabels } from "@/components/poster/SharePoster";
import { useShareCapabilities } from "@/hooks/useShareCapabilities";
import { useLightbox } from "@/hooks/useLightbox";
import { LightboxDialog } from "./LightboxDialog";
import { CustomizePopover } from "./CustomizePopover";
import { lensDisplayName } from "@/lib/lens/format";

// Scale the 750px poster down to fit the panel content area
const POSTER_W = 750;
const PREVIEW_SCALE = 352 / POSTER_W; // ≈ 0.469
const PREVIEW_SCALED_W = POSTER_W * PREVIEW_SCALE; // 352px — visual width after scale
const PREVIEW_H = 310; // visible preview height in pixels

interface ShareButtonProps {
  lenses: Lens[];
  variant?: "default" | "fab";
  /** Override the default trigger button class (non-fab variant only). */
  triggerClassName?: string;
  /** Hide the text label, showing only the icon. */
  iconOnly?: boolean;
  /** Pre-fill the poster title from a curated preset. User can still override in Customize. */
  presetTitle?: string;
  /** Pre-fill the poster slogan from a curated preset subtitle. User can still override. */
  presetSubtitle?: string;
  /**
   * Link-only mode: skip the comparison-poster surface entirely and offer just
   * copy-link + native share. For pages whose subject isn't a ≤MAX_COMPARE lens
   * set (e.g. a collection of many lenses), where the spec poster doesn't apply.
   */
  linkOnly?: boolean;
  /** Native-share message body in linkOnly mode. Falls back to the lens CTA. */
  shareText?: string;
}

function computePosterTitle(
  lenses: Lens[],
  tBrand: (key: string) => string,
  tImage: (key: string, values?: Record<string, string>) => string,
): string[] {
  if (lenses.length >= 2) {
    const uniqueBrands = [...new Set(lenses.map((l) => tBrand(l.brand)))];
    return [tImage("comparisonTitle", { brands: uniqueBrands.join(" · ") })];
  }
  return lenses.map((l) => lensDisplayName(tBrand(l.brand), l.series, l.model));
}

export function ShareButton({ lenses, variant = "default", triggerClassName, iconOnly, presetTitle, presetSubtitle, linkOnly, shareText }: ShareButtonProps) {
  const t = useTranslations("Share");
  const locale = useLocale();
  const tImage = useTranslations("ShareImage");
  const tBrand = useTranslations("Brands");
  const tPricing = useTranslations("Pricing");

  const { mounted, isDesktop, canNativeShare, canShareFile } = useShareCapabilities();

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [posterGenerating, setPosterGenerating] = useState(false);
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [sloganOverride, setSloganOverride] = useState<string | null>(null);

  const posterRef = useRef<HTMLDivElement>(null);
  const slugRef = useRef("");

  const lightbox = useLightbox(posterRef);

  // Keep shareUrl and slug in sync when panel opens
  useEffect(() => {
    if (!open) {
      return;
    }
    setShareUrl(window.location.href);
    slugRef.current = lenses
      .map((l) => l.model.replace(/\s+/g, "-").toLowerCase())
      .join("_vs_")
      .slice(0, 60);
  }, [open, lenses]);

  const tSpecialty = useTranslations("SpecialtyBadge");
  const computedPosterTitle = computePosterTitle(lenses, tBrand, tImage);

  const effectiveTitle = titleOverride ?? presetTitle ?? "";
  const effectiveSlogan = sloganOverride ?? presetSubtitle ?? "";

  const posterLabels: PosterLabels = {
    appName: "Atlens",
    siteUrl: `atlens.app/${locale}`,
    brandTagline: tImage("brandTagline"),
    cta: lenses.length === 1 ? tImage("ctaSingle") : tImage("cta"),
    comparison: computedPosterTitle,
    sectionFocalCoverage: tImage("sectionFocalCoverage"),
    sectionFocus: tImage("sectionFocus"),
    sectionSizeWeight: tImage("sectionSizeWeight"),
    sectionFeatures: tImage("sectionFeatures"),
    minFocusLabel: tImage("minFocusLabel"),
    maxMagLabel: tImage("maxMagLabel"),
    macroLabel: tImage("macroLabel"),
    normalLabel: tImage("normalLabel"),
    weightLabel: tImage("weightLabel"),
    dimensionsLabel: tImage("dimensionsLabel"),
    filterLabel: tImage("filterLabel"),
    focusMotorLabel: tImage("focusMotorLabel"),
    tStopLabel: tImage("tStopLabel"),
    lensConfigLabel: tImage("lensConfigLabel"),
    featureWR: tImage("featureWR"),
    wrPartialSub: tImage("wrPartialSub"),
    featureOIS: tImage("featureOIS"),
    featureAF: tImage("featureAF"),
    featureApertureRing: tImage("featureApertureRing"),
    featureInternalFocusing: tImage("featureInternalFocusing"),
    motorLinear: tImage("motorLinear"),
    motorStepping: tImage("motorStepping"),
    motorDc: tImage("motorDc"),
    motorOther: tImage("motorOther"),
    wide: tImage("wide"),
    tele: tImage("tele"),
    tagCine: tSpecialty("cine"),
    tagAnamorphic: tSpecialty("anamorphic"),
    tagTilt: tSpecialty("tilt"),
    tagShift: tSpecialty("shift"),
    tagMacro: tSpecialty("macro"),
    tagFisheye: tSpecialty("fisheye"),
    tagProbe: tSpecialty("probe"),
    na: tImage("na"),
    priceLabel: tImage("priceLabel"),
    usedBadge: tImage("usedBadge"),
    cnyAmount: tPricing.raw("cnyAmount"),
    sampledAt: tPricing.raw("sampledAt"),
    disclaimerWarn: tPricing("disclaimerWarn"),
    locale,
  };

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyFailed(false);
      setCopied(true);
      track("share_action", { method: "copy_link" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 2000);
    }
  }, []);

  const handleNativeShare = useCallback(async () => {
    const isSingle = lenses.length === 1;
    const cta = shareText ?? (isSingle
      ? t("shareCtaSingle")
      : t("shareCtaMulti", { count: lenses.length }));
    const pageUrl = window.location.href;
    try {
      await navigator.share({
        // TODO: debug title/url field behavior across platforms before re-enabling
        // title: effectiveTitle.trim() || computedPosterTitle.join(" · "),
        text: `${cta}\n👉 ${pageUrl}`,
      });
      track("share_action", { method: "native" });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      toast.error(t("shareFailed"));
    }
  }, [lenses, shareText, t]);

  const handleDownload = useCallback(async () => {
    if (!posterRef.current) {
      return;
    }
    setPosterGenerating(true);
    try {
      const url = await rasterizePoster(posterRef.current);
      const link = document.createElement("a");
      link.download = `atlens_${slugRef.current}.png`;
      link.href = url;
      link.click();
      track("share_action", { method: "poster_download" });
    } catch (e) {
      console.error(e);
    } finally {
      setPosterGenerating(false);
    }
  }, []);

  const handleShareImage = useCallback(async () => {
    if (!posterRef.current) {
      return;
    }
    const posterTitle = effectiveTitle.trim() || computedPosterTitle.join(" · ");
    const isSingle = lenses.length === 1;
    const cta = isSingle
      ? t("shareCtaSingle")
      : t("shareCtaMulti", { count: lenses.length });
    const slogan = effectiveSlogan.trim();
    const textParts = [cta, slogan].filter(Boolean);
    const text = textParts.join("\n");

    setPosterGenerating(true);
    let blobUrl: string | undefined;
    try {
      // Cap share output at 1280px — the long-axis threshold used by the
      // most aggressive mainstream IM compressors. Staying at/below this
      // avoids the resize stage and only takes a single quality pass.
      blobUrl = await rasterizePoster(posterRef.current, { maxWidth: 1280 });
      const blob = await (await fetch(blobUrl)).blob();
      const file = new File([blob], `${posterTitle}.png`, { type: "image/png" });
      await navigator.share({
        files: [file],
        // TODO: debug title/url fields across platforms before re-enabling
        text,
      });
      track("share_action", { method: "poster_share" });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      if (blobUrl) {
        // Share API failed but poster was generated — fall back to download
        const link = document.createElement("a");
        link.download = `atlens_${slugRef.current}.png`;
        link.href = blobUrl;
        link.click();
      } else {
        toast.error(t("shareFailed"));
      }
    } finally {
      setPosterGenerating(false);
    }
  }, [effectiveTitle, effectiveSlogan, computedPosterTitle, lenses, t]);

  const truncatedUrl = shareUrl.length > 56 ? shareUrl.slice(0, 56) + "…" : shareUrl;
  const lensCaption = lenses.map((l) => lensDisplayName(tBrand(l.brand), l.series, l.model)).join(" / ");
  const posterCustom = {
    title: effectiveTitle.trim() || undefined,
    slogan: effectiveSlogan.trim() || undefined,
  };

  const tabClass =
    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 data-[active]:bg-white data-[active]:text-zinc-900 data-[active]:shadow-xs dark:text-zinc-400 dark:hover:text-zinc-50 dark:data-[active]:bg-zinc-700 dark:data-[active]:text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 cursor-pointer";

  // Copy-link + native-share controls. Shared between the Link tab (poster
  // mode) and the linkOnly panel so the two never drift.
  const linkSection = (
    <div className="flex flex-col gap-3">
      <div className="select-all break-all rounded-md bg-zinc-100 px-3 py-2.5 font-mono text-xs leading-relaxed text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        {truncatedUrl}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
            copied
              ? "bg-green-600 text-white hover:bg-green-700"
              : copyFailed
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-zinc-900 text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          )}
        >
          {copied ? (
            <><Check className="size-4" />{t("copied")}</>
          ) : copyFailed ? (
            <><Copy className="size-4" />{t("copyFailed")}</>
          ) : (
            <><Copy className="size-4" />{t("copyLink")}</>
          )}
        </button>
        {canNativeShare && (
          <button
            onClick={handleNativeShare}
            title={t("nativeShare")}
            className="flex items-center justify-center rounded-lg border border-zinc-200 px-3 py-2.5 text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Share2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );

  // Link-only panel: no poster surface, just the copy/share controls.
  const linkOnlyContent = (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        {t("button")}
      </h2>
      {linkSection}
    </div>
  );

  const panelContent = (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {lenses.length === 1 ? t("titleSingle") : t("title")}
        </h2>
        <p className="text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">{lensCaption}</p>
      </div>

      <Tabs.Root defaultValue="image" className="flex flex-col gap-4">
        <Tabs.List className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          <Tabs.Tab value="image" className={tabClass}>{t("tabImage")}</Tabs.Tab>
          <Tabs.Tab value="link" className={tabClass}>{t("tabLink")}</Tabs.Tab>
        </Tabs.List>

        {/* ── Link tab ─────────────────────────────────────────── */}
        <Tabs.Panel value="link">
          {linkSection}
        </Tabs.Panel>

        {/* ── Image tab ────────────────────────────────────────── */}
        <Tabs.Panel value="image" className="flex flex-col gap-3">
          {/* Poster preview: full-bleed, breaks out of p-4 padding */}
          <div
            className="group relative -mx-4 cursor-zoom-in overflow-hidden"
            style={{ height: PREVIEW_H }}
            onClick={lightbox.handleOpen}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: `calc(50% - ${PREVIEW_SCALED_W / 2}px)`,
                width: POSTER_W,
                transform: `scale(${PREVIEW_SCALE})`,
                transformOrigin: "top left",
                pointerEvents: "none",
              }}
              aria-hidden="true"
            >
              <SharePoster
                ref={posterRef}
                lenses={lenses}
                labels={posterLabels}
                custom={posterCustom}
                shareUrl={shareUrl}
              />
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white to-transparent dark:from-zinc-900" />
            <div className="absolute right-2 top-2 rounded-md bg-black/30 p-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Expand className="size-3.5 text-white" />
            </div>
          </div>

          <LightboxDialog {...lightbox} />

          {/* Action row */}
          <div className="flex gap-2">
            {/* Customize (title/slogan) is a nested popover — desktop only. On mobile the
                share surface is a drawer, where a nested popover-in-drawer is awkward, so
                the entry point is dropped entirely. */}
            {isDesktop && (
              <CustomizePopover
                title={effectiveTitle}
                slogan={effectiveSlogan}
                onTitleChange={(v) => setTitleOverride(v || null)}
                onSloganChange={(v) => setSloganOverride(v || null)}
                titlePlaceholder={computedPosterTitle.join(" · ")}
              />
            )}

            {canShareFile ? (
              <>
                <button
                  onClick={handleShareImage}
                  disabled={posterGenerating}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {posterGenerating ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
                  {t("posterShare")}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={posterGenerating}
                  title={t("posterDownload")}
                  className="flex items-center justify-center rounded-lg border border-zinc-200 px-3 py-2.5 text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Download className="size-4" />
                </button>
              </>
            ) : (
              <button
                onClick={handleDownload}
                disabled={posterGenerating}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {posterGenerating ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                {t("posterDownload")}
              </button>
            )}
          </div>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );

  const isFab = variant === "fab";
  const activePanel = linkOnly ? linkOnlyContent : panelContent;

  const defaultTriggerClass =
    triggerClassName ??
    "flex cursor-pointer items-center gap-1.5 rounded-md p-1 text-sm text-zinc-500 outline-none transition-colors hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-400 dark:hover:text-zinc-50";

  const fabTriggerClass =
    "flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg outline-none transition-colors hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";

  const triggerContent = isFab ? <Share2 className="size-5" /> : iconOnly ? (
    <Share2 className="size-4" />
  ) : (
    <><Share2 className="size-4" /><span className="max-xs:hidden @max-md:hidden">{t("button")}</span></>
  );

  const shareControl = !mounted ? (
    <button
      disabled
      aria-hidden
      className={isFab ? fabTriggerClass + " cursor-default opacity-0" : defaultTriggerClass}
    >
      {triggerContent}
    </button>
  ) : isDesktop ? (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={isFab ? fabTriggerClass : defaultTriggerClass}>
        {triggerContent}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side={isFab ? "top" : "bottom"} align="end" sideOffset={8}>
          <Popover.Popup className="w-96 max-h-[calc(100svh-80px)] overflow-y-auto origin-(--transform-origin) rounded-xl bg-white shadow-lg ring-1 ring-zinc-200 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:bg-zinc-900 dark:ring-zinc-800">
            {activePanel}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  ) : (
    <Drawer.Root open={open} onOpenChange={setOpen} swipeDirection="down">
      <Drawer.Trigger className={isFab ? fabTriggerClass : defaultTriggerClass}>
        {triggerContent}
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop className={cn(
          `fixed inset-0 ${Z.overlay} transition-colors duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0`,
          lightbox.open ? "bg-transparent" : "bg-black/40"
        )} />
        <Drawer.Viewport>
          <Drawer.Popup className={`fixed inset-x-0 bottom-0 ${Z.overlay} max-h-[85svh] flex flex-col rounded-t-2xl bg-white pb-[var(--safe-inset-bottom)] ring-1 ring-zinc-200 duration-200 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom dark:bg-zinc-900 dark:ring-zinc-800`}>
            <div className="flex shrink-0 touch-none justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            </div>
            <div className="overflow-y-auto pb-8">
              {activePanel}
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );

  return shareControl;
}
