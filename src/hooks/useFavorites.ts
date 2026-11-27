"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { accountUser, authClient } from "@/lib/auth-client";
import {
  addFavorite,
  FavoritesRequestError,
  removeFavorite,
  userFavoritesQuery,
} from "@/lib/me/favorites-client";
import {
  addLocalFavorite,
  getLocalFavoritesServerSnapshot,
  getLocalFavoritesSnapshot,
  removeLocalFavorite,
  subscribeLocalFavorites,
} from "@/lib/me/local-favorites";
import { useRouter } from "@/i18n/navigation";
import { profilePath } from "@/lib/url/routes";

/** Favorite lens ids (newest first) from the account when signed in or localStorage for guests. */
export function useFavorites() {
  const t = useTranslations("LensActions");
  const tProfile = useTranslations("Profile");
  const { data: session } = authClient.useSession();
  const user = accountUser(session);
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = userFavoritesQuery(user?.id ?? "");
  const { data: accountIds = [], isPending } = useQuery({ ...query, enabled: Boolean(user) });
  const localIds = useSyncExternalStore(
    subscribeLocalFavorites,
    getLocalFavoritesSnapshot,
    getLocalFavoritesServerSnapshot,
  );
  const lensIds = user ? accountIds : localIds;
  const ids = useMemo(() => new Set(lensIds), [lensIds]);

  const mutation = useMutation({
    mutationFn: ({ lensId, favorite }: { lensId: string; favorite: boolean }) =>
      favorite ? addFavorite(lensId) : removeFavorite(lensId),
    onMutate: async ({ lensId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: query.queryKey });
      const previous = queryClient.getQueryData<string[]>(query.queryKey);
      queryClient.setQueryData<string[]>(query.queryKey, (list = []) =>
        favorite ? [lensId, ...list.filter((id) => id !== lensId)] : list.filter((id) => id !== lensId),
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(query.queryKey, context?.previous);
      if (error instanceof FavoritesRequestError && error.code === "favorites_limit_reached") {
        toast.error(t("favoritesLimit"), {
          id: "favorite-limit",
          action: { label: t("viewFavorites"), onClick: () => router.push(profilePath("favorites")) },
        });
      } else {
        toast.error(tProfile("saveError"));
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: query.queryKey }),
  });

  function showAddedToast(lensId: string, key: "favoriteAdded" | "favoriteAddedLocal") {
    toast(t(key), {
      id: `favorite-${lensId}`,
      action: { label: t("viewFavorites"), onClick: () => router.push(profilePath("favorites")) },
    });
  }

  function showLimitToast() {
    toast.error(t("favoritesLimit"), {
      id: "favorite-limit",
      action: { label: t("viewFavorites"), onClick: () => router.push(profilePath("favorites")) },
    });
  }

  function toggleGuest(lensId: string) {
    const favorite = !ids.has(lensId);
    if (!favorite) {
      removeLocalFavorite(lensId);
      toast(t("favoriteRemoved"), {
        id: `favorite-${lensId}`,
        action: {
          label: t("undo"),
          onClick: () => {
            const added = addLocalFavorite(lensId);
            if (!added.ok) {
              if (added.reason === "limit") {
                showLimitToast();
              } else {
                toast.error(tProfile("saveError"));
              }
            }
          },
        },
      });
      return;
    }
    const result = addLocalFavorite(lensId);
    if (!result.ok) {
      if (result.reason === "limit") {
        showLimitToast();
      } else {
        toast.error(tProfile("saveError"));
      }
      return;
    }
    showAddedToast(lensId, "favoriteAddedLocal");
  }

  function toggle(lensId: string) {
    if (!user) {
      toggleGuest(lensId);
      return;
    }
    const favorite = !ids.has(lensId);
    mutation.mutate({ lensId, favorite });
    if (favorite) {
      showAddedToast(lensId, "favoriteAdded");
    } else {
      toast(t("favoriteRemoved"), {
        id: `favorite-${lensId}`,
        action: { label: t("undo"), onClick: () => mutation.mutate({ lensId, favorite: true }) },
      });
    }
  }

  return { lensIds, isPending: Boolean(user) && isPending, isFavorite: (lensId: string) => ids.has(lensId), toggle };
}
