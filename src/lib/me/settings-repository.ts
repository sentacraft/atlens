import "server-only";

import {
  DEFAULT_USER_SETTINGS,
  type UserSettings,
  type UserSettingsPatch,
} from "@/lib/me/settings-schema";

interface SettingsRow {
  default_mount: UserSettings["defaultMount"];
  locale: UserSettings["locale"];
  revisit_prompt_done: 0 | 1;
}

function toSettings(row: SettingsRow | null): UserSettings {
  return row
    ? { defaultMount: row.default_mount, locale: row.locale, revisitPromptDone: row.revisit_prompt_done === 1 }
    : { ...DEFAULT_USER_SETTINGS };
}

export async function getUserSettings(db: D1Database, userId: string): Promise<UserSettings> {
  const row = await db
    .prepare("SELECT default_mount, locale, revisit_prompt_done FROM user_settings WHERE user_id = ?")
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
      `INSERT INTO user_settings (user_id, default_mount, locale, revisit_prompt_done, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (user_id) DO UPDATE SET
        default_mount = excluded.default_mount,
        locale = excluded.locale,
        revisit_prompt_done = excluded.revisit_prompt_done,
        updated_at = excluded.updated_at`,
    )
    .bind(input.userId, next.defaultMount, next.locale, next.revisitPromptDone ? 1 : 0, input.now ?? Date.now())
    .run();
  return next;
}

/** The language an account saved, looked up by email for mail sent before sign-in. */
export async function getSavedLocaleByEmail(
  db: D1Database,
  email: string,
): Promise<UserSettings["locale"]> {
  const row = await db
    .prepare(
      "SELECT s.locale FROM user u JOIN user_settings s ON s.user_id = u.id WHERE u.email = ? COLLATE NOCASE",
    )
    .bind(email)
    .first<{ locale: UserSettings["locale"] }>();
  return row?.locale ?? null;
}
