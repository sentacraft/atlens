"use client";

import { useEffect, useId, useRef } from "react";
import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { MENU_ITEM_CLS, PILL_ACTIVE_CLS, PILL_CUSTOM_ENTRY_CLS, PILL_INPUT_CLS, PILL_MENU_OPTION_CLS } from "@/config/ui-tokens";
import { MenuPopup } from "@/components/ui/menu";
import { convertFocalLength, type CustomFocalFilter, type FocalReference } from "@/lib/lens/lens";
import type { Mount } from "@/lib/types";
import { cn } from "@/lib/utils";
import FilterNumberInput from "./FilterNumberInput";

interface Props {
  value: CustomFocalFilter | null;
  mount: Mount;
  onChange: (value: CustomFocalFilter) => void;
}

export default function FocalCoverageChip({ value, mount, onChange }: Props) {
  const t = useTranslations("LensList");
  const inputRef = useRef<HTMLInputElement>(null);
  const focusOnOpen = useRef(false);
  const descriptionId = useId();

  useEffect(() => {
    if (value && focusOnOpen.current) {
      inputRef.current?.focus();
      focusOnOpen.current = false;
    }
  }, [value]);

  if (!value) {
    return (
      <button
        type="button"
        aria-label={t("focalCover")}
        className={PILL_CUSTOM_ENTRY_CLS}
        onClick={() => {
          focusOnOpen.current = true;
          onChange({ value: null, reference: "equivalent" });
        }}
      >
        <Plus className="size-3" aria-hidden="true" />
        {t("focalCustom")}
      </button>
    );
  }

  const active = value.value !== null;
  const references: { value: FocalReference; label: string }[] = [
    { value: "equivalent", label: t("focalEquivalent") },
    { value: "actual", label: t("focalActual") },
  ];

  return (
    <Menu.Root>
      <div
        role="group"
        aria-label={t("focalCover")}
        className={cn(PILL_INPUT_CLS, active && PILL_ACTIVE_CLS, "max-w-full shrink-0 text-xs font-medium")}
      >
        <label className="inline-flex min-w-0 items-center gap-1.5">
          <span>{t("focalCovering")}</span>
          <FilterNumberInput
            key={`${value.value}:${value.reference}`}
            label={t("focalInput")}
            value={value.value}
            placeholder={t("focalPlaceholder")}
            invalidLabel={t("positiveNumber")}
            width="content"
            inputRef={inputRef}
            onCommit={(next) => onChange({ ...value, value: next })}
          />
          <span className={active ? "text-white/70" : "text-zinc-500"}>mm</span>
        </label>
        <Menu.Trigger
          aria-label={t("focalReference")}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          {value.reference === "equivalent" ? t("focalEquivalentShort") : t("focalActualShort")}
          <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
        </Menu.Trigger>
      </div>
      <MenuPopup align="end" className="max-w-64 min-w-48">
        <Menu.RadioGroup
          value={value.reference}
          aria-label={t("focalReference")}
          aria-describedby={descriptionId}
          onValueChange={(reference) => onChange({
            reference,
            value: value.value === null ? null : convertFocalLength(value.value, value.reference, reference, mount),
          })}
        >
          {references.map((reference) => (
            <Menu.RadioItem key={reference.value} value={reference.value} closeOnClick className={cn(MENU_ITEM_CLS, PILL_MENU_OPTION_CLS)}>
              <span>{reference.label}</span>
              <span className="flex size-3.5 shrink-0 items-center justify-center">
                <Menu.RadioItemIndicator><Check className="size-3.5" /></Menu.RadioItemIndicator>
              </span>
            </Menu.RadioItem>
          ))}
        </Menu.RadioGroup>
        <p id={descriptionId} className="border-t border-zinc-100 px-3 py-2 text-xs leading-relaxed text-zinc-500">{t("focalTolerance")}</p>
      </MenuPopup>
    </Menu.Root>
  );
}
