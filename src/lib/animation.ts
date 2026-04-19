import type { Transition } from "motion/react";

export const spring = {
  snappy: {
    type: "spring",
    stiffness: 500,
    damping: 30,
    mass: 1,
  } satisfies Transition,
  bounce: {
    type: "spring",
    stiffness: 400,
    damping: 20,
    mass: 0.8,
  } satisfies Transition,
};
