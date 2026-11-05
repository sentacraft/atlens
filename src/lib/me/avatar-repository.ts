import "server-only";

import { avatarImageUrl, type AvatarContentType } from "@/lib/me/avatar";

export interface UserAvatar {
  image: Uint8Array<ArrayBuffer>;
  contentType: AvatarContentType;
}

export async function getUserAvatar(db: D1Database, userId: string): Promise<UserAvatar | null> {
  const row = await db
    .prepare("SELECT image, content_type FROM user_avatars WHERE user_id = ?")
    .bind(userId)
    .first<{ image: ArrayLike<number>; content_type: AvatarContentType }>();
  // D1 reads a BLOB back as a plain array of numbers.
  return row ? { image: Uint8Array.from(row.image), contentType: row.content_type } : null;
}

/** Saves the photo and points the user's image at it; the first upload keeps the image it replaces. */
export async function setUserAvatar(
  db: D1Database,
  input: { userId: string; image: Uint8Array; contentType: AvatarContentType; now?: number },
): Promise<string> {
  const now = input.now ?? Date.now();
  const url = avatarImageUrl(now);
  await db.batch([
    db
      .prepare(
        `INSERT INTO user_avatars (user_id, image, content_type, original_image, updated_at)
         VALUES (?1, ?2, ?3, (SELECT image FROM user WHERE id = ?1), ?4)
         ON CONFLICT (user_id) DO UPDATE SET image = excluded.image, content_type = excluded.content_type, updated_at = excluded.updated_at`,
      )
      .bind(input.userId, input.image, input.contentType, now),
    db.prepare(`UPDATE user SET image = ?, updatedAt = ? WHERE id = ?`).bind(url, now, input.userId),
  ]);
  return url;
}

/** Deletes the photo and puts back the image it replaced; a user without one is left as is. */
export async function removeUserAvatar(db: D1Database, userId: string, now = Date.now()): Promise<void> {
  await db.batch([
    db
      .prepare(
        `UPDATE user SET image = (SELECT original_image FROM user_avatars WHERE user_id = ?1), updatedAt = ?2
         WHERE id = ?1 AND EXISTS (SELECT 1 FROM user_avatars WHERE user_id = ?1)`,
      )
      .bind(userId, now),
    db.prepare("DELETE FROM user_avatars WHERE user_id = ?").bind(userId),
  ]);
}
