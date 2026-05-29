"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Z, FAB_REVEAL_SCROLL_Y } from "@/config/ui";
import { spring } from "@/lib/animation";

export default function BackToTopButton() {
  const tc = useTranslations("Common");
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > FAB_REVEAL_SCROLL_Y);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={spring.bounce}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{ bottom: `calc(5rem + var(--compare-bar-height, 0px))` }}
          className={`fixed right-6 ${Z.fixed} w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors`}
          aria-label={tc("backToTop")}
        >
          <ChevronUp size={20} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
