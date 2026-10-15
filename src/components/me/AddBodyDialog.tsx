"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { BODY_SERIES, type Body } from "@/lib/body/schema";
import { bodies } from "@/lib/body/data";
import type { Mount } from "@/lib/types";
import {
  CHIP_ACTIVE_CLS,
  CHIP_BASE_CLS,
  CHIP_IDLE_CLS,
  FROSTED_OVERLAY_CHROME_CLS,
  ICON_CLOSE_BTN_CLS,
} from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import SegmentedControl from "@/components/ui/segmented-control";

/** Each series' bodies, newest first, for one mount. */
function seriesGroups(mount: Mount) {
  return BODY_SERIES.map((series) => ({
    series,
    bodies: bodies
      .filter((body) => body.mount === mount && body.series === series)
      .sort((a, b) => b.releaseYear - a.releaseYear),
  })).filter((group) => group.bodies.length > 0);
}

export default function AddBodyDialog({
  open,
  onOpenChange,
  defaultMount,
  ownedIds,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMount: Mount;
  ownedIds: ReadonlySet<string>;
  onAdd: (body: Body) => void;
}) {
  const t = useTranslations("Profile");
  const m = useTranslations("MountSwitcher");
  // Null until the viewer switches format, so each opening starts on the current mount.
  const [picked, setPicked] = useState<Mount | null>(null);
  const mount = picked ?? defaultMount;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPicked(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPopup className="flex max-h-[85svh] w-full max-w-xl flex-col overflow-hidden">
        <DialogHeader className="pr-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle>{t("addBody")}</DialogTitle>
              <DialogDescription>{t("addBodyDescription")}</DialogDescription>
            </div>
            <DialogClose className={cn(ICON_CLOSE_BTN_CLS, FROSTED_OVERLAY_CHROME_CLS, "hidden h-9 w-9 shrink-0 sm:inline-flex")}>
              <X className="h-4 w-4" />
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5">
          <SegmentedControl<Mount>
            ariaLabel={t("sensorFormat")}
            value={mount}
            options={[
              { value: "X", label: { default: m("xCaption") } },
              { value: "G", label: { default: m("gfxCaption") } },
            ]}
            onChange={setPicked}
            equalWidth
          />
          {seriesGroups(mount).map((group) => (
            <section key={group.series} className="flex flex-col gap-2">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                {group.series}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {group.bodies.map((body) => {
                  const owned = ownedIds.has(body.id);
                  return (
                    <button
                      key={body.id}
                      type="button"
                      disabled={owned}
                      aria-pressed={owned}
                      onClick={() => onAdd(body)}
                      className={cn(
                        CHIP_BASE_CLS,
                        "h-9 px-3 text-[13px]",
                        owned ? cn(CHIP_ACTIVE_CLS, "cursor-default") : CHIP_IDLE_CLS,
                      )}
                    >
                      {owned && <Check className="h-3.5 w-3.5" />}
                      {body.name}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </DialogPopup>
    </Dialog>
  );
}
