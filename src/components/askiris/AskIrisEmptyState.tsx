"use client";

import { useTranslations } from "next-intl";
import Iris from "@/components/iris/Iris";
import AiTag from "@/components/iris/AiTag";
import { IRIS_ASSISTANT } from "@/config/iris-config";
import AskIrisComposer from "@/components/askiris/AskIrisComposer";
import { cn } from "@/lib/utils";
import ExampleQuestion from "@/components/askiris/ExampleQuestion";
import { useStarters } from "@/components/askiris/useStarters";
import type { Starter } from "@/lib/askiris/starter-questions";

const HERO_SIZE = { page: IRIS_ASSISTANT.size, side: IRIS_ASSISTANT.size, sheet: 64 } as const;

export default function AskIrisEmptyState({
  variant,
  input,
  onInputChange,
  onSubmit,
  onStarter,
  starterSeed,
  disabled,
}: {
  /** side and sheet: the Iris panel beside the page, which drops the hero on a short screen. */
  variant: "page" | "side" | "sheet";
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  /** Sends an example question as it is. */
  onStarter: (starter: Starter) => void;
  /** From the server where this renders there, so hydration shows the same questions. */
  starterSeed: number | null;
  disabled: boolean;
}) {
  const t = useTranslations("AskIris");
  const panel = variant !== "page";
  const starters = useStarters({ compact: panel, seed: starterSeed });

  return (
    <div
      className={cn(
        // Safe centering: when the content is taller than the room left (a short screen, the
        // keyboard), it starts at the top and scrolls instead of spilling over the top bar.
        // -mx-2 px-2: the scroll box clips sideways too, and would cut off the composer's shadow.
        "-mx-2 flex min-h-0 flex-1 flex-col items-center justify-center-safe overflow-y-auto px-2 text-center",
        panel ? "gap-4 pb-6 [container-type:size]" : "gap-6 pb-10",
      )}
    >
      <div className={cn("shrink-0", panel && "[@container(max-height:480px)]:hidden")}>
        <Iris config={IRIS_ASSISTANT} size={HERO_SIZE[variant]} uid="askiris-hero" />
      </div>

      <div className={panel ? "space-y-2" : "space-y-3"}>
        <h1
          className={cn(
            "font-heading leading-tight font-bold whitespace-pre-line",
            panel ? "text-xl" : "text-3xl sm:text-4xl",
          )}
        >
          {t("heading")}
          <span className="ml-2 inline-flex align-middle font-sans">
            <AiTag />
          </span>
        </h1>
        <p className={cn("text-muted-foreground text-sm", !panel && "sm:text-base")}>{t("subtitle")}</p>
      </div>

      <div className="w-full max-w-2xl">
        <AskIrisComposer
          size={panel ? "md" : "lg"}
          value={input}
          onChange={onInputChange}
          onSubmit={onSubmit}
          disabled={disabled}
          placeholder={t("placeholder")}
          sendLabel={t("send")}
          autoFocus
        />
      </div>

      {/* Phones: a full-width column that may shrink and wraps the questions that no longer fit
          into a second column clipped off to the side, so only whole questions show and the
          page does not scroll. */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 max-sm:min-h-0 max-sm:w-full max-sm:flex-col max-sm:content-start max-sm:overflow-hidden">
        {starters.map((starter) => (
          <div key={starter.text} className="max-sm:flex max-sm:w-full max-sm:justify-center">
            <ExampleQuestion disabled={disabled} onClick={() => onStarter(starter)}>
              {starter.text}
            </ExampleQuestion>
          </div>
        ))}
      </div>
    </div>
  );
}
