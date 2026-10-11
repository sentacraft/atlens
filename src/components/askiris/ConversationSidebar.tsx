"use client";

import { Menu, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/components/askiris/useConversation";

export default function ConversationSidebar({
  authenticated,
  conversations,
  activeConversationId,
  loading,
  error,
  mobileOpen,
  onMobileOpenChange,
  onNewConversation,
  onSelectConversation,
}: {
  authenticated: boolean;
  conversations: ConversationSummary[];
  activeConversationId: string;
  loading: boolean;
  error: boolean;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
}) {
  const t = useTranslations("AskIris");
  const locale = useLocale();

  if (!authenticated) {
    return null;
  }

  const content = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <h2 className="text-sm font-medium text-foreground">{t("history")}</h2>
        <button
          type="button"
          onClick={onMobileOpenChange.bind(null, false)}
          aria-label={t("closeHistory")}
          className="text-muted-foreground hover:text-foreground md:hidden"
        >
          <X className="size-5" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          onNewConversation();
          onMobileOpenChange(false);
        }}
        className="mx-3 mb-3 flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm text-foreground transition-colors hover:bg-muted"
      >
        <Plus className="size-4" />
        {t("newChat")}
      </button>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {loading ? (
          <div className="space-y-2 px-2 py-2" aria-label={t("loadingHistory")}>
            <div className="h-10 animate-pulse rounded-lg bg-muted" />
            <div className="h-10 animate-pulse rounded-lg bg-muted" />
            <div className="h-10 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : error ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">{t("historyError")}</p>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">{t("historyEmpty")}</p>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => {
                  onSelectConversation(conversation.id);
                  onMobileOpenChange(false);
                }}
                className={cn(
                  "flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors",
                  conversation.id === activeConversationId
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                <span className="line-clamp-2 text-sm leading-5">{conversation.title}</span>
                <span className="text-[11px] text-muted-foreground">
                  {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(
                    conversation.updatedAt,
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => onMobileOpenChange(true)}
        aria-label={t("openHistory")}
        className="fixed top-[calc(var(--nav-height)+var(--safe-inset-top)+var(--titlebar-height)+0.75rem)] left-4 z-20 grid size-9 place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-sm md:hidden"
      >
        <Menu className="size-4" />
      </button>
      <aside className="hidden w-64 shrink-0 border-r border-border bg-background md:block">
        {content}
      </aside>
      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label={t("closeHistory")}
            onClick={() => onMobileOpenChange(false)}
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[min(20rem,85vw)] bg-background shadow-xl md:hidden">
            {content}
          </aside>
        </>
      )}
    </>
  );
}
