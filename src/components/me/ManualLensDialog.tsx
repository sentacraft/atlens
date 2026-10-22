"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, CircleHelp, X } from "lucide-react";
import { OPTICAL_TRAITS, type Mount, type OpticalTrait } from "@/lib/types";
import { FOCUS_MOTORS, type ManualLens } from "@/lib/me/gear-schema";
import {
  defaultLensName,
  emptyDraft,
  isZoomDraft,
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
  DialogCancel,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import Autocomplete from "@/components/ui/autocomplete";
import ToggleChipGroup from "@/components/ui/toggle-chip-group";
import SegmentedControl from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const INPUT_CLS =
  "h-10 w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 text-base text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500 aria-invalid:border-red-500 sm:text-sm";
const LABEL_CLS = "flex flex-col gap-1.5 text-[13px] font-medium text-zinc-700";

const FEATURE_LABEL_KEY = {
  weatherResistant: "featureWr",
  apertureRing: "featureApertureRing",
  powerZoom: "featurePowerZoom",
  internalZoom: "featureInternalZoom",
} as const satisfies Record<LensFeature, string>;
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
  brandSuggestions,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMount: Mount;
  brandSuggestions: string[];
  saving: boolean;
  onSave: (lens: ManualLens) => void;
}) {
  const t = useTranslations("Profile");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="flex max-h-[calc(var(--app-height)*0.9)] w-full max-w-xl flex-col overflow-hidden">
        <DialogHeader className="border-b border-zinc-100 pr-5">
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
            defaultMount={defaultMount}
            brandSuggestions={brandSuggestions}
            saving={saving}
            onSave={onSave}
          />
        )}
      </DialogPopup>
    </Dialog>
  );
}

function ManualLensForm({
  defaultMount,
  brandSuggestions,
  saving,
  onSave,
}: {
  defaultMount: Mount;
  brandSuggestions: string[];
  saving: boolean;
  onSave: (lens: ManualLens) => void;
}) {
  const t = useTranslations("Profile");
  const l = useTranslations("LensList");
  const badge = useTranslations("SpecialtyBadge");
  const [draft, setDraft] = useState<ManualLensDraft>(() => emptyDraft(defaultMount));
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

  function focusNextOnEnter(event: React.KeyboardEvent<HTMLFormElement>) {
    const target = event.target as HTMLElement;
    if (event.key !== "Enter" || event.defaultPrevented || event.nativeEvent.isComposing || target.getAttribute("enterkeyhint") !== "next") {
      return;
    }
    event.preventDefault();
    const inputs = [...event.currentTarget.querySelectorAll<HTMLInputElement>("input[enterkeyhint]")];
    inputs[inputs.indexOf(target as HTMLInputElement) + 1]?.focus();
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
        {error && <span className="text-xs font-normal text-red-600">{t(error)}</span>}
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

  const numeric = { inputMode: "decimal" as const, enterKeyHint: "next" as const };
  const zoom = isZoomDraft(draft);
  const generatedName = defaultLensName(draft);
  const errorText = (error: DraftError | undefined) =>
    error && <span className="text-xs font-normal text-red-600">{t(error)}</span>;

  return (
    <form onSubmit={submit} onKeyDown={focusNextOnEnter} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {field(
          "brand",
          t("brand"),
          <Autocomplete
            value={draft.brand}
            onValueChange={(value) => set("brand", value)}
            suggestions={brandSuggestions}
            enterKeyHint="next"
            aria-invalid={errors.brand ? true : undefined}
            className={INPUT_CLS}
          />,
        )}

        <div className={LABEL_CLS}>
          {t("focalLength")}
          <span className="flex items-center gap-2">
            <span className="min-w-0 flex-1 sm:max-w-40">{textInput("focalMin", { ...numeric, "aria-label": zoom ? t("focalMin") : t("focalLength") })}</span>
            <span className="text-zinc-400">–</span>
            <span className="min-w-0 flex-1 sm:max-w-40">
              {textInput("focalMax", { ...numeric, placeholder: t("zoomOnly"), "aria-label": t("focalMax") })}
            </span>
            <span className="shrink-0 text-sm text-zinc-500">mm</span>
          </span>
          {errorText(errors.focalMin ?? errors.focalMax)}
        </div>

        <div className={LABEL_CLS}>
          {t("maxAperture")}
          <span className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">{draft.usage === "cine" ? "T" : "F"}</span>
            <span className="min-w-0 flex-1 sm:max-w-40">
              {textInput("apertureWide", { ...numeric, "aria-label": zoom ? t("apertureWide") : t("maxAperture") })}
            </span>
            <span className="text-zinc-400">–</span>
            <span className="min-w-0 flex-1 sm:max-w-40">
              {textInput("apertureTele", { ...numeric, placeholder: t("variableOnly"), "aria-label": t("apertureTele") })}
            </span>
          </span>
          {errorText(errors.apertureWide ?? errors.apertureTele)}
        </div>

        <label className={LABEL_CLS}>
          {t("lensName")}
          {textInput("model", { autoComplete: "off", enterKeyHint: "done", placeholder: generatedName })}
          {generatedName && !draft.model.trim() && (
            <span className="text-xs font-normal text-zinc-500">
              {t("lensNameHint", { name: [draft.brand.trim(), generatedName].filter(Boolean).join(" ") })}
            </span>
          )}
          {errorText(errors.model)}
        </label>

        <div className="grid grid-cols-2 gap-4">
          <div className={LABEL_CLS}>
            {t("mount")}
            <SegmentedControl<Mount>
              ariaLabel={t("mount")}
              value={draft.mount}
              options={[
                { value: "X", label: { default: "X" } },
                { value: "G", label: { default: "G" } },
              ]}
              onChange={(value) => set("mount", value)}
              layout="equal"
            />
          </div>
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
        </div>

        <div className={LABEL_CLS}>
          {l("focusMotorFilter")}
          <Select
            value={draft.focusMotor ?? null}
            onValueChange={(value) => set("focusMotor", (value ?? undefined) as ManualLensDraft["focusMotor"])}
          >
            <SelectTrigger className="h-10 w-full" aria-label={l("focusMotorFilter")}>
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

        <details className="group border-t border-zinc-100 pt-4">
          <summary className="flex cursor-pointer list-none items-center gap-x-2 text-sm font-medium text-zinc-900">
            {t("moreFields")}
            <span className="min-w-0 flex-1 truncate text-xs font-normal text-zinc-500">{t("moreFieldsHint")}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-4 space-y-5">
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <Checkbox checked={draft.adapted} onCheckedChange={(checked) => set("adapted", checked)} />
                  {t("adapted")}
                </label>
                <button
                  type="button"
                  onClick={() => setHelpOpen((value) => !value)}
                  aria-label={t("adaptedHelpLabel")}
                  aria-expanded={helpOpen}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700"
                >
                  <CircleHelp className="h-4 w-4" />
                </button>
              </div>
              {helpOpen && (
                <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs leading-5 text-zinc-600">
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
                  disabled: isZoomOnlyFeature(feature) && !zoom,
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

            <div className="w-40">
              {field("weight", t("weight"), textInput("weight", { ...numeric, enterKeyHint: "done", placeholder: t("optional") }), "g")}
            </div>

            <label className={LABEL_CLS}>
              {t("notes")}
              <span className="text-xs font-normal text-zinc-500">{t("notesHint")}</span>
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
        <DialogCancel>{t("cancel")}</DialogCancel>
        <button type="submit" disabled={saving} className={cn(ACTION_PRIMARY_CLS, "h-9 rounded-lg px-4 text-sm font-medium")}>
          {saving ? t("saving") : t("save")}
        </button>
      </DialogFooter>
    </form>
  );
}
