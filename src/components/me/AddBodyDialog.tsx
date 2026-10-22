"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { BODY_SERIES } from "@/lib/body/schema";
import { bodies } from "@/lib/body/data";
import type { Mount } from "@/lib/types";
import {
  ACTION_PRIMARY_CLS,
  CHIP_ACTIVE_CLS,
  CHIP_BASE_CLS,
  CHIP_IDLE_CLS,
  FROSTED_OVERLAY_CHROME_CLS,
  ICON_CLOSE_BTN_CLS,
} from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogCancel,
  DialogClose,
  DialogDescription,
  DialogFooter,
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
  owned,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMount: Mount;
  /** Catalog ids of the bodies the user already owns. */
  owned: ReadonlySet<string>;
  saving: boolean;
  onSave: (catalogIds: string[]) => void;
}) {
  const t = useTranslations("Profile");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="flex max-h-[calc(var(--app-height)*0.85)] w-full max-w-xl flex-col overflow-hidden">
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
        {open && (
          <BodyPicker
            defaultMount={defaultMount}
            owned={owned}
            saving={saving}
            onSave={onSave}
          />
        )}
      </DialogPopup>
    </Dialog>
  );
}

// Mounted per opening, so each opening starts with nothing selected.
function BodyPicker({
  defaultMount,
  owned,
  saving,
  onSave,
}: {
  defaultMount: Mount;
  owned: ReadonlySet<string>;
  saving: boolean;
  onSave: (catalogIds: string[]) => void;
}) {
  const t = useTranslations("Profile");
  const m = useTranslations("MountSwitcher");
  const [mount, setMount] = useState<Mount>(defaultMount);
  const [selected, setSelected] = useState<readonly string[]>([]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]));
  }

  return (
    <>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5">
        <SegmentedControl<Mount>
          ariaLabel={t("sensorFormat")}
          value={mount}
          options={[
            { value: "X", label: { default: m("xCaption") } },
            { value: "G", label: { default: m("gfxCaption") } },
          ]}
          onChange={setMount}
          layout="equal"
        />
        {seriesGroups(mount).map((group) => (
          <section key={group.series} className="flex flex-col gap-2">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              {group.series}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {group.bodies.map((body) => {
                const isOwned = owned.has(body.id);
                const isSelected = selected.includes(body.id);
                return (
                  <button
                    key={body.id}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={isOwned ? `${body.name} ${t("owned")}` : undefined}
                    disabled={isOwned}
                    onClick={() => toggle(body.id)}
                    className={cn(
                      CHIP_BASE_CLS,
                      "h-9 px-3 text-[13px]",
                      isOwned
                        ? "cursor-default border-transparent bg-zinc-100 text-zinc-400"
                        : isSelected
                          ? CHIP_ACTIVE_CLS
                          : CHIP_IDLE_CLS,
                    )}
                  >
                    {(isOwned || isSelected) && <Check className="h-3.5 w-3.5" />}
                    {body.name}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <DialogFooter>
        <DialogCancel>{t("cancel")}</DialogCancel>
        <button
          type="button"
          onClick={() => onSave([...selected])}
          disabled={saving || selected.length === 0}
          className={cn(ACTION_PRIMARY_CLS, "h-9 rounded-lg px-4 text-sm font-medium")}
        >
          {saving ? t("saving") : selected.length > 0 ? t("addCount", { count: selected.length }) : t("add")}
        </button>
      </DialogFooter>
    </>
  );
}
