"use client";

import { createContext, useContext, type ReactNode } from "react";
import { accountUser, authClient } from "@/lib/auth-client";
import type { ProfileUser } from "@/lib/me/profile-data";

const InitialAccountContext = createContext<ProfileUser | null>(null);

/** The account a server-rendered page was rendered for, null for a visitor without one. */
export function InitialAccountProvider({ user, children }: { user: ProfileUser | null; children: ReactNode }) {
  return <InitialAccountContext value={user}>{children}</InitialAccountContext>;
}

/**
 * The signed-in account: the browser's session once it has loaded, and until then the account the
 * page was server-rendered for, when an InitialAccountProvider above says so.
 */
export function useAccountUser(): ProfileUser | undefined {
  const { data: session, isPending } = authClient.useSession();
  const initial = useContext(InitialAccountContext);
  return isPending ? (initial ?? undefined) : accountUser(session);
}
