import { z } from "zod";

export const MAX_FAVORITES = 500;

export const favoriteInputSchema = z.strictObject({
  lensId: z.string().trim().min(1).max(200),
});

export const mergeFavoritesInputSchema = z.strictObject({
  lensIds: z.array(z.string().trim().min(1).max(200)).max(MAX_FAVORITES),
});

export interface MergeFavoritesResult {
  added: number;
  skippedLimit: number;
}
