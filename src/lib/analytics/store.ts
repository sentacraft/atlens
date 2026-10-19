import "server-only";

import type { ASKIRIS_TURN_EVENT, EventName } from "@/lib/analytics/events";

export interface EventRow {
  event: EventName | typeof ASKIRIS_TURN_EVENT;
  ts: number;
  vid: string | null;
  locale: string | null;
  path: string | null;
  signedIn: boolean;
  internal: boolean;
  props: object;
}

/** Appends one event to the analytics database. */
export async function insertEvent(db: D1Database, row: EventRow): Promise<void> {
  await db
    .prepare(
      "INSERT INTO events (ts, event, vid, locale, path, signed_in, internal, props) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      row.ts,
      row.event,
      row.vid,
      row.locale,
      row.path,
      row.signedIn ? 1 : 0,
      row.internal ? 1 : 0,
      JSON.stringify(row.props),
    )
    .run();
}
