"use client";

import { useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { CircleHelp, X } from "lucide-react";
import { OPTICAL_TRAITS, type Mount, type OpticalTrait } from "@/lib/types";
import { FOCUS_MOTORS, type ManualLens } from "@/lib/me/gear-schema";
import {
  emptyDraft,
  isZoomOnlyFeature,
  LENS_FEATURES,
  validateDraft,
  type DraftError,
  type DraftField,
  type LensFeature,
  type ManualLensDraft,
} from "@/lib/me/manual-lens-draft";
import { ACTION_PRIMARY_CLS, FROSTED_OVERLAY_CHROME_CLS, ICON_CLOSE_BTN_CLS } from "@/config/ui-tokens";
import { FEATURE_ICONS } from "@/lib/feature-icons";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import ToggleChipGroup from "@/components/ui/toggle-chip-group";
import SegmentedControl from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const INPUT_CLS =
  "h-10 w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 text-base text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500 aria-invalid:border-red-500 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";
const LABEL_CLS = "flex flex-col gap-1.5 text-[13px] font-medium text-zinc-700 dark:text-zinc-300";

const FEATURE_LABEL_KEY: Record<LensFeature, string> = {
  weatherResistant: "featureWr",
  apertureRing: "featureApertureRing",
  powerZoom: "featurePowerZoom",
  internalZoom: "featureInternalZoom",
};
const FEATURE_ICON_KEY: Record<LensFeature, string> = {
  weatherResistant: "wr",
  apertureRing: "apertureRing",
  powerZoom: "powerZoom",
  internalZoom: "internalZoom",
};
const MOTOR_LABEL_KEY = {
  linear: "motorLinear",
  stepping: "motorStepping",
  dc: "motorDc",
  other: "motorOther",
} as const;

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

export default function ManualLensDialog({
  open,
  onOpenChange,
  defaultMount,
  initialModel,
  brandSuggestions,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMount: Mount;
  initialModel: string;
  brandSuggestions: string[];
  saving: boolean;
  onSave: (lens: ManualLens) => void;
}) {
  const t = useTranslations("Profile");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="flex max-h-[90svh] w-full max-w-xl flex-col overflow-hidden">
        <DialogHeader className="border-b border-zinc-100 pr-5 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle>{t("manualTitle")}</DialogTitle>
              <DialogDescription>{t("manualDescription")}</DialogDescription>
            </div>
            <DialogClose className={cn(ICON_CLOSE_BTN_CLS, FROSTED_OVERLAY_CHROME_CLS, "hidden h-9 w-9 shrink-0 sm:inline-flex")}>
              <X className="h-4 w-4" />
            </DialogClose>
          </div>
        </DialogHeader>
        {open && (
          <ManualLensForm
            key={initialModel}
            defaultMount={defaultMount}
            initialModel={initialModel}
            brandSuggestions={brandSuggestions}
            saving={saving}
            onCancel={() => onOpenChange(false)}
            onSave={onSave}
          />
        )}
      </DialogPopup>
    </Dialog>
  );
}

function ManualLensForm({
  defaultMount,
  initialModel,
  brandSuggestions,
  saving,
  onCancel,
  onSave,
}: {
  defaultMount: Mount;
  initialModel: string;
  brandSuggestions: string[];
  saving: boolean;
  onCancel: () => void;
  onSave: (lens: ManualLens) => void;
}) {
  const t = useTranslations("Profile");
  const l = useTranslations("LensList");
  const badge = useTranslations("SpecialtyBadge");
  const m = useTranslations("MountSwitcher");
  const brandListId = useId();
  const [draft, setDraft] = useState<ManualLensDraft>(() => emptyDraft(defaultMount, initialModel));
  const [errors, setErrors] = useState<Partial<Record<DraftField, DraftError>>>({});
  const [helpOpen, setHelpOpen] = useState(false);

  function set<K extends keyof ManualLensDraft>(key: K, value: ManualLensDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateDraft(draft);
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    onSave(result.lens);
  }

  function field(name: DraftField, label: string, input: ReactNode, suffix?: string) {
    const error = errors[name];
    return (
      <label className={LABEL_CLS}>
        {label}
        <span className="flex items-center gap-2">
          {input}
          {suffix && <span className="shrink-0 text-sm text-zinc-500">{suffix}</span>}
        </span>
        {error && <span className="text-xs font-normal text-red-600 dark:text-red-400">{t(error)}</span>}
      </label>
    );
  }

  function textInput(name: DraftField, props: React.InputHTMLAttributes<HTMLInputElement> = {}) {
    return (
      <input
        value={draft[name as keyof ManualLensDraft] as string}
        onChange={(event) => set(name as keyof ManualLensDraft, event.target.value as never)}
        aria-invalid={errors[name] ? true : undefined}
        className={INPUT_CLS}
        {...props}
      />
    );
  }

  const numeric = { inputMode: "decimal" as const };

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {field("brand", t("brand"), textInput("brand", { list: brandListId, autoComplete: "off" }))}
          <datalist id={brandListId}>
            {brandSuggestions.map((brand) => (
              <option key={brand} value={brand} />
            ))}
          </datalist>
          {field("model", t("modelName"), textInput("model", { autoComplete: "off" }))}
        </div>

        <div className={LABEL_CLS}>
          {t("focalLength")}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <SegmentedControl<"prime" | "zoom">
              ariaLabel={t("focalLength")}
              value={draft.zoom ? "zoom" : "prime"}
              options={[
                { value: "prime", label: { default: l("primes") } },
                { value: "zoom", label: { default: l("zooms") } },
              ]}
              onChange={(value) => set("zoom", value === "zoom")}
              layout="equal"
            />
            <span className="flex items-center gap-2">
              <span className="w-20">
                {textInput("focalMin", { ...numeric, "aria-label": draft.zoom ? t("focalMin") : t("focalLength") })}
              </span>
              {draft.zoom && (
                <>
                  <span className="text-zinc-400">–</span>
                  <span className="w-20">{textInput("focalMax", { ...numeric, "aria-label": t("focalMax") })}</span>
                </>
              )}
              <span className="shrink-0 text-sm text-zinc-500">mm</span>
            </span>
          </div>
          {(errors.focalMin || errors.focalMax) && (
            <span className="text-xs font-normal text-red-600 dark:text-red-400">
              {t((errors.focalMin ?? errors.focalMax)!)}
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className={LABEL_CLS}>
            {t("mount")}
            <SegmentedControl<Mount>
              ariaLabel={t("mount")}
              value={draft.mount}
              options={[
                { value: "X", label: { default: m("x") } },
                { value: "G", label: { default: m("gfx") } },
              ]}
              onChange={(value) => set("mount", value)}
              layout="equal"
            />
          </div>
          <div className={LABEL_CLS}>
            {t("maxAperture")}
            <span className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">F</span>
              {textInput("apertureWide", { ...numeric, "aria-label": draft.zoom ? t("apertureWide") : t("maxAperture") })}
              {draft.zoom && (
                <>
                  <span className="text-zinc-400">–</span>
                  {textInput("apertureTele", { ...numeric, "aria-label": t("apertureTele") })}
                </>
              )}
            </span>
            {(errors.apertureWide || errors.apertureTele) && (
              <span className="text-xs font-normal text-red-600 dark:text-red-400">
                {t((errors.apertureWide ?? errors.apertureTele)!)}
              </span>
            )}
          </div>
          <div className={LABEL_CLS}>
            {l("focusFilter")}
            <SegmentedControl<"auto" | "manual">
              ariaLabel={l("focusFilter")}
              value={draft.autofocus === undefined ? undefined : draft.autofocus ? "auto" : "manual"}
              options={[
                { value: "auto", label: { default: l("focusAuto") } },
                { value: "manual", label: { default: l("focusManual") } },
              ]}
              onChange={(value) => set("autofocus", value === "auto")}
              layout="equal"
            />
          </div>
          <div className={LABEL_CLS}>
            {l("featureOis")}
            <SegmentedControl<"yes" | "no">
              ariaLabel={l("featureOis")}
              value={draft.ois === undefined ? undefined : draft.ois ? "yes" : "no"}
              options={[
                { value: "yes", label: { default: t("yes") } },
                { value: "no", label: { default: t("no") } },
              ]}
              onChange={(value) => set("ois", value === "yes")}
              layout="equal"
            />
          </div>
        </div>

        <details className="group border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {t("moreFields")}
            <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">{t("moreFieldsHint")}</span>
          </summary>
          <div className="mt-4 space-y-5">
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <Checkbox checked={draft.adapted} onCheckedChange={(checked) => set("adapted", checked)} />
                  {t("adapted")}
                </label>
                <button
                  type="button"
                  onClick={() => setHelpOpen((value) => !value)}
                  aria-label={t("adaptedHelpLabel")}
                  aria-expanded={helpOpen}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  <CircleHelp className="h-4 w-4" />
                </button>
              </div>
              {helpOpen && (
                <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs leading-5 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                  {t("adaptedHelp")}
                </p>
              )}
              {draft.adapted &&
                field("originalMount", t("originalMount"), textInput("originalMount", { placeholder: t("originalMountPlaceholder") }))}
            </div>

            <div className={LABEL_CLS}>
              {l("features")}
              <ToggleChipGroup<LensFeature>
                options={LENS_FEATURES.map((feature) => ({
                  key: feature,
                  label: l(FEATURE_LABEL_KEY[feature]),
                  icon: FEATURE_ICONS[FEATURE_ICON_KEY[feature]],
                  disabled: isZoomOnlyFeature(feature) && !draft.zoom,
                }))}
                selectedKeys={draft.features}
                onToggle={(key) => set("features", toggle(draft.features, key))}
              />
            </div>

            <div className={LABEL_CLS}>
              {l("opticalTraitFilter")}
              <ToggleChipGroup<OpticalTrait>
                options={OPTICAL_TRAITS.map((trait) => ({ key: trait, label: badge(trait) }))}
                selectedKeys={draft.opticalTraits}
                onToggle={(key) => set("opticalTraits", toggle(draft.opticalTraits, key))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className={LABEL_CLS}>
                {l("usage")}
                <SegmentedControl<"photo" | "cine">
                  ariaLabel={l("usage")}
                  value={draft.usage}
                  options={[
                    { value: "photo", label: { default: l("usagePhoto") } },
                    { value: "cine", label: { default: l("usageCine") } },
                  ]}
                  onChange={(value) => set("usage", value)}
                  layout="equal"
                />
              </div>
              <div className={LABEL_CLS}>
                {l("focusMotorFilter")}
                <Select
                  value={draft.focusMotor ?? null}
                  onValueChange={(value) => set("focusMotor", (value ?? undefined) as ManualLensDraft["focusMotor"])}
                >
                  <SelectTrigger className="h-10" aria-label={l("focusMotorFilter")}>
                    <SelectValue placeholder={t("optional")} />
                  </SelectTrigger>
                  <SelectContent>
                    {FOCUS_MOTORS.map((motor) => (
                      <SelectItem key={motor} value={motor}>
                        {motor === "unknown" ? t("motorUnknown") : l(MOTOR_LABEL_KEY[motor])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {field("weight", t("weight"), textInput("weight", { ...numeric, placeholder: t("optional") }), "g")}
            </div>

            <label className={LABEL_CLS}>
              {t("notes")}
              <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">{t("notesHint")}</span>
              <Textarea
                value={draft.notes}
                onChange={(event) => set("notes", event.target.value)}
                placeholder={t("notesPlaceholder")}
                maxLength={500}
                rows={3}
              />
            </label>
          </div>
        </details>
      </div>
      <DialogFooter>
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-lg px-3 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          {t("cancel")}
        </button>
        <button type="submit" disabled={saving} className={cn(ACTION_PRIMARY_CLS, "h-9 rounded-lg px-4 text-sm font-medium")}>
          {saving ? t("saving") : t("save")}
        </button>
      </DialogFooter>
    </form>
  );
}
