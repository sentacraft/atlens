"use client";

import { useEffectiveMount } from "@/hooks/useMountParam";

export default function HeroBrand() {
  const mount = useEffectiveMount();
  return (
    <span className="relative">
      X-Glass
      {mount === "G" && (
        <span className="absolute top-0 left-full ml-1 -translate-y-1/3 text-[0.8rem] font-mono font-normal text-zinc-500 dark:text-zinc-400 leading-none tracking-normal select-none">
          [G]
        </span>
      )}
    </span>
  );
}
