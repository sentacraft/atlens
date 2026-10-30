"use client";

import { useId, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import { ArrowLeft, Ellipsis, Pencil, SquarePen, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ACTION_QUIET_CLS, ACTION_PRIMARY_CLS, ICON_NAV_BTN_CLS, LIST_ITEM_ACTIVE_CLS, MENU_ITEM_CLS, MENU_ITEM_DANGER_CLS, MENU_POPUP_CLS, SKELETON_CLS } from "@/config/ui-tokens";
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

interface HistoryProps {
  conversations: AskIrisConversationRecord[];
  listState: ConversationListState;
  activeConversationId: string;
  onSelect: (conversationId: string) => void;
  onNew: () => void;
  onRename: (conversationId: string, title: string) => void;
  onDelete: (conversationId: string) => void;
  /** Offers to sign in, for visitors without an account; null for those with one. */
  onSignIn: (() => void) | null;
}

/** History as a popover under its trigger, for screens wide enough to keep the chat in view. */
export function ConversationHistoryPopover({
  open,
  onOpenChange,
  trigger,
  ...history
}: HistoryProps & { open: boolean; onOpenChange: (open: boolean) => void; trigger: ReactElement }) {
  const t = useTranslations("AskIris");
  const [pendingDelete, setPendingDelete] = useState<AskIrisConversationRecord | null>(null);

  return (
    <>
      <Popover.Root open={open} onOpenChange={onOpenChange}>
        <Popover.Trigger render={trigger} />
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="start" sideOffset={4} collisionPadding={8}>
            <Popover.Popup
              className={cn(
                MENU_POPUP_CLS,
                "flex max-h-[min(32rem,var(--available-height))] w-80 flex-col outline-none",
              )}
            >
              <HistoryContent
                {...history}
                header={<Popover.Title className="flex-1 pl-2 text-sm font-semibold text-zinc-900">{t("history")}</Popover.Title>}
                onRequestDelete={setPendingDelete}
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <DeleteConversationDialog
        conversation={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onDelete={history.onDelete}
      />
    </>
  );
}

/** History in place of the chat, for the phone sheet and narrow screens. */
export function ConversationHistoryView({ onBack, ...history }: HistoryProps & { onBack: () => void }) {
  const t = useTranslations("AskIris");
  const titleId = useId();
  const [pendingDelete, setPendingDelete] = useState<AskIrisConversationRecord | null>(null);

  return (
    <section aria-labelledby={titleId} className="-mx-4 flex min-h-0 flex-1 flex-col">
      <HistoryContent
        {...history}
        header={
          <>
            <button type="button" onClick={onBack} aria-label={t("backToChat")} className={cn(ICON_NAV_BTN_CLS, "size-10")}>
              <ArrowLeft className="size-4" />
            </button>
            <h2 id={titleId} className="flex-1 text-sm font-semibold text-zinc-900">{t("history")}</h2>
          </>
        }
        onRequestDelete={setPendingDelete}
      />
      <DeleteConversationDialog
        conversation={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onDelete={history.onDelete}
      />
    </section>
  );
}

function HistoryContent({
  header,
  conversations,
  listState,
  activeConversationId,
  onSelect,
  onNew,
  onRename,
  onRequestDelete,
  onSignIn,
}: Omit<HistoryProps, "onDelete"> & {
  header: ReactNode;
  onRequestDelete: (conversation: AskIrisConversationRecord) => void;
}) {
  const t = useTranslations("AskIris");
  const tAuth = useTranslations("Auth");
  const locale = useLocale();
  const dateFormat = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <>
      <div className="flex shrink-0 items-center gap-1 py-1.5 pr-2 pl-2">
        {header}
        <button type="button" onClick={onNew} aria-label={t("newChat")} className={cn(ICON_NAV_BTN_CLS, "size-8")}>
          <SquarePen className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5">
        {listState === "loading" ? (
          <div className="space-y-2 px-2" aria-busy="true">
            {[0, 1, 2].map((key) => (
              <div key={key} className={`h-12 rounded-lg ${SKELETON_CLS}`} />
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
                          <Menu.Item onClick={() => onRequestDelete(conversation)} className={MENU_ITEM_DANGER_CLS}>
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
      {onSignIn && (
        <section aria-label={t("guestChatsKept")} className="flex shrink-0 items-center gap-3 border-t border-zinc-200 py-2.5 pr-2.5 pl-4">
          <p className="flex-1 text-xs text-zinc-500">{t("guestChatsKept")}</p>
          <button type="button" onClick={onSignIn} className={cn(ACTION_PRIMARY_CLS, "h-8 rounded-lg px-3 text-[13px]")}>
            {tAuth("signIn")}
          </button>
        </section>
      )}
    </>
  );
}

function DeleteConversationDialog({
  conversation,
  onClose,
  onDelete,
}: {
  conversation: AskIrisConversationRecord | null;
  onClose: () => void;
  onDelete: (conversationId: string) => void;
}) {
  const t = useTranslations("AskIris");
  return (
    <Dialog open={conversation !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("deleteConversationTitle")}</DialogTitle>
          <DialogDescription>{t("deleteConversationBody", { title: conversation?.title ?? "" })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose type="button" className={ACTION_QUIET_CLS}>
            {t("cancel")}
          </DialogClose>
          <button
            type="button"
            onClick={() => {
              if (conversation) {
                onDelete(conversation.id);
              }
              onClose();
            }}
            className={cn(ACTION_PRIMARY_CLS, "h-9 rounded-lg px-3 text-sm")}
          >
            {t("deleteConversation")}
          </button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
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
