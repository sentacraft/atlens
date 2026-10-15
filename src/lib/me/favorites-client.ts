import { queryOptions } from "@tanstack/react-query";

const ENDPOINT = "/api/me/favorites";

export class FavoritesRequestError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "FavoritesRequestError";
  }
}

async function errorCode(response: Response): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? `favorites_${response.status}`;
}

// Keyed by user: the cache outlives a sign-out.
export function userFavoritesQuery(userId: string) {
  return queryOptions({
    queryKey: ["me", "favorites", userId],
    queryFn: async () => {
      const response = await fetch(ENDPOINT, { cache: "no-store" });
      if (!response.ok) {
        throw new FavoritesRequestError(await errorCode(response));
      }
      const { favorites } = (await response.json()) as { favorites: { lensId: string }[] };
      return favorites.map((favorite) => favorite.lensId);
    },
  });
}

export async function addFavorite(lensId: string): Promise<void> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lensId }),
  });
  if (!response.ok) {
    throw new FavoritesRequestError(await errorCode(response));
  }
}

export async function removeFavorite(lensId: string): Promise<void> {
  const response = await fetch(`${ENDPOINT}/${encodeURIComponent(lensId)}`, { method: "DELETE" });
  if (!response.ok) {
    throw new FavoritesRequestError(await errorCode(response));
  }
}
