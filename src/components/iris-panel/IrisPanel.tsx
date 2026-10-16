"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import AskIrisChat, { type IrisPanelRequest } from "@/components/askiris/AskIrisChat";
import { Z } from "@/config/ui";
import { askIrisChatDataQuery } from "@/lib/askiris/chat-data";
import { cn } from "@/lib/utils";

/** The Ask Iris side panel: below the nav, beside the page, which makes room for it. */
export default function IrisPanel({
  shown,
  request,
  onClose,
}: {
  shown: boolean;
  request: IrisPanelRequest | null;
  onClose: () => void;
}) {
  const t = useTranslations("AskIris");
  const locale = useLocale();
  const data = useQuery(askIrisChatDataQuery(locale));

  return (
    <aside
      aria-label="Iris"
      hidden={!shown}
      className={cn(
        "fixed right-0 bottom-0 flex w-[var(--iris-panel-width)] flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
        // --nav-height leaves out the nav's 1px bottom border, which the panel would cover: it stacks above the nav.
        "top-[calc(var(--nav-height)+1px)] pb-[var(--safe-inset-bottom)]",
        Z.fixed,
      )}
    >
      {data.data ? (
        <AskIrisChat
          shell={{ variant: "panel", request, onClose }}
          linkTargets={data.data.linkTargets}
          lenses={data.data.lenses}
        />
      ) : (
        <p className="grid flex-1 place-items-center text-sm text-zinc-500 dark:text-zinc-400">
          {data.isError ? t("errorUnavailable") : t("loadingConversation")}
        </p>
      )}
    </aside>
  );
}
