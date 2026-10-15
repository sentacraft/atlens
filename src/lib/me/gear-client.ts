import { queryOptions } from "@tanstack/react-query";
import type { GearInput, GearItem } from "@/lib/me/gear-schema";

const ENDPOINT = "/api/me/gear";

export class GearRequestError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "GearRequestError";
  }
}

async function errorCode(response: Response): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? `gear_${response.status}`;
}

// Keyed by user: the cache outlives a sign-out.
export function userGearQuery(userId: string) {
  return queryOptions({
    queryKey: ["me", "gear", userId],
    queryFn: async () => {
      const response = await fetch(ENDPOINT, { cache: "no-store" });
      if (!response.ok) {
        throw new GearRequestError(await errorCode(response));
      }
      return ((await response.json()) as { gear: GearItem[] }).gear;
    },
  });
}

export async function addGear(input: GearInput): Promise<GearItem> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new GearRequestError(await errorCode(response));
  }
  return ((await response.json()) as { gear: GearItem }).gear;
}

export async function removeGear(gearId: string): Promise<void> {
  const response = await fetch(`${ENDPOINT}/${encodeURIComponent(gearId)}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new GearRequestError(await errorCode(response));
  }
}
