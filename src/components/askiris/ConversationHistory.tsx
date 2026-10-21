"use client";

import { useRef, useState } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { Menu } from "@base-ui/react/menu";
import { Cloud, Ellipsis, Pencil, Plus, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ACTION_QUIET_CLS, ACTION_OUTLINE_CLS, ACTION_PRIMARY_CLS, ICON_CLOSE_BTN_CLS, ICON_NAV_BTN_CLS, LIST_ITEM_ACTIVE_CLS, MENU_ITEM_CLS, MENU_ITEM_DANGER_CLS, MENU_POPUP_CLS } from "@/config/ui-tokens";
import { MAX_CONVERSATION_TITLE_LENGTH } from "@/lib/askiris/conversation-contract";
import type { AskIrisConversationRecord } from "@/lib/askiris/conversation-repository";
import type { ConversationListState } from "@/components/askiris/useConversation";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ConversationHistory({
  open,
  onOpenChange,
  conversations,
  listState,
  activeConversationId,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onSignIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: AskIrisConversationRecord[];
  listState: ConversationListState;
  activeConversationId: string;
  onSelect: (conversationId: string) => void;
  onNew: () => void;
  onRename: (conversationId: string, title: string) => void;
  onDelete: (conversationId: string) => void;
  /** Offers to sign in, for visitors without an account; null for those with one. */
  onSignIn: (() => void) | null;
}) {
  const t = useTranslations("AskIris");
  const locale = useLocale();
  const dateFormat = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AskIrisConversationRecord | null>(null);

  return (
    <>
      <Drawer.Root open={open} onOpenChange={onOpenChange} swipeDirection="left">
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 bg-zinc-950/40 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <Drawer.Viewport>
            <Drawer.Popup
              className={cn(
                "fixed inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col border-r border-zinc-200 bg-white shadow-2xl",
                "pt-[calc(var(--safe-inset-top)+var(--titlebar-height))] pb-[var(--safe-inset-bottom)]",
                "transition-transform duration-200 data-ending-style:-translate-x-full data-starting-style:-translate-x-full data-[swipe-dismiss]:!transition-none",
              )}
            >
              <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
                <Drawer.Title className="text-sm font-semibold text-zinc-900">
                  {t("history")}
                </Drawer.Title>
                <Drawer.Close aria-label={t("closeHistory")} className={cn(ICON_CLOSE_BTN_CLS, "size-8")}>
                  <X className="size-4" />
                </Drawer.Close>
              </div>
              {onSignIn && (
                <div className="mx-4 mb-3 flex flex-col gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-700">
                      <Cloud className="size-4" />
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-zinc-900 sm:text-[13px]">{t("historySignInTitle")}</p>
                      <p className="text-[13px] leading-relaxed text-zinc-500 sm:text-xs">
                        {conversations.length > 0 ? t("historySignInBody") : t("historySignInBodyEmpty")}
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={onSignIn} className={cn(ACTION_PRIMARY_CLS, "h-10 justify-center rounded-lg text-sm sm:h-8 sm:text-[13px]")}>
                    {t("historySignIn")}
                  </button>
                </div>
              )}
              <div className="px-4 pb-3">
                <button type="button" onClick={onNew} className={cn(ACTION_OUTLINE_CLS, "w-full justify-center")}>
                  <Plus className="size-4" />
                  {t("newChat")}
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
                {listState === "loading" ? (
                  <div className="space-y-2 px-2" aria-busy="true">
                    {[0, 1, 2].map((key) => (
                      <div key={key} className="h-12 animate-pulse rounded-lg bg-zinc-100" />
                    ))}
                  </div>
                ) : listState === "error" ? (
                  <p className="px-2 py-3 text-xs text-zinc-500">{t("historyError")}</p>
                ) : conversations.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-zinc-500">{t("historyEmpty")}</p>
                ) : (
                  <ul className="space-y-1">
                    {conversations.map((conversation) => {
                      const active = conversation.id === activeConversationId;
                      if (conversation.id === editingId) {
                        return (
                          <li key={conversation.id}>
                            <RenameForm
                              title={conversation.title}
                              onDone={(title) => {
                                setEditingId(null);
                                if (title && title !== conversation.title) {
                                  onRename(conversation.id, title);
                                }
                              }}
                            />
                          </li>
                        );
                      }
                      return (
                        <li
                          key={conversation.id}
                          className={cn(
                            "group flex items-start rounded-lg border transition-colors",
                            active ? LIST_ITEM_ACTIVE_CLS : "border-transparent hover:bg-zinc-50",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onSelect(conversation.id)}
                            aria-current={active ? "true" : undefined}
                            className="flex min-w-0 flex-1 flex-col gap-0.5 py-2.5 pl-3 text-left"
                          >
                            <span className="line-clamp-2 text-sm leading-5 text-zinc-800">
                              {conversation.title}
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              {dateFormat.format(conversation.updatedAt)}
                            </span>
                          </button>
                          <Menu.Root>
                            <Menu.Trigger
                              aria-label={t("conversationActions", { title: conversation.title })}
                              className={cn(ICON_NAV_BTN_CLS, "m-1 size-9 sm:size-8")}
                            >
                              <Ellipsis className="size-4" />
                            </Menu.Trigger>
                            <Menu.Portal>
                              <Menu.Positioner side="bottom" align="end" sideOffset={4}>
                                <Menu.Popup className={cn(MENU_POPUP_CLS, "w-36")}>
                                  <Menu.Item onClick={() => setEditingId(conversation.id)} className={MENU_ITEM_CLS}>
                                    <Pencil className="size-4 shrink-0" />
                                    {t("renameConversation")}
                                  </Menu.Item>
                                  <Menu.Item onClick={() => setPendingDelete(conversation)} className={MENU_ITEM_DANGER_CLS}>
                                    <Trash2 className="size-4 shrink-0" />
                                    {t("deleteConversation")}
                                  </Menu.Item>
                                </Menu.Popup>
                              </Menu.Positioner>
                            </Menu.Portal>
                          </Menu.Root>
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

      <Dialog open={pendingDelete !== null} onOpenChange={(next) => !next && setPendingDelete(null)}>
        <DialogPopup className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteConversationTitle")}</DialogTitle>
            <DialogDescription>{t("deleteConversationBody", { title: pendingDelete?.title ?? "" })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              type="button"
              className={ACTION_QUIET_CLS}
            >
              {t("cancel")}
            </DialogClose>
            <button
              type="button"
              onClick={() => {
                if (pendingDelete) {
                  onDelete(pendingDelete.id);
                }
                setPendingDelete(null);
              }}
              className={cn(ACTION_PRIMARY_CLS, "h-9 rounded-lg px-3 text-sm")}
            >
              {t("deleteConversation")}
            </button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </>
  );
}

function RenameForm({ title, onDone }: { title: string; onDone: (title: string | null) => void }) {
  const t = useTranslations("AskIris");
  const [value, setValue] = useState(title);
  // Enter and the blur that follows it would otherwise both finish the edit.
  const finished = useRef(false);

  function finish(next: string | null) {
    if (!finished.current) {
      finished.current = true;
      onDone(next);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        finish(value.trim() || null);
      }}
      className="px-1 py-1"
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => finish(value.trim() || null)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            finish(null);
          }
        }}
        aria-label={t("conversationTitleLabel")}
        maxLength={MAX_CONVERSATION_TITLE_LENGTH}
        autoFocus
        onFocus={(event) => event.currentTarget.select()}
        className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-zinc-500 sm:text-sm"
      />
    </form>
  );
}
