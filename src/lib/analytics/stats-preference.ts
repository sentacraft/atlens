import { z } from "zod";

export const statsPreferenceSchema = z.object({ enabled: z.boolean() });

export type StatsPreference = z.infer<typeof statsPreferenceSchema>;
