import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** That an account is free, said wherever sign-in is pitched. */
export default function FreeNote({ className }: { className?: string }) {
  const t = useTranslations("Auth");
  return (
    <p className={cn("flex items-center gap-1.5 text-[13px] text-zinc-600", className)}>
      <span className="inline-flex h-5 items-center rounded-full border border-zinc-200 bg-zinc-100 px-2 text-xs font-semibold text-zinc-900">
        {t("freeBadge")}
      </span>
      {t("freeNote")}
    </p>
  );
}
