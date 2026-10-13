import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";

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
  }
}

export async function fetchFixtures(): Promise<Record<string, AskIrisUIMessage[]> | null> {
  try {
    const res = await fetch(API);
    return res.ok ? ((await res.json()) as Record<string, AskIrisUIMessage[]>) : null;
  } catch {
    return null;
  }
}
