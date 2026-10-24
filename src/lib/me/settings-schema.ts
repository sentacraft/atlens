import { z } from "zod";
import { routing, type Locale } from "@/i18n/routing";
import { MOUNTS, type Mount } from "@/lib/types";

export interface UserSettings {
  defaultMount: Mount;
  /** Null until the user picks a language. */
  locale: Locale | null;
  /** When the returning-visit support prompt was last closed or followed, on any device; epoch ms. */
  revisitPromptFinishedAt: number | null;
}

export const DEFAULT_USER_SETTINGS: UserSettings = { defaultMount: "X", locale: null, revisitPromptFinishedAt: null };

export const userSettingsPatchSchema = z
  .strictObject({
    defaultMount: z.enum(MOUNTS).optional(),
    locale: z.enum(routing.locales).nullable().optional(),
    /** Stamps `revisitPromptFinishedAt` with the server's time. */
    revisitPromptFinished: z.literal(true).optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, { message: "empty settings patch" });

export type UserSettingsPatch = z.infer<typeof userSettingsPatchSchema>;
