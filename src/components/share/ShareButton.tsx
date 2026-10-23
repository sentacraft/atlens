"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Popover } from "@base-ui/react/popover";
import { Drawer } from "@base-ui/react/drawer";
import { Tabs } from "@base-ui/react/tabs";
import { useTranslations } from "next-intl";
import { Share2, Copy, Check, Download, Loader2, Expand } from "lucide-react";
import { cn } from "@/lib/utils";
import { SEGMENTED_LIST_CLS, SEGMENTED_TAB_CLS } from "@/config/ui-tokens";
import { rasterizePoster } from "@/lib/share-image";
import { track } from "@/lib/analytics/analytics";
import { useShareCapabilities } from "@/hooks/useShareCapabilities";
import { useLightbox } from "@/hooks/useLightbox";
import { LightboxDialog } from "./LightboxDialog";
import { useSupportDialog } from "@/context/SupportDialogProvider";
import { browserPromptStore, claimPrompt } from "@/lib/support-prompts";

const PREVIEW_W = 352;
const PREVIEW_H = 310;

/** An image the page offers alongside its link, rendered at full size, previewed scaled down, rasterized on demand. */
export interface SharePoster {
  content: React.ReactNode;
  /** Natural width in px; the preview scales the poster down to fit the panel. */
  width: number;
  fileName: string;
  /** Text the system share sheet sends with the image. */
  imageText: string;
  /** Controls beside the image buttons, such as the lens poster's customize popover. */
  extraActions?: React.ReactNode;
}

interface ShareButtonProps {
  heading: string;
  caption?: string;
  /** Text the system share sheet sends with the link. */
  shareText: string;
  poster?: SharePoster;
  /** Trigger label, always shown; without it the plain "Share" hides on narrow screens. */
  label?: string;
  variant?: "default" | "fab";
  triggerClassName?: string;
  iconOnly?: boolean;
}

export function ShareButton({ heading, caption, shareText, poster, label, variant = "default", triggerClassName, iconOnly }: ShareButtonProps) {
  const t = useTranslations("Share");
  const tSupport = useTranslations("Support");
  const openSupport = useSupportDialog();

  const { mounted, isDesktop, canNativeShare, canShareFile } = useShareCapabilities();

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [posterGenerating, setPosterGenerating] = useState(false);

  const posterRef = useRef<HTMLDivElement | null>(null);
  const lightbox = useLightbox(posterRef);
  const [posterHeight, setPosterHeight] = useState(0);
  const resizeObserver = useRef<ResizeObserver | null>(null);
  // A callback ref: the poster mounts inside a portal only once the panel opens.
  const attachPoster = useCallback((el: HTMLDivElement | null) => {
    posterRef.current = el;
    resizeObserver.current?.disconnect();
    if (el) {
      resizeObserver.current = new ResizeObserver(() => setPosterHeight(el.scrollHeight));
      resizeObserver.current.observe(el);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setShareUrl(window.location.href);
    }
  }, [open]);

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
    try {
      await navigator.share({
        // TODO: debug title/url field behavior across platforms before re-enabling
        text: `${shareText}\n👉 ${window.location.href}`,
      });
      track("share_action", { method: "native" });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      toast.error(t("shareFailed"));
    }
  }, [shareText, t]);

  const offerSupport = useCallback(
    (title: string) => {
      if (!claimPrompt(browserPromptStore(), "poster")) {
        return;
      }
      track("support_prompt", { prompt: "poster_toast", action: "shown" });
      toast(title, {
        description: tSupport("posterBody"),
        duration: 8000,
        action: {
          label: tSupport("posterAction"),
          onClick: () => {
            track("support_prompt", { prompt: "poster_toast", action: "opened" });
            openSupport("poster_toast");
          },
        },
      });
    },
    [openSupport, tSupport],
  );

  const download = useCallback(
    (url: string) => {
      const link = document.createElement("a");
      link.download = `atlens_${poster?.fileName ?? "share"}.png`;
      link.href = url;
      link.click();
    },
    [poster?.fileName],
  );

  const handleDownload = useCallback(async () => {
    if (!posterRef.current) {
      return;
    }
    setPosterGenerating(true);
    try {
      download(await rasterizePoster(posterRef.current));
      track("share_action", { method: "poster_download" });
      offerSupport(tSupport("posterSaved"));
    } catch (e) {
      console.error(e);
    } finally {
      setPosterGenerating(false);
    }
  }, [download, offerSupport, tSupport]);

  const handleShareImage = useCallback(async () => {
    if (!posterRef.current || !poster) {
      return;
    }
    setPosterGenerating(true);
    let blobUrl: string | undefined;
    try {
      // 1280px is the long-axis threshold of the most aggressive IM compressors.
      blobUrl = await rasterizePoster(posterRef.current, { maxWidth: 1280 });
      const blob = await (await fetch(blobUrl)).blob();
      const file = new File([blob], `${poster.fileName}.png`, { type: "image/png" });
      await navigator.share({
        files: [file],
        // TODO: debug title/url fields across platforms before re-enabling
        text: poster.imageText,
      });
      track("share_action", { method: "poster_share" });
      offerSupport(tSupport("posterShared"));
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      if (blobUrl) {
        download(blobUrl);
      } else {
        toast.error(t("shareFailed"));
      }
    } finally {
      setPosterGenerating(false);
    }
  }, [poster, download, offerSupport, t, tSupport]);

  const truncatedUrl = shareUrl.length > 56 ? shareUrl.slice(0, 56) + "…" : shareUrl;

  const linkSection = (
    <div className="flex flex-col gap-3">
      <div className="select-all break-all rounded-md bg-zinc-100 px-3 py-2.5 font-mono text-xs leading-relaxed text-zinc-500">
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
                : "bg-zinc-900 text-zinc-50 hover:bg-zinc-700"
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
            className="flex items-center justify-center rounded-lg border border-zinc-200 px-3 py-2.5 text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            <Share2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );

  const header = (
    <div className="flex flex-col gap-0.5">
      <h2 className="text-base font-semibold text-zinc-900">{heading}</h2>
      {caption && <p className="text-xs leading-relaxed text-zinc-400">{caption}</p>}
    </div>
  );

  const scale = poster ? PREVIEW_W / poster.width : 1;
  // A tall poster scrolls in the preview; a regular one is cropped and fades out.
  const long = poster !== undefined && posterHeight > poster.width * 2;

  const imagePanel = poster && (
    <Tabs.Panel value="image" className="flex flex-col gap-3">
      <div
        className={cn(
          "group relative -mx-4 cursor-zoom-in overflow-x-hidden",
          long ? "overflow-y-auto [scrollbar-gutter:stable] [scrollbar-width:thin]" : "overflow-y-hidden",
        )}
        style={{ height: PREVIEW_H }}
        onClick={lightbox.handleOpen}
      >
        <div className="relative mx-auto" style={{ width: PREVIEW_W, height: long ? posterHeight * scale : undefined }}>
          <div
            className="absolute left-0 top-0"
            style={{ width: poster.width, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}
            aria-hidden="true"
          >
            <div ref={attachPoster} style={{ width: poster.width }}>
              {poster.content}
            </div>
          </div>
        </div>
        {!long && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white to-transparent" />
            <div className="absolute right-2 top-2 rounded-md bg-black/30 p-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Expand className="size-3.5 text-white" />
            </div>
          </>
        )}
      </div>
      {long && (
        <p className="-mt-1 text-xs tabular-nums text-zinc-500">
          {t("longImage", { width: String(poster.width), height: String(Math.round(posterHeight)) })}
        </p>
      )}

      <LightboxDialog {...lightbox} />

      <div className="flex gap-2">
        {poster.extraActions}
        {canShareFile ? (
          <>
            <button
              onClick={handleShareImage}
              disabled={posterGenerating}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-700 disabled:opacity-40"
            >
              {posterGenerating ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
              {t("posterShare")}
            </button>
            <button
              onClick={handleDownload}
              disabled={posterGenerating}
              title={t("posterDownload")}
              aria-label={t("posterDownload")}
              className="flex items-center justify-center rounded-lg border border-zinc-200 px-3 py-2.5 text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-40"
            >
              <Download className="size-4" />
            </button>
          </>
        ) : (
          <button
            onClick={handleDownload}
            disabled={posterGenerating}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-700 disabled:opacity-40"
          >
            {posterGenerating ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {t("posterDownload")}
          </button>
        )}
      </div>
    </Tabs.Panel>
  );

  const activePanel = (
    <div className="flex flex-col gap-4 p-4">
      {header}
      {poster ? (
        <Tabs.Root defaultValue="image" className="flex flex-col gap-4">
          <Tabs.List className={SEGMENTED_LIST_CLS}>
            <Tabs.Tab value="image" className={SEGMENTED_TAB_CLS}>{t("tabImage")}</Tabs.Tab>
            <Tabs.Tab value="link" className={SEGMENTED_TAB_CLS}>{t("tabLink")}</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="link">{linkSection}</Tabs.Panel>
          {imagePanel}
        </Tabs.Root>
      ) : (
        linkSection
      )}
    </div>
  );

  const isFab = variant === "fab";

  const defaultTriggerClass =
    triggerClassName ??
    "flex cursor-pointer items-center gap-1.5 rounded-md p-1 text-sm text-zinc-500 outline-none transition-colors hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-400";

  const fabTriggerClass =
    "flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg outline-none transition-colors hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-400";

  const triggerContent = isFab ? <Share2 className="size-5" /> : iconOnly ? (
    <Share2 className="size-4" />
  ) : (
    <><Share2 className="size-4" />{label ? <span>{label}</span> : <span className="max-xs:hidden @max-md:hidden">{t("button")}</span>}</>
  );

  return !mounted ? (
    <button
      disabled
      aria-hidden
      className={isFab ? fabTriggerClass + " cursor-default opacity-0" : defaultTriggerClass}
    >
      {triggerContent}
    </button>
  ) : isDesktop ? (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger aria-label={label ?? t("button")} className={isFab ? fabTriggerClass : defaultTriggerClass}>
        {triggerContent}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side={isFab ? "top" : "bottom"} align="end" sideOffset={8}>
          <Popover.Popup className="w-96 max-h-[calc(var(--app-height)-80px)] overflow-y-auto origin-(--transform-origin) rounded-xl bg-white shadow-lg ring-1 ring-zinc-200 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            {activePanel}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  ) : (
    <Drawer.Root open={open} onOpenChange={setOpen} swipeDirection="down">
      <Drawer.Trigger aria-label={label ?? t("button")} className={isFab ? fabTriggerClass : defaultTriggerClass}>
        {triggerContent}
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop className={cn(
          `fixed inset-0 transition-colors duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0`,
          lightbox.open ? "bg-transparent" : "bg-black/40"
        )} />
        <Drawer.Viewport>
          <Drawer.Popup className={`fixed inset-x-0 bottom-0 max-h-[calc(var(--app-height)*0.85)] flex flex-col rounded-t-2xl bg-white pb-[var(--safe-inset-bottom)] ring-1 ring-zinc-200 duration-200 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom`}>
            <div className="flex shrink-0 touch-none justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-zinc-300" />
            </div>
            <div className="overflow-y-auto pb-8">
              {activePanel}
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
