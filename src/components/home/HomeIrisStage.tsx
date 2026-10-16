"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";

export const HOME_IRIS_SPRING = { type: "spring", stiffness: 360, damping: 34, mass: 0.9 } as const;

const FocusContext = createContext<{ focused: boolean; setFocused: (focused: boolean) => void } | null>(null);

/** The home hero while Ask Iris is open in place: the header folds up to make room for the panel. */
export function HomeIrisStage({ children }: { children: React.ReactNode }) {
  const [focused, setFocused] = useState(false);
  const value = useMemo(() => ({ focused, setFocused }), [focused]);
  return (
    <FocusContext.Provider value={value}>
      <MotionConfig reducedMotion="user" transition={HOME_IRIS_SPRING}>
        <LayoutGroup>{children}</LayoutGroup>
      </MotionConfig>
    </FocusContext.Provider>
  );
}

export function useHomeIrisFocus() {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error("useHomeIrisFocus must be used inside HomeIrisStage");
  }
  return context;
}

/**
 * One block of the hero and what it does while Ask Iris is open.
 * `hide` leaves the flow, `shrink` exposes `data-folded` for `group-data-[folded]:` classes,
 * `move` only follows the blocks around it.
 */
export function HomeFold({
  mode,
  className,
  children,
}: {
  mode: "hide" | "shrink" | "move";
  className?: string;
  children: React.ReactNode;
}) {
  const { focused } = useHomeIrisFocus();

  if (mode === "hide") {
    return (
      <AnimatePresence initial={false} mode="popLayout">
        {!focused && (
          <motion.div
            key="fold"
            layout
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
            className={className}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      layout={mode === "shrink" ? true : "position"}
      data-folded={mode === "shrink" && focused ? "" : undefined}
      className={mode === "shrink" ? `group ${className ?? ""}` : className}
    >
      {children}
    </motion.div>
  );
}
