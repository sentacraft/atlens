"use client";

import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Z, FAB_REVEAL_SCROLL_Y } from "@/config/ui";

export default function BackToTopButton() {
  const tc = useTranslations("Common");
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > FAB_REVEAL_SCROLL_Y);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Always mounted: conditional rendering would unmount it before the fade-out runs.
  return (
    <button
      data-visible={show}
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      style={{ bottom: `max(calc(5rem + var(--compare-bar-height, 0px) + var(--tab-bar-height)), var(--revisit-prompt-top, 0px))` }}
      className={`fixed right-6 ${Z.fixed} w-12 h-12 flex items-center justify-center rounded-full bg-white border border-zinc-200 shadow-lg text-zinc-600 hover:bg-zinc-50 opacity-0 scale-[0.8] pointer-events-none transition-[opacity,transform,background-color] duration-200 ease-out motion-reduce:transition-none data-[visible=true]:opacity-100 data-[visible=true]:scale-100 data-[visible=true]:pointer-events-auto`}
      aria-label={tc("backToTop")}
    >
      <ChevronUp size={20} />
    </button>
  );
}
