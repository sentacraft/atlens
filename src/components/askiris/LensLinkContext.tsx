"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { LensLinkIndex } from "@/lib/ai/lens-ref";

// Passed from the server: importing the catalogue in a client component would ship 477KB to
// build a 13KB map.
const LensLinkContext = createContext<LensLinkIndex | undefined>(undefined);

export function LensLinkProvider({
  index,
  children,
}: {
  index: LensLinkIndex;
  children: ReactNode;
}) {
  return <LensLinkContext.Provider value={index}>{children}</LensLinkContext.Provider>;
}

export function useLensLinks(): LensLinkIndex | undefined {
  return useContext(LensLinkContext);
}
