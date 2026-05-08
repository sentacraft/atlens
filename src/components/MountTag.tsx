"use client";

import { useEffectiveMount } from "@/hooks/useMountParam";

export default function HeroBrand() {
  const mount = useEffectiveMount();
  return (
    <span className="relative">
      X-Glass
      {mount === "G" && (
        <span className="absolute -top-3 -right-3 px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wider leading-none rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase">
          GFX
        </span>
      )}
    </span>
  );
}
