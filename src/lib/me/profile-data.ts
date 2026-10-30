import "server-only";

import { dehydrate, QueryClient, type DehydratedState } from "@tanstack/react-query";
import { createAuth } from "@/lib/auth";
import { linkedProvidersQuery } from "@/lib/me/account-client";
import { userFavoritesQuery } from "@/lib/me/favorites-client";
import { listUserFavorites } from "@/lib/me/favorites-repository";
import { userGearQuery } from "@/lib/me/gear-client";
import { listUserGear } from "@/lib/me/gear-repository";
import { userSettingsQuery } from "@/lib/me/settings-client";
import { getUserSettings } from "@/lib/me/settings-repository";

export interface ProfileUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

/**
 * The signed-in account and its profile data, as React Query state the profile's client queries
 * pick up on hydration; null for a visitor without an account.
 */
export async function loadProfile(
  headers: Headers,
  db: D1Database,
): Promise<{ user: ProfileUser; state: DehydratedState } | null> {
  const auth = createAuth();
  const session = await auth.api.getSession({ headers });
  if (!session?.user || session.user.isAnonymous) {
    return null;
  }
  const { id, name, email, image } = session.user;
  const [gear, favorites, settings, accounts] = await Promise.all([
    listUserGear(db, id),
    listUserFavorites(db, id),
    getUserSettings(db, id),
    auth.api.listUserAccounts({ headers }),
  ]);

  const client = new QueryClient();
  client.setQueryData(userGearQuery(id).queryKey, gear);
  client.setQueryData(userFavoritesQuery(id).queryKey, favorites.map((favorite) => favorite.lensId));
  client.setQueryData(userSettingsQuery(id).queryKey, settings);
  client.setQueryData(linkedProvidersQuery(id).queryKey, accounts.map((account) => account.providerId));
  return { user: { id, name, email, image }, state: dehydrate(client) };
}
