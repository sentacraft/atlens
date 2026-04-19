"use client";

import { useState } from "react";
import Iris from "@/components/Iris";
import { IRIS_HERO } from "@/config/iris-config";

export default function IrisTooltip({ children }: { children: React.ReactNode }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  return (
    <>
      <span
        className="cursor-default underline decoration-dotted decoration-zinc-400 dark:decoration-zinc-500 underline-offset-2"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
      >
        {children}
      </span>
      {visible && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: pos.x + 18, top: pos.y + 18 }}
        >
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-xl">
            <Iris config={IRIS_HERO} uid="iris-tooltip" size={90} />
          </div>
        </div>
      )}
    </>
  );
}
