"use client";

import { Drawer } from "@base-ui/react/drawer";
import { History, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Z } from "@/config/ui";
import {
  ACTION_OUTLINE_CLS,
  ICON_CLOSE_BTN_CLS,
  ICON_NAV_BTN_CLS,
  LIST_ITEM_ACTIVE_CLS,
} from "@/config/ui-tokens";
import type { ConversationSummary } from "@/lib/askiris/conversation-client";
import type { ConversationListState } from "@/components/askiris/useConversation";

export default function ConversationHistory({
  open,
  onOpenChange,
  conversations,
  listState,
  activeConversationId,
  busy,
  onSelect,
  onNew,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: ConversationSummary[];
  listState: ConversationListState;
  activeConversationId: string;
  busy: boolean;
  onSelect: (conversationId: string) => void;
  onNew: () => void;
}) {
  const t = useTranslations("AskIris");
  const locale = useLocale();
  const dateFormat = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} swipeDirection="left">
      <Drawer.Trigger
        aria-label={t("openHistory")}
        title={t("history")}
        className={cn(ICON_NAV_BTN_CLS, "size-9")}
      >
        <History className="size-4.5" />
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop
          className={cn(
            "fixed inset-0 bg-zinc-950/40 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0",
            Z.dialog,
          )}
        />
        <Drawer.Viewport>
          <Drawer.Popup
            className={cn(
              "fixed inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col border-r border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950",
              "pt-[calc(var(--safe-inset-top)+var(--titlebar-height))] pb-[var(--safe-inset-bottom)]",
              "transition-transform duration-200 data-ending-style:-translate-x-full data-starting-style:-translate-x-full data-[swipe-dismiss]:!transition-none",
              Z.dialog,
            )}
          >
            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
              <Drawer.Title className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t("history")}
              </Drawer.Title>
              <Drawer.Close aria-label={t("closeHistory")} className={cn(ICON_CLOSE_BTN_CLS, "size-8")}>
                <X className="size-4" />
              </Drawer.Close>
            </div>
            <div className="px-4 pb-3">
              <button
                type="button"
                onClick={onNew}
                disabled={busy}
                className={cn(ACTION_OUTLINE_CLS, "w-full disabled:cursor-not-allowed disabled:opacity-40")}
              >
                <Plus className="size-4" />
                {t("newChat")}
              </button>
              {busy ? (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{t("historyBusy")}</p>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
              {listState === "loading" ? (
                <div className="space-y-2 px-2" aria-busy="true">
                  {[0, 1, 2].map((key) => (
                    <div key={key} className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
                  ))}
                </div>
              ) : listState === "error" ? (
                <p className="px-2 py-3 text-xs text-zinc-500 dark:text-zinc-400">{t("historyError")}</p>
              ) : conversations.length === 0 ? (
                <p className="px-2 py-3 text-xs text-zinc-500 dark:text-zinc-400">{t("historyEmpty")}</p>
              ) : (
                <ul className="space-y-1">
                  {conversations.map((conversation) => {
                    const active = conversation.id === activeConversationId;
                    return (
                      <li key={conversation.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(conversation.id)}
                          disabled={busy && !active}
                          aria-current={active ? "true" : undefined}
                          className={cn(
                            "flex w-full flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                            active
                              ? LIST_ITEM_ACTIVE_CLS
                              : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900",
                          )}
                        >
                          <span className="line-clamp-2 text-sm leading-5 text-zinc-800 dark:text-zinc-200">
                            {conversation.title}
                          </span>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {dateFormat.format(conversation.updatedAt)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
