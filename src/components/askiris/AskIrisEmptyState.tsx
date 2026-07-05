"use client";

import { useTranslations } from "next-intl";
import Iris from "@/components/iris/Iris";
import { IRIS_NAV } from "@/config/iris-config";
import AskIrisComposer from "@/components/askiris/AskIrisComposer";

// The empty-state landing: centered mark, CTA copy, the (large) composer, and a
// row of cold-start chips. Shown before the first message; sending anything
// (typed or a chip) hands off to the chat thread. Copy is placeholder for now.
export default function AskIrisEmptyState({
  input,
  onInputChange,
  onSubmit,
  onChip,
  disabled,
}: {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onChip: (text: string) => void;
  disabled: boolean;
}) {
  const t = useTranslations("AskIris");
  const chips = t.raw("chips") as string[];

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-2 pb-10 text-center">
      <Iris config={IRIS_NAV} uid="askiris-hero" size={56} />

      <div className="space-y-3">
        <h1 className="font-heading text-3xl leading-tight font-bold whitespace-pre-line sm:text-4xl">
          {t("heading")}
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">{t("subtitle")}</p>
      </div>

      <div className="w-full max-w-2xl">
        <AskIrisComposer
          size="lg"
          value={input}
          onChange={onInputChange}
          onSubmit={onSubmit}
          disabled={disabled}
          placeholder={t("placeholder")}
          sendLabel={t("send")}
          autoFocus
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            disabled={disabled}
            onClick={() => onChip(chip)}
            className="border-border hover:bg-muted rounded-full border bg-background px-4 py-2 text-sm transition-colors disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Iris config={IRIS_NAV} uid="askiris-hero-footer" size={14} />
        <span>{t("footer")}</span>
        <span aria-hidden>·</span>
        <span className="bg-primary/10 text-primary rounded px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase">
          {t("beta")}
        </span>
      </div>
    </div>
  );
}
