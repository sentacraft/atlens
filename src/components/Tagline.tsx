"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

export default function Tagline() {
  const t = useTranslations("Footer");
  const [tagline, setTagline] = useState<string | null>(null);

  useEffect(() => {
    const taglines = [t("tagline1"), t("tagline2"), t("tagline3"), t("tagline4")];
    setTagline(taglines[Math.floor(Math.random() * taglines.length)]);
  }, [t]);

  // The tagline is picked on the client, so the server renders a blank line of the same height:
  // without it the line appears after hydration and shifts the centered home hero.
  if (!tagline) {
    return (
      <span aria-hidden className="text-[11px] select-none">
        {"\u00a0"}
      </span>
    );
  }

  return (
    <span className="text-[11px] text-zinc-400 dark:text-zinc-600 tracking-wide select-none animate-in fade-in duration-400">
      {tagline}
    </span>
  );
}
