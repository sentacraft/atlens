"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { accountUser, authClient } from "@/lib/auth-client";
import { userGearQuery } from "@/lib/me/gear-client";

/** Whether a catalog lens is in the signed-in user's gear. Every caller shares one cached gear request; guests make none. */
export function useIsOwnedLens(lensId: string): boolean {
  const { data: session } = authClient.useSession();
  const user = accountUser(session);
  const { data: gear } = useQuery({ ...userGearQuery(user?.id ?? ""), enabled: Boolean(user) });
  return useMemo(() => Boolean(gear?.some((entry) => entry.kind === "lens" && entry.catalogId === lensId)), [gear, lensId]);
}
