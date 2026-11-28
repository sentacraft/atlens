"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { accountUser, authClient } from "@/lib/auth-client";
import { mergeFavorites, userFavoritesQuery } from "@/lib/me/favorites-client";
import {
  clearLocalFavorites,
  getLocalFavoritesServerSnapshot,
  getLocalFavoritesSnapshot,
  subscribeLocalFavorites,
} from "@/lib/me/local-favorites";

/** Merges any guest local favorites into the signed-in account and clears local storage on success. */
export default function LocalFavoritesSync() {
  const t = useTranslations("LensActions");
  const { data: session, isPending } = authClient.useSession();
  const userId = accountUser(session)?.id;
  const queryClient = useQueryClient();
  const localIds = useSyncExternalStore(
    subscribeLocalFavorites,
    getLocalFavoritesSnapshot,
    getLocalFavoritesServerSnapshot,
  );
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (isPending || !userId || localIds.length === 0 || inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    const snapshot = [...localIds];
    void mergeFavorites(snapshot)
      .then((result) => {
        clearLocalFavorites();
        void queryClient.invalidateQueries({ queryKey: userFavoritesQuery(userId).queryKey });
        if (result.added > 0) {
          toast(t("favoritesSynced", { count: result.added }), { id: "favorites-synced" });
        }
        if (result.skippedLimit > 0) {
          toast.error(t("favoritesLimit"), { id: "favorite-limit" });
        }
      })
      .catch(() => {
        // Keep local favorites intact so a transient network error never drops them.
      })
      .finally(() => {
        inFlightRef.current = false;
      });
  }, [isPending, userId, localIds, queryClient, t]);

  return null;
}
