"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Z } from "@/config/ui";
import { spring } from "@/lib/animation";
import { ShareButton } from "@/components/share/ShareButton";
import type { Lens } from "@/lib/types";

const SCROLL_THRESHOLD = 400;

interface Props {
  lenses: Lens[];
  presetTitle?: string;
  presetSubtitle?: string;
}

export default function ShareFAB({ lenses, presetTitle, presetSubtitle }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > SCROLL_THRESHOLD);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (lenses.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={spring.bounce}
          style={{ bottom: `calc(1.5rem + var(--compare-bar-height, 0px))` }}
          className={`fixed right-6 ${Z.fixed}`}
          data-testid="share-fab"
        >
          <ShareButton
            lenses={lenses}
            variant="fab"
            presetTitle={presetTitle}
            presetSubtitle={presetSubtitle}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
