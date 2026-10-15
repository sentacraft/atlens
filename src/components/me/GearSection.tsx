"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu } from "@base-ui/react/menu";
import { Ellipsis, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { getBodyById } from "@/lib/body/data";
import type { LensSummary } from "@/lib/lens/data";
import { getLensImageUrl } from "@/lib/lens/image";
import { equivalentFocal, type CoverageInput } from "@/lib/me/coverage";
import { addGear, GearRequestError, removeGear, userGearQuery } from "@/lib/me/gear-client";
import type { GearInput, GearItem, ManualLens } from "@/lib/me/gear-schema";
import {
  ACTION_OUTLINE_CLS,
  ACTION_PRIMARY_CLS,
  CHIP_ACTIVE_CLS,
  CHIP_BASE_CLS,
  ICON_NAV_BTN_CLS,
  MENU_ITEM_DANGER_CLS,
  MENU_POPUP_CLS,
} from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import { mountToUrlSegment } from "@/lib/mount";
import { Link } from "@/i18n/navigation";
import { useMountPreference } from "@/context/MountPreferenceProvider";
import LensSearchDialog from "@/components/browse/LensSearchDialog";
import AddBodyDialog from "@/components/me/AddBodyDialog";
import CoverageChart from "@/components/me/CoverageChart";
import ManualLensDialog from "@/components/me/ManualLensDialog";
import { LensSilhouette } from "@/components/ui/lens-silhouette";
import { BodySpecs } from "@/components/me/gear-specs";

const ADD_BUTTON_CLS = cn(ACTION_OUTLINE_CLS, "h-9 gap-1 px-3 text-[13px] md:h-8");
const GROUP_LABEL_CLS = "text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400";

function focalRange(item: GearItem, lens: LensSummary | undefined): [number, number] | undefined {
  if (item.manual) {
    return [item.manual.focalMinMm, item.manual.focalMaxMm];
  }
  return lens ? [lens.focalLengthMin, lens.focalLengthMax] : undefined;
}

export default function GearSection({
  id,
  className,
  userId,
  lenses,
  heading,
}: {
  id: string;
  className: string;
  userId: string;
  lenses: LensSummary[];
  heading: ReactNode;
}) {
  const t = useTranslations("Profile");
  const tBrand = useTranslations("Brands");
  const queryClient = useQueryClient();
  const query = userGearQuery(userId);
  const { data: gear = [] } = useQuery(query);
  const { preference: mount } = useMountPreference();
  const [bodyDialogOpen, setBodyDialogOpen] = useState(false);
  const [lensSearchOpen, setLensSearchOpen] = useState(false);
  const [pickedLenses, setPickedLenses] = useState<LensSummary[]>([]);

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
  const [manualOpen, setManualOpen] = useState(false);

  const lensById = useMemo(() => new Map(lenses.map((lens) => [lens.id, lens])), [lenses]);
  const brandSuggestions = useMemo(
    () => [...new Set(lenses.map((lens) => lens.brand))].map((slug) => tBrand(slug)),
    [lenses, tBrand],
  );
  const bodies = gear.filter((item) => item.kind === "body");
  const lensItems = gear.filter((item) => item.kind === "lens");
  const ownedBodyIds = new Set(bodies.flatMap((item) => (item.catalogId ? [item.catalogId] : [])));
  const ownedLensIds = new Set(lensItems.map((item) => item.catalogId).filter((value): value is string => Boolean(value)));

  function brandName(slug: string) {
    return tBrand.has(slug) ? tBrand(slug) : slug;
  }

  function failed(error: unknown) {
    toast.error(error instanceof GearRequestError && error.code === "gear_limit_reached" ? t("gearLimit") : t("saveError"));
  }

  const add = useMutation({
    mutationFn: (input: GearInput) => addGear(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: query.queryKey }),
    onError: failed,
  });

  const remove = useMutation({
    mutationFn: removeGear,
    onMutate: async (gearId: string) => {
      await queryClient.cancelQueries({ queryKey: query.queryKey });
      const previous = queryClient.getQueryData<GearItem[]>(query.queryKey);
      queryClient.setQueryData<GearItem[]>(query.queryKey, (items) => items?.filter((item) => item.id !== gearId));
      return { previous };
    },
    onError: (error, _gearId, context) => {
      queryClient.setQueryData(query.queryKey, context?.previous);
      failed(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: query.queryKey }),
  });

  const addLenses = useMutation({
    mutationFn: (catalogIds: string[]) =>
      Promise.all(catalogIds.map((catalogId) => addGear({ kind: "lens", catalogId }))),
    onError: failed,
    onSettled: () => queryClient.invalidateQueries({ queryKey: query.queryKey }),
  });

  const addBodies = useMutation({
    mutationFn: (catalogIds: string[]) =>
      Promise.all(catalogIds.map((catalogId) => addGear({ kind: "body", catalogId }))),
    onError: failed,
    onSettled: () => queryClient.invalidateQueries({ queryKey: query.queryKey }),
  });

  function saveManual(lens: ManualLens) {
    add.mutate({ kind: "lens", manual: lens }, { onSuccess: () => setManualOpen(false) });
  }

  const coverage: CoverageInput[] = lensItems.flatMap((item) => {
    const lens = item.catalogId ? lensById.get(item.catalogId) : undefined;
    const range = focalRange(item, lens);
    if (!range) {
      return [];
    }
    const focal = range[0] === range[1] ? `${range[0]}mm` : `${range[0]}-${range[1]}mm`;
    const label = `${lens?.series || brandName(item.brand)} ${focal}`;
    return [{ id: item.id, label, mount: item.mount, focalMinMm: range[0], focalMaxMm: range[1], manual: !item.catalogId }];
  });

  return (
    <section id={id} className={className}>
      {heading}

      <GearGroup
        label={t("bodies")}
        count={bodies.length}
        empty={t("noBodies")}
        action={
          <button type="button" onClick={() => setBodyDialogOpen(true)} className={ADD_BUTTON_CLS}>
            <Plus className="h-4 w-4" />
            {t("addBody")}
          </button>
        }
      >
        {bodies.map((item) => {
          const body = item.catalogId ? getBodyById(item.catalogId) : undefined;
          return (
            <GearRow
              key={item.id}
              thumbnail={null}
              brand={brandName(item.brand)}
              name={item.name}
              detail={body ? <BodySpecs body={body} /> : null}
              onRemove={() => remove.mutate(item.id)}
            />
          );
        })}
      </GearGroup>

      <GearGroup
        label={t("lenses")}
        count={lensItems.length}
        empty={t("noLenses")}
        action={
          <>
            <button type="button" onClick={() => setLensSearchOpen(true)} className={ADD_BUTTON_CLS}>
              <Plus className="h-4 w-4" />
              {t("addLens")}
            </button>
            <LensSearchDialog<LensSummary>
              open={lensSearchOpen}
              onOpenChange={closeLensSearch}
              lenses={lenses}
              title={t("addLens")}
              description={t("addLensDescription")}
              resultAction={(lens) =>
                ownedLensIds.has(lens.id)
                  ? { label: t("owned"), disabled: true }
                  : { label: pickedLenses.some((picked) => picked.id === lens.id) ? t("selected") : t("select") }
              }
              onSelect={togglePickedLens}
              footer={({ query: search }) => (
                <div className="flex flex-col gap-3">
                  {pickedLenses.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {pickedLenses.map((lens) => (
                        <li key={lens.id}>
                          <button
                            type="button"
                            onClick={() => togglePickedLens(lens)}
                            aria-label={t("unselect", { name: lens.model })}
                            className={cn(CHIP_BASE_CLS, CHIP_ACTIVE_CLS, "h-8 px-3")}
                          >
                            {lens.model}
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {search && (
                        <>
                          {t("manualPrompt")}{" "}
                          <button
                            type="button"
                            onClick={() => {
                              closeLensSearch(false);
                              setManualOpen(true);
                            }}
                            className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
                          >
                            {t("manualEntry")}
                          </button>
                        </>
                      )}
                    </span>
                    <div className="ml-auto flex gap-2">
                      <button
                        type="button"
                        onClick={() => closeLensSearch(false)}
                        className="h-9 rounded-lg px-3 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        {t("cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={() => addLenses.mutate(pickedLenses.map((lens) => lens.id), { onSuccess: () => closeLensSearch(false) })}
                        disabled={pickedLenses.length === 0 || addLenses.isPending}
                        className={cn(ACTION_PRIMARY_CLS, "h-9 rounded-lg px-4 text-sm font-medium")}
                      >
                        {addLenses.isPending
                          ? t("saving")
                          : pickedLenses.length > 0
                            ? t("addCount", { count: pickedLenses.length })
                            : t("add")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            />
          </>
        }
      >
        {lensItems.map((item) => {
          const lens = item.catalogId ? lensById.get(item.catalogId) : undefined;
          const range = focalRange(item, lens);
          const equivalent =
            range &&
            t("equivalent", {
              range:
                range[0] === range[1]
                  ? `${equivalentFocal(range[0], item.mount)}mm`
                  : `${equivalentFocal(range[0], item.mount)}–${equivalentFocal(range[1], item.mount)}mm`,
            });
          const badges = item.manual
            ? [t("manualBadge"), item.manual.adapted && item.manual.originalMount ? t("adaptedBadge", { mount: item.manual.originalMount }) : null]
                .filter(Boolean)
                .join(" · ")
            : null;
          return (
            <GearRow
              key={item.id}
              thumbnail={item.catalogId ? <Thumbnail src={getLensImageUrl(item.catalogId)} /> : <Thumbnail />}
              brand={brandName(item.brand)}
              name={item.name}
              badge={badges}
              detail={equivalent}
              href={lens ? `/lenses/${mountToUrlSegment(lens.mount)}/${lens.id}` : undefined}
              onRemove={() => remove.mutate(item.id)}
            />
          );
        })}
      </GearGroup>

      {coverage.length > 0 && <CoverageChart lenses={coverage} />}

      <AddBodyDialog
        open={bodyDialogOpen}
        onOpenChange={setBodyDialogOpen}
        defaultMount={mount}
        owned={ownedBodyIds}
        saving={addBodies.isPending}
        onSave={(catalogIds) => addBodies.mutate(catalogIds, { onSuccess: () => setBodyDialogOpen(false) })}
      />
      <ManualLensDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        defaultMount={mount}
        brandSuggestions={brandSuggestions}
        saving={add.isPending}
        onSave={saveManual}
      />
    </section>
  );
}

function GearGroup({
  label,
  count,
  empty,
  action,
  children,
}: {
  label: string;
  count: number;
  empty: string;
  action: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className={GROUP_LABEL_CLS}>
          {label} · {count}
        </span>
        {action}
      </div>
      {count === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 px-4 py-5 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          {empty}
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">{children}</ul>
      )}
    </div>
  );
}

function Thumbnail({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="hidden h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 md:flex dark:bg-zinc-900">
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- catalog webp; images are unoptimized on Workers
        <img src={src} alt="" onError={() => setFailed(true)} className="h-full w-full object-contain p-1" />
      ) : (
        <LensSilhouette className="h-[34px] w-[34px]" />
      )}
    </div>
  );
}

function GearRow({
  thumbnail,
  brand,
  name,
  badge,
  detail,
  href,
  onRemove,
}: {
  thumbnail: ReactNode;
  brand: string;
  name: string;
  badge?: string | null;
  detail: ReactNode;
  href?: string;
  onRemove: () => void;
}) {
  const t = useTranslations("Profile");
  const body = (
    <>
      {thumbnail}
      <div className="min-w-0 flex-1">
        <div className="hidden items-center gap-2 md:flex">
          <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">{brand}</span>
          {badge && (
            <span className="truncate rounded bg-zinc-100 px-1.5 text-[10px] leading-4 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {badge}
            </span>
          )}
        </div>
        <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{name}</div>
        <div className="truncate text-xs text-zinc-500 md:hidden dark:text-zinc-400">
          {[brand, badge].filter(Boolean).join(" · ")}
          {detail && <> · {detail}</>}
        </div>
      </div>
      <span className="hidden shrink-0 whitespace-nowrap text-xs text-zinc-500 md:block dark:text-zinc-400">{detail}</span>
    </>
  );
  return (
    <li className="flex items-center gap-1 border-b border-zinc-100 pr-1.5 last:border-b-0 md:pr-2 dark:border-zinc-800">
      {href ? (
        <Link
          href={href}
          className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3.5 transition-colors hover:bg-zinc-50 md:gap-3.5 md:py-3 md:pl-4 dark:hover:bg-zinc-900"
        >
          {body}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3.5 md:gap-3.5 md:py-3 md:pl-4">{body}</div>
      )}
      <Menu.Root>
        <Menu.Trigger aria-label={t("moreActions")} className={cn(ICON_NAV_BTN_CLS, "h-11 w-11 md:h-8 md:w-8")}>
          <Ellipsis className="h-4 w-4" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="end" sideOffset={4}>
            <Menu.Popup className={cn(MENU_POPUP_CLS, "w-36")}>
              <Menu.Item
                onClick={onRemove}
                className={MENU_ITEM_DANGER_CLS}
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                {t("remove")}
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </li>
  );
}
