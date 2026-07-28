"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { LensLinkIndex } from "@/lib/ai/lens-ref";

// The ref -> lens map, made available to whatever renders Iris's prose. It crosses the
// server/client boundary as a prop because the alternative — importing the catalogue in
// a client component — ships 477KB of JSON to the browser to derive a 13KB map. Once
// across, it travels by context rather than through every component in between: it is a
// constant for the whole tree, and Markdown is two levels below the only thing that has it.
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

// Undefined outside a provider, which is the honest answer: a `lens:` reference then
// renders as plain text rather than a broken link.
export function useLensLinks(): LensLinkIndex | undefined {
  return useContext(LensLinkContext);
}
