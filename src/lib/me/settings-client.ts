import { queryOptions } from "@tanstack/react-query";
import type { UserSettings, UserSettingsPatch } from "@/lib/me/settings-schema";

const ENDPOINT = "/api/me/settings";

async function readSettings(response: Response): Promise<UserSettings> {
  if (!response.ok) {
    throw new Error(`settings_${response.status}`);
  }
  const data = (await response.json()) as { settings: UserSettings };
  return data.settings;
}

// Keyed by user: the cache outlives a sign-out.
export function userSettingsQuery(userId: string) {
  return queryOptions({
    queryKey: ["me", "settings", userId],
    queryFn: async () => readSettings(await fetch(ENDPOINT, { cache: "no-store" })),
    staleTime: 5 * 60_000,
  });
}

export async function patchUserSettings(patch: UserSettingsPatch): Promise<UserSettings> {
  return readSettings(
    await fetch(ENDPOINT, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
  );
}
