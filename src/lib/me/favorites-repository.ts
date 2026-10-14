import "server-only";

export const MAX_FAVORITES = 500;

export class FavoritesLimitError extends Error {
  constructor() {
    super("favorites_limit_reached");
    this.name = "FavoritesLimitError";
  }
}

export interface FavoriteLens {
  lensId: string;
  createdAt: number;
}

export async function listUserFavorites(db: D1Database, userId: string): Promise<FavoriteLens[]> {
  const { results } = await db
    .prepare("SELECT lens_id, created_at FROM user_favorites WHERE user_id = ? ORDER BY created_at DESC, lens_id")
    .bind(userId)
    .all<{ lens_id: string; created_at: number }>();
  return results.map((row) => ({ lensId: row.lens_id, createdAt: row.created_at }));
}

/** Idempotent: favoriting a lens twice keeps the first timestamp. */
export async function addUserFavorite(
  db: D1Database,
  input: { userId: string; lensId: string; now?: number },
): Promise<void> {
  const existing = await db
    .prepare("SELECT 1 AS found FROM user_favorites WHERE user_id = ? AND lens_id = ?")
    .bind(input.userId, input.lensId)
    .first<{ found: number }>();
  if (existing) {
    return;
  }
  const count = await db
    .prepare("SELECT COUNT(*) AS n FROM user_favorites WHERE user_id = ?")
    .bind(input.userId)
    .first<{ n: number }>();
  if ((count?.n ?? 0) >= MAX_FAVORITES) {
    throw new FavoritesLimitError();
  }
  await db
    .prepare(
      "INSERT INTO user_favorites (user_id, lens_id, created_at) VALUES (?, ?, ?) ON CONFLICT (user_id, lens_id) DO NOTHING",
    )
    .bind(input.userId, input.lensId, input.now ?? Date.now())
    .run();
}

/** Idempotent: removing a lens that is not a favorite is not an error. */
export async function removeUserFavorite(
  db: D1Database,
  input: { userId: string; lensId: string },
): Promise<void> {
  await db
    .prepare("DELETE FROM user_favorites WHERE user_id = ? AND lens_id = ?")
    .bind(input.userId, input.lensId)
    .run();
}
