"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu } from "@base-ui/react/menu";
import { Camera, ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Avatar from "@/components/auth/Avatar";
import AvatarCropDialog from "@/components/me/AvatarCropDialog";
import { MenuPopup } from "@/components/ui/menu";
import { MENU_ITEM_CLS, MENU_ITEM_DANGER_CLS } from "@/config/ui-tokens";
import { refreshSession } from "@/lib/me/account-client";
import { isUploadedAvatar } from "@/lib/me/avatar";
import { removeAvatar } from "@/lib/me/avatar-client";

const ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * The profile's avatar with a camera badge. Without an uploaded photo it opens the file picker; with
 * one it opens a menu to change or remove it. A picked photo goes through the crop dialog.
 */
export default function AvatarEditor({
  name,
  email,
  image,
  className,
}: {
  name: string;
  email: string;
  image?: string | null;
  className?: string;
}) {
  const t = useTranslations("Profile");
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const uploaded = isUploadedAvatar(image);

  async function remove() {
    try {
      await removeAvatar();
      refreshSession();
    } catch {
      toast.error(t("avatarError"));
    }
  }

  const face = (
    <>
      <Avatar name={name} email={email} image={image} className={className} />
      <span className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm md:h-[26px] md:w-[26px]">
        <Camera className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </>
  );
  const buttonCls = "relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2";

  return (
    <>
      {uploaded ? (
        <Menu.Root>
          <Menu.Trigger aria-label={t("avatarMenu")} className={buttonCls}>
            {face}
          </Menu.Trigger>
          <MenuPopup align="start" sideOffset={8} className="w-52">
            <Menu.Item onClick={() => input.current?.click()} className={MENU_ITEM_CLS}>
              <ImageIcon className="h-4 w-4 shrink-0" />
              {t("avatarChange")}
            </Menu.Item>
            <Menu.Item onClick={remove} className={MENU_ITEM_DANGER_CLS}>
              <Trash2 className="h-4 w-4 shrink-0" />
              {t("avatarRemove")}
            </Menu.Item>
          </MenuPopup>
        </Menu.Root>
      ) : (
        <button type="button" aria-label={t("avatarUpload")} onClick={() => input.current?.click()} className={buttonCls}>
          {face}
        </button>
      )}

      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        hidden
        data-testid="avatar-input"
        onChange={(event) => {
          setPicked(event.target.files?.[0] ?? null);
          // The same file picked again must still fire a change.
          event.target.value = "";
        }}
      />
      <AvatarCropDialog file={picked} onClose={() => setPicked(null)} />
    </>
  );
}
