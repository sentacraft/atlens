"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { searchBodies } from "@/lib/body/data";
import type { Body } from "@/lib/body/schema";
import { ACTION_OUTLINE_CLS, FROSTED_OVERLAY_CHROME_CLS, ICON_CLOSE_BTN_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { BodySpecs } from "@/components/me/gear-specs";

export default function AddBodyDialog({
  open,
  onOpenChange,
  ownedIds,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownedIds: ReadonlySet<string>;
  onAdd: (body: Body) => void;
}) {
  const t = useTranslations("Profile");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(
    () => searchBodies(query).sort((a, b) => (query.trim() ? 0 : b.releaseYear - a.releaseYear)),
    [query],
  );
  const groups = [
    { label: t("currentBodies"), bodies: matches.filter((body) => !body.discontinued) },
    { label: t("discontinuedBodies"), bodies: matches.filter((body) => body.discontinued) },
  ].filter((group) => group.bodies.length > 0);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setQuery("");
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPopup initialFocus={inputRef} className="flex max-h-[85svh] w-full max-w-lg flex-col overflow-hidden">
        <DialogHeader className="border-b border-zinc-100 pr-5 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle>{t("addBody")}</DialogTitle>
              <DialogDescription>{t("addBodyDescription")}</DialogDescription>
            </div>
            <DialogClose className={cn(ICON_CLOSE_BTN_CLS, FROSTED_OVERLAY_CHROME_CLS, "hidden h-9 w-9 shrink-0 sm:inline-flex")}>
              <X className="h-4 w-4" />
            </DialogClose>
          </div>
          <label className="mt-3 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 dark:border-zinc-800 dark:bg-zinc-900">
            <Search className="h-4 w-4 shrink-0 text-zinc-400" />
            <span className="sr-only">{t("searchBodies")}</span>
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchBodies")}
              className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-zinc-400 sm:text-sm"
            />
          </label>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {groups.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">{t("noBodyMatches")}</p>
          ) : (
            groups.map((group) => (
              <section key={group.label} className="py-2">
                <h3 className="pb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                  {group.label}
                </h3>
                <ul>
                  {group.bodies.map((body) => {
                    const owned = ownedIds.has(body.id);
                    return (
                      <li key={body.id} className="flex items-center gap-3 border-b border-zinc-100 py-2.5 last:border-b-0 dark:border-zinc-800">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{body.name}</div>
                          <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                            <BodySpecs body={body} />
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={owned}
                          onClick={() => {
                            onAdd(body);
                            handleOpenChange(false);
                          }}
                          className={cn(ACTION_OUTLINE_CLS, "h-8 shrink-0 px-3 text-[13px] disabled:cursor-default disabled:opacity-60")}
                        >
                          {owned ? t("owned") : t("add")}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </DialogPopup>
    </Dialog>
  );
}
