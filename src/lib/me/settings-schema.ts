import { z } from "zod";
import { routing, type Locale } from "@/i18n/routing";
import { MOUNTS, type Mount } from "@/lib/types";

export interface UserSettings {
  defaultMount: Mount;
  /** Null until the user picks a language. */
  locale: Locale | null;
  /** When a support prompt was last responded to (closed or followed), on any device; epoch ms. */
  supportPromptRespondedAt: number | null;
}

export const DEFAULT_USER_SETTINGS: UserSettings = { defaultMount: "X", locale: null, supportPromptRespondedAt: null };

export const userSettingsPatchSchema = z
  .strictObject({
    defaultMount: z.enum(MOUNTS).optional(),
    locale: z.enum(routing.locales).nullable().optional(),
    /** Stamps `supportPromptRespondedAt` with the server's time. */
    supportPromptResponded: z.literal(true).optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, { message: "empty settings patch" });

export type UserSettingsPatch = z.infer<typeof userSettingsPatchSchema>;
