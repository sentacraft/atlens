"use client";

import { useEffect, useState } from "react";
import { Z, FAB_REVEAL_SCROLL_Y } from "@/config/ui";
import { ShareButton } from "@/components/share/ShareButton";
import type { Lens } from "@/lib/types";

interface Props {
  lenses: Lens[];
  presetTitle?: string;
  presetSubtitle?: string;
}

export default function ShareFAB({ lenses, presetTitle, presetSubtitle }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > FAB_REVEAL_SCROLL_Y);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (lenses.length === 0) {
    return null;
  }

  // Always mounted, visibility toggled via a data attribute so CSS can
  // transition both directions (see BackToTopButton for the same pattern).
  return (
    <div
      data-visible={show}
      aria-hidden={!show}
      style={{ bottom: `calc(1.5rem + var(--compare-bar-height, 0px))` }}
      className={`fixed right-6 ${Z.fixed} opacity-0 scale-[0.8] pointer-events-none transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none data-[visible=true]:opacity-100 data-[visible=true]:scale-100 data-[visible=true]:pointer-events-auto`}
      data-testid="share-fab"
    >
      <ShareButton
        lenses={lenses}
        variant="fab"
        presetTitle={presetTitle}
        presetSubtitle={presetSubtitle}
      />
    </div>
  );
}
