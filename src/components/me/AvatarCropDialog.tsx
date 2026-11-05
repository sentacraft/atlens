"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Cropper, { type Area } from "react-easy-crop";
import { Minus, Plus, X } from "lucide-react";
import { ACTION_PRIMARY_CLS, ACTION_QUIET_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import { cropToAvatar, loadImage, UnreadableImageError } from "@/lib/me/avatar-crop";
import { AvatarRequestError, uploadAvatar } from "@/lib/me/avatar-client";
import { refreshSession } from "@/lib/me/account-client";
import {
  Dialog,
  DialogCancel,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

/** Crops the picked photo to a circle's worth of square and uploads it as the account's avatar. */
export default function AvatarCropDialog({ file, onClose }: { file: File | null; onClose: () => void }) {
  const t = useTranslations("Profile");
  const tAuth = useTranslations("Auth");
  const [src, setSrc] = useState<string>();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [area, setArea] = useState<Area>();
  const [unreadable, setUnreadable] = useState(false);
  const [saveError, setSaveError] = useState<"avatarUnreadable" | "avatarLimit" | "avatarError">();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(MIN_ZOOM);
    setArea(undefined);
    setUnreadable(false);
    setSaveError(undefined);
    if (!file) {
      setSrc(undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    // A file the browser cannot decode is reported here, before the person tries to save it.
    loadImage(url).catch(() => setUnreadable(true));
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function save() {
    if (!src || !area) {
      return;
    }
    setSaving(true);
    setSaveError(undefined);
    try {
      await uploadAvatar(await cropToAvatar(src, area));
      refreshSession();
      onClose();
    } catch (failure) {
      setSaveError(
        failure instanceof UnreadableImageError
          ? "avatarUnreadable"
          : failure instanceof AvatarRequestError && failure.code === "rate_limited"
            ? "avatarLimit"
            : "avatarError",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(file)} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogClose
            aria-label={tAuth("close")}
            className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X className="h-4 w-4" />
          </DialogClose>
          <DialogTitle>{t("avatarCropTitle")}</DialogTitle>
          <DialogDescription>{t("avatarCropHint")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-5 pt-3 pb-5">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-950 sm:aspect-[4/3]">
            {src && !unreadable && (
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setArea(pixels)}
              />
            )}
          </div>

          <div className="flex items-center gap-3 text-zinc-500">
            <Minus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <input
              type="range"
              aria-label={t("avatarZoom")}
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="h-7 min-w-0 flex-1 cursor-pointer accent-zinc-900"
            />
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
          </div>

          {(unreadable || saveError) && <p className="text-sm text-red-600">{t(unreadable ? "avatarUnreadable" : saveError!)}</p>}
        </div>

        <DialogFooter>
          <DialogCancel className={ACTION_QUIET_CLS}>{t("cancel")}</DialogCancel>
          <button
            type="button"
            onClick={save}
            disabled={!area || unreadable || saving}
            className={cn(ACTION_PRIMARY_CLS, "h-9 rounded-lg px-4 text-sm font-medium")}
          >
            {saving ? t("saving") : t("save")}
          </button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
