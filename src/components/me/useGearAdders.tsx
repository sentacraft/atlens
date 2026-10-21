"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { LensSummary } from "@/lib/lens/data";
import { addGear, GearRequestError, userGearQuery } from "@/lib/me/gear-client";
import type { GearInput, ManualLens } from "@/lib/me/gear-schema";
import { ACTION_PRIMARY_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import { useMountPreference } from "@/context/MountPreferenceProvider";
import LensSearchDialog from "@/components/browse/LensSearchDialog";
import { DialogCancel } from "@/components/ui/dialog";
import AddBodyDialog from "@/components/me/AddBodyDialog";
import ManualLensDialog from "@/components/me/ManualLensDialog";
import { brandLabel } from "@/lib/lens/format";

/**
 * The add-gear flow shared by the profile and the in-chat gear card: the body picker, the
 * lens search with staged picks, and manual entry. Each saves to the profile directly.
 * Render `dialogs` once; open them with the returned functions.
 */
export function useGearAdders({ userId, lenses }: { userId: string; lenses: LensSummary[] }) {
  const t = useTranslations("Profile");
  const tBrand = useTranslations("Brands");
  const queryClient = useQueryClient();
  const query = userGearQuery(userId);
  const { data: gear = [] } = useQuery(query);
  const { preference: mount } = useMountPreference();
  const [bodyDialogOpen, setBodyDialogOpen] = useState(false);
  const [lensSearchOpen, setLensSearchOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [pickedLenses, setPickedLenses] = useState<LensSummary[]>([]);

  const brandSuggestions = useMemo(
    () => [...new Set(lenses.map((lens) => lens.brand))].map((slug) => brandLabel(tBrand, slug)),
    [lenses, tBrand],
  );
  const ownedBodyIds = new Set(gear.flatMap((item) => (item.kind === "body" && item.catalogId ? [item.catalogId] : [])));
  const ownedLensIds = new Set(gear.flatMap((item) => (item.kind === "lens" && item.catalogId ? [item.catalogId] : [])));

  function failed(error: unknown) {
    toast.error(error instanceof GearRequestError && error.code === "gear_limit_reached" ? t("gearLimit") : t("saveError"));
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: query.queryKey });

  const add = useMutation({
    mutationFn: (inputs: GearInput[]) => Promise.all(inputs.map((input) => addGear(input))),
    onError: failed,
    onSettled: refresh,
  });

  function closeLensSearch(open: boolean) {
    setLensSearchOpen(open);
    if (!open) {
      setPickedLenses([]);
    }
  }

  function togglePickedLens(lens: LensSummary) {
    setPickedLenses((prev) =>
      prev.some((picked) => picked.id === lens.id) ? prev.filter((picked) => picked.id !== lens.id) : [...prev, lens],
    );
  }

  function saveManual(lens: ManualLens) {
    add.mutate([{ kind: "lens", manual: lens }], { onSuccess: () => setManualOpen(false) });
  }

  /** Saves catalog bodies and lenses the user has not added yet. */
  function addCatalog(ids: { bodies: string[]; lenses: string[] }, options?: { onSuccess?: () => void }) {
    const inputs: GearInput[] = [
      ...ids.bodies.filter((id) => !ownedBodyIds.has(id)).map((catalogId): GearInput => ({ kind: "body", catalogId })),
      ...ids.lenses.filter((id) => !ownedLensIds.has(id)).map((catalogId): GearInput => ({ kind: "lens", catalogId })),
    ];
    if (inputs.length === 0) {
      options?.onSuccess?.();
      return;
    }
    add.mutate(inputs, { onSuccess: () => options?.onSuccess?.() });
  }

  const dialogs: ReactNode = (
    <>
      <AddBodyDialog
        open={bodyDialogOpen}
        onOpenChange={setBodyDialogOpen}
        defaultMount={mount}
        owned={ownedBodyIds}
        saving={add.isPending}
        onSave={(catalogIds) => addCatalog({ bodies: catalogIds, lenses: [] }, { onSuccess: () => setBodyDialogOpen(false) })}
      />
      <LensSearchDialog<LensSummary>
        open={lensSearchOpen}
        onOpenChange={closeLensSearch}
        lenses={lenses}
        title={t("addLens")}
        resultAction={(lens) =>
          ownedLensIds.has(lens.id)
            ? { label: t("owned"), disabled: true }
            : { label: pickedLenses.some((picked) => picked.id === lens.id) ? t("selected") : t("select") }
        }
        onSelect={togglePickedLens}
        afterResults={({ query: search }) =>
          search && (
            <p className="text-center text-xs text-zinc-500">
              {t("manualPrompt")}{" "}
              <button
                type="button"
                onClick={() => {
                  closeLensSearch(false);
                  setManualOpen(true);
                }}
                className="font-medium text-zinc-900 underline underline-offset-4"
              >
                {t("manualEntry")}
              </button>
            </p>
          )
        }
        footer={() => (
          <>
            <span className="text-[13px] text-zinc-600">
              {pickedLenses.length > 0 && t("pickedCount", { count: pickedLenses.length })}
            </span>
            <div className="flex items-center gap-2">
              <DialogCancel>{t("cancel")}</DialogCancel>
              <button
                type="button"
                onClick={() =>
                  addCatalog(
                    { bodies: [], lenses: pickedLenses.map((lens) => lens.id) },
                    { onSuccess: () => closeLensSearch(false) },
                  )
                }
                disabled={pickedLenses.length === 0 || add.isPending}
                className={cn(ACTION_PRIMARY_CLS, "h-9 rounded-lg px-4 text-sm font-medium")}
              >
                {add.isPending
                  ? t("saving")
                  : pickedLenses.length > 0
                    ? t("addCount", { count: pickedLenses.length })
                    : t("add")}
              </button>
            </div>
          </>
        )}
      />
      <ManualLensDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        defaultMount={mount}
        brandSuggestions={brandSuggestions}
        saving={add.isPending}
        onSave={saveManual}
      />
    </>
  );

  return {
    gear,
    openBodyDialog: () => setBodyDialogOpen(true),
    openLensSearch: () => setLensSearchOpen(true),
    addCatalog,
    adding: add.isPending,
    dialogs,
  };
}
