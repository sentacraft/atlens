"use client";

import { useEffectiveMount } from "@/hooks/useMountParam";

export default function HeroBrand() {
  const mount = useEffectiveMount();
  return (
    <span className="relative">
      X-Glass
      {mount === "G" && (
        <span className="absolute -top-2 -right-[2.6rem] text-[0.75rem] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
          GFX
        </span>
      )}
    </span>
  );
}
