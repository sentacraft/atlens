"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import Iris from "@/components/iris/Iris";
import { IRIS_ASSISTANT } from "@/config/iris-config";
import AskIrisComposer from "@/components/askiris/AskIrisComposer";

// The empty-state landing: the animated Iris mark introducing itself, CTA copy,
// the (large) composer, and a row of cold-start chips. Shown before the first
// message; sending anything (typed or a chip) hands off to the chat thread.
// Copy is placeholder for now.
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
  const chips = t.raw("chips") as { emoji: string; label: string; prompt: string }[];
  const inputRef = useRef<HTMLInputElement>(null);

  // A chip fills its full prompt into the composer (not send) so the user can
  // tweak the specifics — budget, body — before asking. Focus + caret-to-end so
  // they can edit or hit enter straight away.
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
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-2 pb-10 text-center">
      <Iris config={IRIS_ASSISTANT} uid="askiris-hero" />

      <div className="space-y-3">
        <h1 className="font-heading text-3xl leading-tight font-bold whitespace-pre-line sm:text-4xl">
          {t.rich("heading", {
            beta: () => (
              <span className="bg-primary/10 text-primary ml-1.5 rounded px-1.5 py-0.5 align-middle font-sans text-[11px] font-semibold tracking-wide uppercase">
                {t("beta")}
              </span>
            ),
          })}
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">{t("subtitle")}</p>
      </div>

      <div className="w-full max-w-2xl">
        <AskIrisComposer
          size="lg"
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
          <button
            key={chip.label}
            type="button"
            disabled={disabled}
            onClick={() => fillFromChip(chip.prompt)}
            className="border-border hover:bg-muted flex items-center gap-1.5 rounded-full border bg-background px-4 py-2 text-sm transition-colors disabled:opacity-50"
          >
            <span aria-hidden>{chip.emoji}</span>
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
