"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function Tagline() {
  const t = useTranslations("Footer");
  const [tagline] = useState(() => {
    const taglines = [
      t("tagline1"),
      t("tagline2"),
      t("tagline3"),
      t("tagline4"),
    ];
    return taglines[Math.floor(Math.random() * taglines.length)];
  });

  return (
    <span className="text-[11px] text-zinc-400 dark:text-zinc-600 tracking-wide select-none">
      {tagline}
    </span>
  );
}
