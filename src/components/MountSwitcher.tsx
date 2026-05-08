"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useMountParam } from "@/hooks/useMountParam";

export default function MountSwitcher({ className }: { className?: string }) {
  const t = useTranslations("MountSwitcher");
  const mount = useMountParam();

  const tabs = [
    { href: "/lenses/x", label: t("x"), active: mount === "X" },
    { href: "/lenses/gfx", label: t("gfx"), active: mount === "G" },
  ] as const;

  return (
    <div className={className}>
      {tabs.map(({ href, label, active }) => (
        <Link
          key={href}
          href={href}
          className={`text-sm font-medium px-2.5 py-1 rounded-lg transition-colors ${
            active
              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
