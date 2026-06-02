"use client";

import { useEffect, useState } from "react";

// Pixels the on-screen keyboard overlaps the bottom of the layout viewport (0 when
// closed). iOS shrinks only the visual viewport when the keyboard opens, so this is
// `innerHeight - visualViewport.height - offsetTop`. Intended for a narrow use: sizing
// a bottom spacer inside a scroll region so its last rows can clear the keyboard. This
// does NOT reposition any fixed element — see [[reference_ios_keyboard_fixed_overlay]]
// for why driving a fixed overlay's position off visualViewport is a dead end.
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) {
      return;
    }

    function update() {
      const v = window.visualViewport;
      if (!v) {
        return;
      }
      setInset(Math.max(0, window.innerHeight - v.height - v.offsetTop));
    }

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
