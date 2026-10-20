import { queryOptions } from "@tanstack/react-query";
import type { Lens } from "@/lib/types";

export interface LensResponse {
  lens: Lens;
}

/** One lens's catalog record in `locale`, fetched once per lens and kept for the session. */
export function lensQuery(id: string, locale: string) {
  return queryOptions({
    queryKey: ["lens", id, locale],
    queryFn: async (): Promise<Lens> => {
      const response = await fetch(`/api/lenses/${encodeURIComponent(id)}?${new URLSearchParams({ locale })}`);
      if (!response.ok) {
        throw new Error(`lens_${response.status}`);
      }
      return ((await response.json()) as LensResponse).lens;
    },
    staleTime: Infinity,
  });
}
