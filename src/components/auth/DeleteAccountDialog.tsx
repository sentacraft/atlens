"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ACTION_QUIET_CLS, ACTION_PRIMARY_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DeleteAccountDialog({
  email,
  open,
  onOpenChange,
}: {
  email: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [deleting, setDeleting] = useState(false);
  const [deleteEmailSent, setDeleteEmailSent] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function requestDeletion() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const { error } = await authClient.deleteUser({ callbackURL: `/${locale}` });
      if (error) {
        throw new Error("delete_failed");
      }
      setDeleteEmailSent(true);
    } catch {
      setDeleteError(t("genericError"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogClose
            aria-label={t("close")}
            className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X className="h-4 w-4" />
          </DialogClose>
          <DialogTitle>{t("deleteTitle")}</DialogTitle>
          <DialogDescription>
            {deleteEmailSent ? t("deleteEmailSent", { email }) : t("deleteDescription")}
          </DialogDescription>
        </DialogHeader>
        {deleteError && (
          <p className="px-5 pb-2 text-sm text-red-600">{deleteError}</p>
        )}
        <DialogFooter>
          <DialogClose
            type="button"
            className={ACTION_QUIET_CLS}
          >
            {deleteEmailSent ? t("close") : t("cancel")}
          </DialogClose>
          {!deleteEmailSent && (
            <button
              type="button"
              onClick={requestDeletion}
              disabled={deleting}
              className={cn(
                ACTION_PRIMARY_CLS,
                "h-9 rounded-lg bg-red-600 px-3 text-sm hover:bg-red-700",
              )}
            >
              {deleting ? t("deleteEmailSending") : t("deleteEmailSend")}
            </button>
          )}
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
