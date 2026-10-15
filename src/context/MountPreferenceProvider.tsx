"use client";

import { useParams } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Mount } from "@/lib/types";
import { urlSegmentToMount } from "@/lib/mount";
import { accountUser, authClient } from "@/lib/auth-client";
import { userSettingsQuery } from "@/lib/me/settings-client";

interface MountPreferenceContextValue {
  preference: Mount;
  setPreference: (mount: Mount) => void;
}

const MountPreferenceContext = createContext<MountPreferenceContextValue | null>(null);

/**
 * The mount for pages whose URL names none: the last mount the URL named, starting from the
 * account's saved default mount once its settings load.
 */
export function MountPreferenceProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<Mount>("X");
  const params = useParams<{ mount?: string }>();
  const mount = urlSegmentToMount(params.mount);
  const { data: session } = authClient.useSession();
  const userId = accountUser(session)?.id;
  const { data: settings } = useQuery({ ...userSettingsQuery(userId ?? ""), enabled: Boolean(userId) });
  const savedAppliedFor = useRef<string | null>(null);

  if (mount && mount !== preference) {
    setPreference(mount);
  }

  useEffect(() => {
    if (!userId || !settings || savedAppliedFor.current === userId) {
      return;
    }
    savedAppliedFor.current = userId;
    if (!mount) {
      setPreference(settings.defaultMount);
    }
  }, [userId, settings, mount]);

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
