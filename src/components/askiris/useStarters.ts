"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { accountUser, authClient } from "@/lib/auth-client";
import { userFavoritesQuery } from "@/lib/me/favorites-client";
import { userGearQuery } from "@/lib/me/gear-client";
import { pickStarters, seededRandom, type Starter, type StarterPools } from "@/lib/askiris/starter-questions";

/**
 * Example questions to start a chat with. `seed` comes from the server where the questions are
 * server-rendered, so hydration draws the same ones; elsewhere each mount draws its own.
 */
export function useStarters({ compact, seed }: { compact: boolean; seed: number | null }): Starter[] {
  const t = useTranslations("AskIris");
  const pools = t.raw("starters") as StarterPools;
  const { data: session } = authClient.useSession();
  const user = accountUser(session);
  const enabled = Boolean(user);
  const { data: gear = [] } = useQuery({ ...userGearQuery(user?.id ?? ""), enabled });
  const { data: favorites = [] } = useQuery({ ...userFavoritesQuery(user?.id ?? ""), enabled });
  const [drawSeed] = useState(() => seed ?? Math.floor(Math.random() * 2 ** 32));
  const hasGear = gear.length > 0;
  const hasFavorites = favorites.length > 0;

  return useMemo(
    () => pickStarters(pools, { hasGear, hasFavorites }, seededRandom(drawSeed), { compact }),
    [pools, hasGear, hasFavorites, drawSeed, compact],
  );
}
