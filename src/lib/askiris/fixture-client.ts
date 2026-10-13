import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";

// Dev-only: fixtures are JSON files under a gitignored repo dir, served by
// /api/askiris-fixtures. Both calls swallow failures; the fixture store treats disk
// as a convenience mirror.

const API = "/api/askiris-fixtures";

export type FixtureAction =
  | { action: "save"; name: string; messages: AskIrisUIMessage[] }
  | { action: "delete"; name: string }
  | { action: "rename"; from: string; to: string };

export async function writeFixture(body: FixtureAction): Promise<void> {
  try {
    await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // A failed write just leaves disk out of step.
  }
}

/** The saved fixtures, or null when the route is unreachable (dev server restarting). */
export async function fetchFixtures(): Promise<Record<string, AskIrisUIMessage[]> | null> {
  try {
    const res = await fetch(API);
    return res.ok ? ((await res.json()) as Record<string, AskIrisUIMessage[]>) : null;
  } catch {
    return null;
  }
}
