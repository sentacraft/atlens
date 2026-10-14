import "server-only";

import {
  DEFAULT_USER_SETTINGS,
  type UserSettings,
  type UserSettingsPatch,
} from "@/lib/me/settings-schema";

interface SettingsRow {
  default_mount: UserSettings["defaultMount"];
  locale: UserSettings["locale"];
}

function toSettings(row: SettingsRow | null): UserSettings {
  return row ? { defaultMount: row.default_mount, locale: row.locale } : { ...DEFAULT_USER_SETTINGS };
}

export async function getUserSettings(db: D1Database, userId: string): Promise<UserSettings> {
  const row = await db
    .prepare("SELECT default_mount, locale FROM user_settings WHERE user_id = ?")
    .bind(userId)
    .first<SettingsRow>();
  return toSettings(row);
}

export async function updateUserSettings(
  db: D1Database,
  input: { userId: string; patch: UserSettingsPatch; now?: number },
): Promise<UserSettings> {
  const next = { ...(await getUserSettings(db, input.userId)), ...input.patch };
  await db
    .prepare(
      `INSERT INTO user_settings (user_id, default_mount, locale, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT (user_id) DO UPDATE SET
        default_mount = excluded.default_mount,
        locale = excluded.locale,
        updated_at = excluded.updated_at`,
    )
    .bind(input.userId, next.defaultMount, next.locale, input.now ?? Date.now())
    .run();
  return next;
}
