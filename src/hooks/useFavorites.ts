"use client";

import { useMemo } from "react";
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
import { useRouter } from "@/i18n/navigation";
import { useSignInDialog } from "@/context/SignInDialogProvider";
import { profilePath } from "@/lib/url/routes";

/** The signed-in user's favorite lens ids, newest first, and a toggle that asks guests to sign in. */
export function useFavorites() {
  const t = useTranslations("LensActions");
  const tProfile = useTranslations("Profile");
  const { data: session } = authClient.useSession();
  const user = accountUser(session);
  const openSignIn = useSignInDialog();
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = userFavoritesQuery(user?.id ?? "");
  const { data: lensIds = [] } = useQuery({ ...query, enabled: Boolean(user) });
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
      toast.error(
        error instanceof FavoritesRequestError && error.code === "favorites_limit_reached"
          ? t("favoritesLimit")
          : tProfile("saveError"),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: query.queryKey }),
  });

  function toggle(lensId: string) {
    if (!user) {
      openSignIn("favorite");
      return;
    }
    const favorite = !ids.has(lensId);
    mutation.mutate({ lensId, favorite });
    const id = `favorite-${lensId}`;
    if (favorite) {
      toast(t("favoriteAdded"), {
        id,
        action: { label: t("viewFavorites"), onClick: () => router.push(profilePath("favorites")) },
      });
    } else {
      toast(t("favoriteRemoved"), {
        id,
        action: { label: t("undo"), onClick: () => mutation.mutate({ lensId, favorite: true }) },
      });
    }
  }

  return { lensIds, isFavorite: (lensId: string) => ids.has(lensId), toggle };
}
