"use client";

import { useEffect } from "react";

interface ConsoleEggProps {
  version: string;
  lensCount: number;
  brandCount: number;
}

export default function ConsoleEgg({ version, lensCount, brandCount }: ConsoleEggProps) {
  useEffect(() => {
    console.log(
      [
        `Atlens v${version}`,
        `lens.json loaded ✓`,
        `${lensCount} lenses · ${brandCount} brands`,
        `No hallucinations guaranteed.`,
      ].join("\n")
    );
  }, [version, lensCount, brandCount]);

  return null;
}
