"use client";

import { useEffectiveMount } from "@/hooks/useMountParam";

export default function HeroBrand() {
  const mount = useEffectiveMount();
  return (
    <span className="relative">
      X-Glass
      {mount === "G" && (
        <span className="absolute -top-3.5 -right-2 px-2 py-0.5 text-xs font-semibold tracking-wider leading-none rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase">
          GFX
        </span>
      )}
    </span>
  );
}
