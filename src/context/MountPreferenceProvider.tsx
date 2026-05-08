"use client";

import { createContext, useContext, useState } from "react";
import type { Mount } from "@/lib/types";

interface MountPreferenceContextValue {
  preference: Mount;
  setPreference: (mount: Mount) => void;
}

const MountPreferenceContext = createContext<MountPreferenceContextValue | null>(null);

export function MountPreferenceProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<Mount>("X");

  return (
    <MountPreferenceContext.Provider value={{ preference, setPreference }}>
      {children}
    </MountPreferenceContext.Provider>
  );
}

export function useMountPreference() {
  const ctx = useContext(MountPreferenceContext);
  if (!ctx) throw new Error("useMountPreference must be used within MountPreferenceProvider");
  return ctx;
}
