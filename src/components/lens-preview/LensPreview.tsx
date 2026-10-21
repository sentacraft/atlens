"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import SpecialtyBadges from "@/components/lens/SpecialtyBadges";
import { PriceSection } from "@/components/price/PriceSection";
import { RetailersDropdown } from "@/components/price/RetailersDropdown";
import { Dialog, DialogClose, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { ICON_CLOSE_BTN_CLS, TEXT_LINK_CLS } from "@/config/ui-tokens";
import { Z } from "@/config/ui";
import { useLensPreview } from "@/hooks/useLensPreview";
import { useBreakpoint } from "@/hooks/useViewport";
import { lensQuery } from "@/lib/lens/lens-client";
import { lensDisplayName, lensSubtitleLine } from "@/lib/lens/format";
import { getLensImageUrl, lensImageStyle } from "@/lib/lens/image";
import { buildSpecGroupLabels, buildSpecGroups, resolveSpecGroups, rowPlainText } from "@/lib/lens/spec-groups";
import { deriveSpecialty } from "@/lib/lens/specialty";
import { lensPath } from "@/lib/url/routes";
import { cn } from "@/lib/utils";
import type { Lens } from "@/lib/types";

// The preview shows the lens page's first groups, optics and size; the rest stay on the page.
const PREVIEW_SPEC_GROUPS = 2;

/** A lens opened from Iris over the current page, named by the URL's `lens` param. */
export default function LensPreview() {
  const { lensId, closeLensPreview } = useLensPreview();
  const wide = useBreakpoint("lg");
  if (!lensId) {
    return null;
  }
  return wide ? (
    <PreviewBeside lensId={lensId} onClose={closeLensPreview} />
  ) : (
    <Dialog open onOpenChange={(open) => !open && closeLensPreview()}>
      <DialogPopup className="max-w-2xl">
        <PreviewContent
          lensId={lensId}
          title={(text) => <DialogTitle className="text-lg leading-tight">{text}</DialogTitle>}
          close={(label) => (
            <DialogClose aria-label={label} className={cn(ICON_CLOSE_BTN_CLS, "size-9")}>
              <X className="size-4" />
            </DialogClose>
          )}
        />
      </DialogPopup>
    </Dialog>
  );
}

/**
 * Wide screens: over the page only, leaving Iris's side panel free to keep the conversation
 * going while the lens is open, so it is not modal.
 */
function PreviewBeside({ lensId, onClose }: { lensId: string; onClose: () => void }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      returnTo?.focus();
    };
  }, [onClose]);

  return (
    <div className={cn("fixed inset-x-0 bottom-0 top-[var(--nav-height)] right-[var(--iris-panel-width,0px)]", Z.fixed)}>
      <button type="button" tabIndex={-1} aria-hidden onClick={onClose} className="absolute inset-0 cursor-default bg-zinc-950/40" />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute inset-x-6 top-6 bottom-6 mx-auto flex max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl outline-none"
      >
        <PreviewContent
          lensId={lensId}
          title={(text) => (
            <h2 id={titleId} className="text-lg font-semibold leading-tight tracking-tight text-zinc-950">
              {text}
            </h2>
          )}
          close={(label) => (
            <button type="button" onClick={onClose} aria-label={label} className={cn(ICON_CLOSE_BTN_CLS, "size-9")}>
              <X className="size-4" />
            </button>
          )}
        />
      </section>
    </div>
  );
}

function PreviewContent({
  lensId,
  title,
  close,
}: {
  lensId: string;
  title: (text: string) => ReactNode;
  close: (label: string) => ReactNode;
}) {
  const t = useTranslations("LensPreview");
  const tBrand = useTranslations("Brands");
  const locale = useLocale();
  const lens = useQuery(lensQuery(lensId, locale));
  const brandName = lens.data ? tBrand(lens.data.brand) : "";

  return (
    <>
      <div className="flex shrink-0 items-center gap-3 border-b border-zinc-200 px-5 py-4">
        <div className="min-w-0 flex-1">
          {lens.data && <p className="text-xs text-zinc-500">{lensSubtitleLine(brandName, lens.data.series)}</p>}
          {title(lens.data ? lensDisplayName(brandName, lens.data.series, lens.data.model) : t("loading"))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {lens.data && (
            <Link href={lensPath(lens.data)} className={cn("text-[13px]", TEXT_LINK_CLS)}>
              {t("openFullPage")}
            </Link>
          )}
          {close(t("close"))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {lens.isError ? (
          <p className="text-sm text-zinc-500">{t("unavailable")}</p>
        ) : lens.data ? (
          <PreviewBody lens={lens.data} />
        ) : null}
      </div>
    </>
  );
}

function PreviewBody({ lens }: { lens: Lens }) {
  const t = useTranslations("LensDetail");
  const groups = resolveSpecGroups(buildSpecGroups(buildSpecGroupLabels(t)), lens).slice(0, PREVIEW_SPEC_GROUPS);
  const valueLabels = { yes: t("yes"), no: t("no"), partial: t("partial"), unknown: t("unknown"), missing: t("missing") };

  return (
    <div className="flex flex-col gap-5 sm:flex-row">
      <div className="mx-auto w-full max-w-56 shrink-0 sm:mx-0 sm:w-56">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50/70">
          <Image src={getLensImageUrl(lens.id)} alt={lens.model} fill sizes="224px" style={lensImageStyle} className="object-contain p-5" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <SpecialtyBadges {...deriveSpecialty(lens)} />
        <PriceSection lens={lens} />
        <div>
          <RetailersDropdown lens={lens} customId="preview" />
        </div>
        {groups.map((group) => (
          <section key={group.label}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{group.label}</h3>
            <dl className="mt-1.5 text-sm">
              {group.rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-4 border-t border-zinc-100 py-1.5">
                  <dt className="text-zinc-500">{row.label}</dt>
                  <dd className="text-right text-zinc-900 tabular-nums">{rowPlainText(row, valueLabels)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
