"use client";

import { useEffect } from "react";
import { meta, brandCount } from "@/lib/lens";

export default function ConsoleEgg() {
  useEffect(() => {
    console.log(
      [
        `X-Glass v${meta.version}`,
        `lens.json loaded ✓`,
        `${meta.lensCount} lenses · ${brandCount} brands`,
        `No hallucinations guaranteed.`,
      ].join("\n")
    );
  }, []);

  return null;
}
