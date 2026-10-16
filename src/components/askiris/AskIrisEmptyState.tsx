"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import Iris from "@/components/iris/Iris";
import { IRIS_ASSISTANT } from "@/config/iris-config";
import AskIrisComposer from "@/components/askiris/AskIrisComposer";
import { cn } from "@/lib/utils";
import ExampleQuestion from "@/components/askiris/ExampleQuestion";

export default function AskIrisEmptyState({
  variant,
  input,
  onInputChange,
  onSubmit,
  onChip,
  disabled,
}: {
  /** panel: the narrow side panel, without the hero animation. */
  variant: "page" | "panel";
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onChip: (text: string) => void;
  disabled: boolean;
}) {
  const t = useTranslations("AskIris");
  const chips = t.raw("chips") as { emoji: string; label: string; prompt: string }[];
  const inputRef = useRef<HTMLInputElement>(null);
  const panel = variant === "panel";

  function fillFromChip(prompt: string) {
    onChip(prompt);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col items-center justify-center text-center",
        panel ? "gap-4 pb-6" : "gap-6 px-2 pb-10",
      )}
    >
      {!panel && <Iris config={IRIS_ASSISTANT} uid="askiris-hero" />}

      <div className={panel ? "space-y-2" : "space-y-3"}>
        <h1
          className={cn(
            "font-heading leading-tight font-bold whitespace-pre-line",
            panel ? "text-xl" : "text-3xl sm:text-4xl",
          )}
        >
          {t.rich("heading", {
            beta: () => (
              <span className="bg-primary/10 text-primary ml-1.5 rounded px-1.5 py-0.5 align-middle font-sans text-[11px] font-semibold tracking-wide uppercase">
                {t("beta")}
              </span>
            ),
          })}
        </h1>
        <p className={cn("text-muted-foreground text-sm", !panel && "sm:text-base")}>{t("subtitle")}</p>
      </div>

      <div className="w-full max-w-2xl">
        <AskIrisComposer
          size={panel ? "md" : "lg"}
          inputRef={inputRef}
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
          <ExampleQuestion key={chip.label} disabled={disabled} onClick={() => fillFromChip(chip.prompt)}>
            <span aria-hidden>{chip.emoji}</span>
            {chip.label}
          </ExampleQuestion>
        ))}
      </div>
    </div>
  );
}
