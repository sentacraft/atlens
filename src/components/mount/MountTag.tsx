"use client";

import { useEffectiveMount } from "@/hooks/useMountParam";

export default function HeroBrand() {
  const mount = useEffectiveMount();
  return (
    <span className="relative">
      Atlens
      {mount === "G" && (
        <span className="absolute top-1 left-full ml-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 text-[10px] font-semibold tracking-[0.18em] px-1.5 py-[2px] rounded leading-none select-none font-sans animate-in fade-in zoom-in-95 duration-150">
          GFX
        </span>
      )}
    </span>
  );
}
