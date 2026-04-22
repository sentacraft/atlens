"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Popover } from "@base-ui/react/popover";
import { Drawer } from "@base-ui/react/drawer";
import { Tabs } from "@base-ui/react/tabs";
import { useTranslations, useLocale } from "next-intl";
import { Share2, Copy, Check, Download, Loader2, Expand, SlidersHorizontal, ChevronDown, X } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Z } from "@/config/ui";
import type { Lens } from "@/lib/types";
import { rasterizePoster } from "@/lib/share-image";

// ── Poster title / slogan auto-generation ────────────────────────────────────

/** One title line per lens: "{Brand} {model}" */
function computePosterTitle(lenses: Lens[], tBrand: (key: string) => string): string[] {
  return lenses.map((l) => `${tBrand(l.brand)} ${l.model}`);
}

import { SharePoster, type PosterLabels } from "@/components/poster/SharePoster";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

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
  /** Pre-fill the poster title from a curated preset. User can still override in Customize. */
  presetTitle?: string;
}

export function ShareButton({ lenses, variant = "default", triggerClassName, presetTitle }: ShareButtonProps) {
  const t = useTranslations("Share");
  const locale = useLocale();
  const tImage = useTranslations("ShareImage");
  const tBrand = useTranslations("Brands");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [canShareFile, setCanShareFile] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  // Poster rasterization state (only needed for download / system share)
  const [posterGenerating, setPosterGenerating] = useState(false);

  // Ref to the rendered <SharePoster /> root node
  const posterRef = useRef<HTMLDivElement>(null);

  // Customization — preset title is used as the default if provided
  const [customTitle, setCustomTitle] = useState(presetTitle ?? "");
  const [customSlogan, setCustomSlogan] = useState("");
  const [customOpen, setCustomOpen] = useState(false);

  // Full-size lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [lightboxImageLoading, setLightboxImageLoading] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);
  const lightboxScrollRef = useRef<HTMLDivElement | null>(null);

  // Filename slug
  const slugRef = useRef("");

  useEffect(() => {
    setMounted(true);
    setShareUrl(window.location.href);
    setCanNativeShare("share" in navigator);

    // Check PNG file sharing support with a dummy file
    if ("canShare" in navigator) {
      const testFile = new File(["x"], "test.png", { type: "image/png" });
      setCanShareFile(
        (navigator as Navigator & { canShare: (d: object) => boolean }).canShare({
          files: [testFile],
        })
      );
    }

    const mq = window.matchMedia("(min-width: 640px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);

    return () => {
      mq.removeEventListener("change", handler);
    };
  }, []);

  // Reset scroll hint state when lightbox closes
  useEffect(() => {
    if (!lightboxOpen) {
      setHasScrolled(false);
      setIsScrollable(false);
    }
  }, [lightboxOpen]);

  // Keep shareUrl in sync when panel opens
  useEffect(() => {
    if (!open) return;
    setShareUrl(window.location.href);
    slugRef.current = lenses
      .map((l) => l.model.replace(/\s+/g, "-").toLowerCase())
      .join("_vs_")
      .slice(0, 60);
  }, [open, lenses]);

  // Auto-compute poster title and slogan from lens data
  const computedPosterTitle = computePosterTitle(lenses, tBrand);

  // Build poster labels from i18n
  const posterLabels: PosterLabels = {
    appName: "X-Glass",
    siteUrl: `xglass.sentacraft.com/${locale}`,
    cta: lenses.length === 1 ? tImage("ctaSingle") : tImage("cta"),
    comparison: computedPosterTitle,
    sectionFocalCoverage: tImage("sectionFocalCoverage"),
    sectionFocus: tImage("sectionFocus"),
    sectionSizeWeight: tImage("sectionSizeWeight"),
    sectionFeatures: tImage("sectionFeatures"),
    sectionDetails: tImage("sectionDetails"),
    minFocusLabel: tImage("minFocusLabel"),
    maxMagLabel: tImage("maxMagLabel"),
    macroLabel: tImage("macroLabel"),
    weightLabel: tImage("weightLabel"),
    dimensionsLabel: tImage("dimensionsLabel"),
    retractedLabel: tImage("retractedLabel"),
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
    motorOther: tImage("motorOther"),
    wide: tImage("wide"),
    tele: tImage("tele"),
    tagCine: tImage("tagCine"),
    tagAnamorphic: tImage("tagAnamorphic"),
    tagTilt: tImage("tagTilt"),
    tagShift: tImage("tagShift"),
    tagMacro: tImage("tagMacro"),
    tagUltraMacro: tImage("tagUltraMacro"),
    tagFisheye: tImage("tagFisheye"),
    tagProbe: tImage("tagProbe"),
    na: tImage("na"),
  };

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable
    }
  }, []);

  const handleNativeShare = useCallback(async () => {
    try {
      await navigator.share({
        title: lenses.map((l) => l.model).join(" vs "),
        url: window.location.href,
      });
    } catch {
      // user cancelled or not supported
    }
  }, [lenses]);

  const handleDownload = useCallback(async () => {
    if (!posterRef.current) return;
    setPosterGenerating(true);
    try {
      const url = await rasterizePoster(posterRef.current);
      const link = document.createElement("a");
      link.download = `x-glass_${slugRef.current}.png`;
      link.href = url;
      link.click();
    } catch (e) {
      console.error(e);
    } finally {
      setPosterGenerating(false);
    }
  }, []);

  const handleShareImage = useCallback(async () => {
    if (!posterRef.current) return;
    setPosterGenerating(true);
    let url: string | undefined;
    try {
      url = await rasterizePoster(posterRef.current);
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `x-glass_${slugRef.current}.png`, {
        type: "image/png",
      });
      await navigator.share({
        files: [file],
        title: lenses.map((l) => l.model).join(" vs "),
      });
    } catch (err) {
      // User cancelled — no fallback needed
      if (err instanceof Error && err.name === "AbortError") return;
      // Share API unsupported or failed — fall back to download
      if (url) {
        const link = document.createElement("a");
        link.download = `x-glass_${slugRef.current}.png`;
        link.href = url;
        link.click();
      }
    } finally {
      setPosterGenerating(false);
    }
  }, [lenses]);

  const handleOpenLightbox = useCallback(async () => {
    setLightboxOpen(true);
    if (!posterRef.current) return;
    setLightboxImageLoading(true);
    try {
      const url = await rasterizePoster(posterRef.current);
      setLightboxImageUrl(url);
    } catch (e) {
      console.error(e);
    } finally {
      setLightboxImageLoading(false);
    }
  }, []);

  const truncatedUrl =
    shareUrl.length > 56 ? shareUrl.slice(0, 56) + "…" : shareUrl;

  const lensCaption = lenses.map((l) => `${tBrand(l.brand)} · ${l.model}`).join(" / ");

  const triggerLabel = (
    <>
      <Share2 className="size-4" />
      <span>{t("button")}</span>
    </>
  );

  const tabClass =
    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 data-[active]:bg-white data-[active]:text-zinc-900 data-[active]:shadow-xs dark:text-zinc-400 dark:hover:text-zinc-50 dark:data-[active]:bg-zinc-700 dark:data-[active]:text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 cursor-pointer";

  const inputClass =
    "w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-600";

  const posterCustom = {
    title: customTitle.trim() || undefined,
    slogan: customSlogan.trim() || undefined,
  };

  const panelContent = (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {lenses.length === 1 ? t("titleSingle") : t("title")}
        </h2>
        <p className="text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
          {lensCaption}
        </p>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="image" className="flex flex-col gap-4">
        <Tabs.List className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          <Tabs.Tab value="image" className={tabClass}>
            {t("tabImage")}
          </Tabs.Tab>
          <Tabs.Tab value="link" className={tabClass}>
            {t("tabLink")}
          </Tabs.Tab>
        </Tabs.List>

        {/* ── Link tab ─────────────────────────────────────────── */}
        <Tabs.Panel value="link" className="flex flex-col gap-3">
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
                  : "bg-zinc-900 text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              )}
            >
              {copied ? (
                <>
                  <Check className="size-4" />
                  {t("copied")}
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  {t("copyLink")}
                </>
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
        </Tabs.Panel>

        {/* ── Image tab ────────────────────────────────────────── */}
        <Tabs.Panel value="image" className="flex flex-col gap-3">
          {/* Poster preview: full-bleed, breaks out of p-4 padding */}
          <div
            className="group relative -mx-4 cursor-zoom-in overflow-hidden"
            style={{ height: PREVIEW_H }}
            onClick={handleOpenLightbox}
          >
            {/* Scale wrapper: absolute so it doesn't affect flow height */}
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

            {/* Gradient fade at bottom */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white to-transparent dark:from-zinc-900" />

            {/* Expand hint on hover */}
            <div className="absolute right-2 top-2 rounded-md bg-black/30 p-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Expand className="size-3.5 text-white" />
            </div>
          </div>

          {/* Full-size lightbox */}
          <Dialog
            open={lightboxOpen}
            onOpenChange={(open) => {
              setLightboxOpen(open);
              if (!open) {
                setLightboxImageUrl(null);
                setLightboxImageLoading(false);
              }
            }}
          >
            <DialogContent
              noDefaultPositioning
              className="fixed inset-0 flex items-center justify-center border-0 bg-transparent p-0 shadow-none duration-100"
              backdropClassName="bg-zinc-950/75 transition-[background-color] duration-150"
              showCloseButton={false}
              onClick={(e) => {
                if (e.target === e.currentTarget) setLightboxOpen(false);
              }}
            >
              {/* Wrapper: anchor for the mobile close button only; NOT the resize-observed element */}
              <div className="relative w-[calc(100vw-44px)] max-w-[750px]">
                {/* Mobile-only close button — center sits on the top-right corner of the card */}
                <button
                  onClick={() => setLightboxOpen(false)}
                  className="absolute right-0 top-0 z-10 flex h-8 w-8 -translate-y-1/2 translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-zinc-500 shadow-md transition-colors hover:text-zinc-900 sm:hidden"
                  aria-label={t("close")}
                >
                  <X className="size-3.5" />
                </button>

                {/* Poster card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  className="relative w-full overflow-hidden rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.22),0_0_0_1px_rgba(0,0,0,0.06)]"
                >
                  {/* Rasterized poster image — naturally scales to card width, no zoom math needed */}
                  <div
                    ref={lightboxScrollRef}
                    className="max-h-[calc(100svh-3rem-10px)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-h-[calc(100svh-3rem)]"
                    onScroll={() => { if (!hasScrolled) setHasScrolled(true); }}
                  >
                    {lightboxImageLoading ? (
                      <div className="flex h-48 items-center justify-center">
                        <Loader2 className="size-6 animate-spin text-zinc-400" />
                      </div>
                    ) : lightboxImageUrl ? (
                      <img
                        src={lightboxImageUrl}
                        alt=""
                        className="w-full"
                        onLoad={() => {
                          const el = lightboxScrollRef.current;
                          if (el) setIsScrollable(el.scrollHeight > el.clientHeight + 1);
                        }}
                      />
                    ) : null}
                  </div>

                  {/* Scroll hint: bottom gradient + double chevron, disappears on first scroll */}
                  {isScrollable && !hasScrolled && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-28 flex-col items-center justify-end bg-[linear-gradient(to_top,white_30%,rgba(255,255,255,0.85)_60%,transparent)] pb-4">
                      <ChevronDown className="size-6 -mb-2 text-zinc-600" />
                      <ChevronDown className="size-6 text-zinc-600" />
                    </div>
                  )}
                </motion.div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Action row — Customize Popover on the left, share actions on the right */}
          <div className="flex gap-2">
              {/* Customize — Popover anchored to this trigger button */}
              <Popover.Root open={customOpen} onOpenChange={setCustomOpen}>
                <Popover.Trigger
                  title={t("customize")}
                  className={cn(
                    "flex items-center justify-center rounded-lg border px-3 py-2.5 outline-none transition-colors",
                    customOpen
                      ? "border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                      : "border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  )}
                >
                  <SlidersHorizontal className="size-4" />
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Positioner side="top" align="start" sideOffset={8} className={Z.overlay}>
                    <Popover.Popup className="w-72 origin-(--transform-origin) rounded-xl border border-zinc-200 bg-white p-3 shadow-lg duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:border-zinc-700 dark:bg-zinc-900">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-zinc-400 dark:text-zinc-500">
                            {t("customizeTitle")}
                          </label>
                          <input
                            type="text"
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            placeholder={computedPosterTitle.join(" · ")}
                            className={inputClass}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-zinc-400 dark:text-zinc-500">
                            {t("customizeSlogan")}
                          </label>
                          <input
                            type="text"
                            value={customSlogan}
                            onChange={(e) => setCustomSlogan(e.target.value)}
                            placeholder={t("customizeSloganPlaceholder")}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>

              {/* Share + Download */}
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

  const defaultTriggerClass =
    triggerClassName ??
    "flex cursor-pointer items-center gap-1.5 rounded-md p-1 text-sm text-zinc-500 outline-none transition-colors hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-400 dark:hover:text-zinc-50";

  const fabTriggerClass =
    "flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg outline-none transition-colors hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";

  const triggerContent = isFab ? (
    <Share2 className="size-5" />
  ) : (
    triggerLabel
  );

  // Before mount: static placeholder — must use the same class as the
  // mounted trigger so there is no visual jump after hydration.
  const shareControl = !mounted ? (
    <button
      disabled
      aria-hidden
      className={isFab ? fabTriggerClass + " cursor-default opacity-0" : defaultTriggerClass}
    >
      {triggerContent}
    </button>
  ) : isDesktop ? (
    <Popover.Root open={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
      <Popover.Trigger className={isFab ? fabTriggerClass : defaultTriggerClass}>
        {triggerContent}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side={isFab ? "top" : "bottom"} align="end" sideOffset={8}>
          <Popover.Popup className="w-96 max-h-[calc(100svh-80px)] overflow-y-auto origin-(--transform-origin) rounded-xl bg-white shadow-lg ring-1 ring-zinc-200 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:bg-zinc-900 dark:ring-zinc-800">
            {panelContent}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  ) : (
    <Drawer.Root
      open={open}
      onOpenChange={(nextOpen) => setOpen(nextOpen)}
      swipeDirection="down"
    >
      <Drawer.Trigger className={isFab ? fabTriggerClass : defaultTriggerClass}>
        {triggerContent}
      </Drawer.Trigger>
      <Drawer.Portal>
        {/* When the lightbox is open its own backdrop (z-60) covers everything;
            suppress the Drawer backdrop to avoid double-darkening the top half. */}
        <Drawer.Backdrop className={cn(
          `fixed inset-0 ${Z.overlay} transition-colors duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0`,
          lightboxOpen ? "bg-transparent" : "bg-black/40"
        )} />
        <Drawer.Popup className={`fixed inset-x-0 bottom-0 ${Z.overlay} max-h-[85svh] flex flex-col rounded-t-2xl bg-white pb-[var(--safe-inset-bottom)] ring-1 ring-zinc-200 duration-200 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom dark:bg-zinc-900 dark:ring-zinc-800`}>
          {/* Handle sits outside the scroll container so swipe-down reaches the drawer */}
          <div className="flex shrink-0 touch-none justify-center pb-1 pt-3">
            <div className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          </div>
          <div className="overflow-y-auto pb-8">
            {panelContent}
          </div>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  );

  // On mobile the Drawer (z-50) covers anything inside a parent stacking
  // context. Render the "Copied!" toast via portal at z-[70] so it is always
  // above the Drawer regardless of where ShareButton appears in the tree.
  const copiedToast =
    mounted && copied && !isDesktop
      ? createPortal(
          <div className={`pointer-events-none fixed top-4 left-1/2 ${Z.overlay} flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-150`}>
            <Check className="size-4" />
            {t("copied")}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {shareControl}
      {copiedToast}
    </>
  );
}
