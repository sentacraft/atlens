"use client";

import { useEffectiveMount } from "@/hooks/useMountParam";

export default function HeroBrand() {
  const mount = useEffectiveMount();
  return (
    <span className="relative">
      X-Glass
      {mount === "G" && (
        <span className="absolute top-0 -right-1 -translate-y-1/3 text-[0.55rem] font-mono font-normal text-zinc-400 dark:text-zinc-500 leading-none tracking-normal select-none">
          [G]
        </span>
      )}
    </span>
  );
}
