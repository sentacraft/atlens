"use client";

import { useParams } from "next/navigation";
import { createContext, useContext, useMemo, useState } from "react";
import type { Mount } from "@/lib/types";
import { urlSegmentToMount } from "@/lib/mount";

interface MountPreferenceContextValue {
  preference: Mount;
  setPreference: (mount: Mount) => void;
}

const MountPreferenceContext = createContext<MountPreferenceContextValue | null>(null);

export function MountPreferenceProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<Mount>("X");
  const params = useParams<{ mount?: string }>();
  const mount = urlSegmentToMount(params.mount);

  if (mount && mount !== preference) {
    setPreference(mount);
  }

  const value = useMemo(
    () => ({ preference, setPreference }),
    [preference]
  );

  return (
    <MountPreferenceContext value={value}>
      {children}
    </MountPreferenceContext>
  );
}

export function useMountPreference() {
  const ctx = useContext(MountPreferenceContext);
  if (!ctx) {
    throw new Error("useMountPreference must be used within MountPreferenceProvider");
  }
  return ctx;
}
