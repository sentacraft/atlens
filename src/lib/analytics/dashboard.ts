import "server-only";

import type { AnalyticsRange } from "@/lib/url/admin-analytics";

/** A half-open time window in epoch milliseconds. */
export interface TimeWindow {
  from: number;
  to: number;
}

export const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS: Record<Exclude<AnalyticsRange, "all">, number> = { "7d": 7, "30d": 30, "90d": 90 };

// Days are counted in China time, where Atlens is run; the offset has no DST.
const DAY_OFFSET_SECONDS = 8 * 60 * 60;
const DAY_SQL = `date(ts / 1000 + ${DAY_OFFSET_SECONDS}, 'unixepoch')`;

/** The range ending now, and the window of the same length before it (none for "all"). */
export function rangeWindows(range: AnalyticsRange, now: number): { current: TimeWindow; previous: TimeWindow | null } {
  if (range === "all") {
    return { current: { from: 0, to: now }, previous: null };
  }
  const length = RANGE_DAYS[range] * DAY_MS;
  return {
    current: { from: now - length, to: now },
    previous: { from: now - 2 * length, to: now - length },
  };
}

/** When the earliest stored event happened; null for an empty table. */
export async function loadFirstEventTs(db: D1Database): Promise<number | null> {
  const [row] = await rows<{ first: number | null }>(db, "SELECT MIN(ts) AS first FROM events");
  return row?.first ?? null;
}

/**
 * The range's window and the one to compare it with, which is dropped when it starts before the
 * first stored event: a partial period would show a misleading change.
 */
export async function dashboardWindows(
  db: D1Database,
  range: AnalyticsRange,
  now = Date.now(),
): Promise<{ current: TimeWindow; previous: TimeWindow | null }> {
  const { current, previous } = rangeWindows(range, now);
  const first = previous ? await loadFirstEventTs(db) : null;
  return { current, previous: previous && first !== null && previous.from >= first ? previous : null };
}

/** The calendar day (China time) an epoch-millisecond timestamp falls on, as YYYY-MM-DD. */
export function dayOf(ts: number): string {
  return new Date(ts + DAY_OFFSET_SECONDS * 1000).toISOString().slice(0, 10);
}

const IN_WINDOW = "internal = 0 AND ts >= ?1 AND ts < ?2";

async function rows<T>(db: D1Database, sql: string, ...params: (string | number)[]): Promise<T[]> {
  const { results } = await db.prepare(sql).bind(...params).all<T>();
  return results;
}

const n = (value: unknown) => (typeof value === "number" ? value : Number(value ?? 0)) || 0;

export interface Overview {
  visitors: number;
  sessions: number;
  lensViews: number;
  searches: number;
  zeroResultSearches: number;
  purchaseClicks: number;
  irisTurns: number;
}

const EVENT_TOTALS_SQL = `
  SELECT
    SUM(CASE WHEN event = 'lens_view' THEN weight END) AS lens_views,
    SUM(CASE WHEN event = 'search' THEN weight END) AS searches,
    SUM(CASE WHEN event = 'search' AND json_extract(props, '$.results_count') = 0 THEN weight END) AS zero_searches,
    SUM(CASE WHEN event = 'purchase_click' THEN weight END) AS purchase_clicks,
    SUM(CASE WHEN event = 'askiris_turn' THEN weight END) AS iris_turns
  FROM events WHERE ${IN_WINDOW}`;

export async function loadOverview(db: D1Database, window: TimeWindow): Promise<Overview> {
  const [[people], [totals]] = await Promise.all([
    rows<{ visitors: number; sessions: number }>(
      db,
      `SELECT COUNT(DISTINCT vid) AS visitors, COUNT(DISTINCT session_id) AS sessions FROM event_sessions WHERE ${IN_WINDOW}`,
      window.from,
      window.to,
    ),
    rows<Record<string, number | null>>(db, EVENT_TOTALS_SQL, window.from, window.to),
  ]);
  return {
    visitors: n(people?.visitors),
    sessions: n(people?.sessions),
    lensViews: n(totals?.lens_views),
    searches: n(totals?.searches),
    zeroResultSearches: n(totals?.zero_searches),
    purchaseClicks: n(totals?.purchase_clicks),
    irisTurns: n(totals?.iris_turns),
  };
}

export type DailyPoint = { day: string } & Overview;

/** One point per calendar day in the window, days without events included as zeros. */
export async function loadDaily(db: D1Database, window: TimeWindow): Promise<DailyPoint[]> {
  const [people, totals] = await Promise.all([
    rows<{ day: string; visitors: number; sessions: number }>(
      db,
      `SELECT ${DAY_SQL} AS day, COUNT(DISTINCT vid) AS visitors, COUNT(DISTINCT session_id) AS sessions
       FROM event_sessions WHERE ${IN_WINDOW} GROUP BY day`,
      window.from,
      window.to,
    ),
    rows<Record<string, number | string | null>>(
      db,
      EVENT_TOTALS_SQL.replace("SELECT", `SELECT ${DAY_SQL} AS day,`) + " GROUP BY day",
      window.from,
      window.to,
    ),
  ]);
  const byDay = new Map<string, DailyPoint>();
  const point = (day: string) => {
    let existing = byDay.get(day);
    if (!existing) {
      existing = { day, visitors: 0, sessions: 0, lensViews: 0, searches: 0, zeroResultSearches: 0, purchaseClicks: 0, irisTurns: 0 };
      byDay.set(day, existing);
    }
    return existing;
  };
  for (const row of people) {
    Object.assign(point(row.day), { visitors: n(row.visitors), sessions: n(row.sessions) });
  }
  for (const row of totals) {
    Object.assign(point(String(row.day)), {
      lensViews: n(row.lens_views),
      searches: n(row.searches),
      zeroResultSearches: n(row.zero_searches),
      purchaseClicks: n(row.purchase_clicks),
      irisTurns: n(row.iris_turns),
    });
  }
  if (byDay.size === 0) {
    return [];
  }
  const days = [...byDay.keys()].sort();
  const first = window.from > 0 ? dayOf(window.from) : days[0];
  const last = dayOf(window.to - 1);
  const filled: DailyPoint[] = [];
  for (let ts = Date.parse(`${first}T00:00:00Z`); ; ts += DAY_MS) {
    const day = new Date(ts).toISOString().slice(0, 10);
    filled.push(point(day));
    if (day >= last) {
      break;
    }
  }
  return filled;
}

export interface FunnelStep {
  key: "sessions" | "explored" | "viewed" | "compared" | "toStore";
  sessions: number;
}

/** Sessions that reached each step, in any order within the session. */
export async function loadFunnel(db: D1Database, window: TimeWindow): Promise<FunnelStep[]> {
  const [row] = await rows<Record<string, number>>(
    db,
    `SELECT
       COUNT(*) AS sessions,
       SUM(explored) AS explored,
       SUM(viewed) AS viewed,
       SUM(compared) AS compared,
       SUM(to_store) AS to_store
     FROM (
       SELECT
         session_id,
         MAX(event IN ('search', 'filter_apply')) AS explored,
         MAX(event = 'lens_view') AS viewed,
         MAX(event = 'compare_view') AS compared,
         MAX(event = 'purchase_click') AS to_store
       FROM event_sessions WHERE ${IN_WINDOW}
       GROUP BY session_id
     )`,
    window.from,
    window.to,
  );
  return [
    { key: "sessions", sessions: n(row?.sessions) },
    { key: "explored", sessions: n(row?.explored) },
    { key: "viewed", sessions: n(row?.viewed) },
    { key: "compared", sessions: n(row?.compared) },
    { key: "toStore", sessions: n(row?.to_store) },
  ];
}

/** "path" or "locale" read the column; anything else reads that prop. */
type GroupKey = string;

const KEY_PATTERN = /^[a-z_]+$/;

function keySql(key: GroupKey): string {
  if (!KEY_PATTERN.test(key)) {
    throw new Error(`invalid group key: ${key}`);
  }
  return key === "path" || key === "locale" ? key : `json_extract(props, '$.${key}')`;
}

/** Weighted counts of one event (or of all events, for null) grouped by the given keys, most frequent first. */
export async function countBy(
  db: D1Database,
  window: TimeWindow,
  event: string | null,
  keys: GroupKey[],
  options: { limit?: number; where?: Record<string, string | number> } = {},
): Promise<Array<Record<string, string | number | null> & { n: number }>> {
  const params: (string | number)[] = [window.from, window.to];
  const conditions: string[] = [];
  if (event !== null) {
    params.push(event);
    conditions.push(`event = ?${params.length}`);
  }
  for (const [key, value] of Object.entries(options.where ?? {})) {
    params.push(value);
    conditions.push(`${keySql(key)} = ?${params.length}`);
  }
  const selects = keys.map((key) => `${keySql(key)} AS ${key}, `).join("");
  const sql = `
    SELECT ${selects}SUM(weight) AS n
    FROM events
    WHERE ${IN_WINDOW} ${conditions.map((c) => `AND ${c}`).join(" ")}
    ${keys.length > 0 ? `GROUP BY ${keys.join(", ")}` : ""}
    ORDER BY n DESC
    LIMIT ${options.limit ?? 20}`;
  return rows(db, sql, ...params);
}

export interface IrisSummary {
  turns: number;
  conversations: number;
  totalTokens: number;
  inputTokens: number;
  cacheReadTokens: number;
  steps: number;
  budgetHits: number;
  viewers: number;
  askers: number;
  recClicks: number;
  contextP50: number | null;
  contextP75: number | null;
  contextMax: number | null;
  stepsHistogram: Array<{ steps: number; turns: number }>;
  byMount: Array<{ mount: string; turns: number; tokens: number }>;
}

function quantile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) {
    return null;
  }
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

const TURN = (field: string) => `json_extract(props, '$.${field}')`;

export async function loadIris(db: D1Database, window: TimeWindow): Promise<IrisSummary> {
  const turnWhere = `${IN_WINDOW} AND event = 'askiris_turn'`;
  const [[totals], [people], perConversation, histogram, byMount] = await Promise.all([
    rows<Record<string, number>>(
      db,
      `SELECT
         SUM(weight) AS turns,
         COUNT(DISTINCT ${TURN("conversation_id")}) AS conversations,
         SUM(weight * ${TURN("total_tokens")}) AS total_tokens,
         SUM(weight * ${TURN("input_tokens")}) AS input_tokens,
         SUM(weight * ${TURN("cache_read_tokens")}) AS cache_read_tokens,
         SUM(weight * ${TURN("step_count")}) AS steps,
         SUM(CASE WHEN ${TURN("budget_hit")} THEN weight END) AS budget_hits
       FROM events WHERE ${turnWhere}`,
      window.from,
      window.to,
    ),
    rows<Record<string, number>>(
      db,
      `SELECT
         COUNT(DISTINCT CASE WHEN event = 'askiris_view' THEN vid END) AS viewers,
         COUNT(DISTINCT CASE WHEN event = 'askiris_turn' THEN vid END) AS askers,
         SUM(CASE WHEN event = 'askiris_rec_click' THEN weight END) AS rec_clicks
       FROM events WHERE ${IN_WINDOW}`,
      window.from,
      window.to,
    ),
    rows<{ context: number }>(
      db,
      `SELECT MAX(${TURN("max_context_tokens")}) AS context
       FROM events WHERE ${turnWhere} AND ${TURN("max_context_tokens")} > 0
       GROUP BY ${TURN("conversation_id")}
       ORDER BY context`,
      window.from,
      window.to,
    ),
    rows<{ steps: number; turns: number }>(
      db,
      `SELECT ${TURN("step_count")} AS steps, SUM(weight) AS turns
       FROM events WHERE ${turnWhere} GROUP BY steps ORDER BY steps`,
      window.from,
      window.to,
    ),
    rows<{ mount: string; turns: number; tokens: number }>(
      db,
      `SELECT ${TURN("mount")} AS mount, SUM(weight) AS turns, SUM(weight * ${TURN("total_tokens")}) AS tokens
       FROM events WHERE ${turnWhere} GROUP BY mount ORDER BY turns DESC`,
      window.from,
      window.to,
    ),
  ]);
  const contexts = perConversation.map((row) => n(row.context));
  return {
    turns: n(totals?.turns),
    conversations: n(totals?.conversations),
    totalTokens: n(totals?.total_tokens),
    inputTokens: n(totals?.input_tokens),
    cacheReadTokens: n(totals?.cache_read_tokens),
    steps: n(totals?.steps),
    budgetHits: n(totals?.budget_hits),
    viewers: n(people?.viewers),
    askers: n(people?.askers),
    recClicks: n(people?.rec_clicks),
    contextP50: quantile(contexts, 0.5),
    contextP75: quantile(contexts, 0.75),
    contextMax: contexts.length > 0 ? contexts[contexts.length - 1] : null,
    stepsHistogram: histogram.map((row) => ({ steps: n(row.steps), turns: n(row.turns) })),
    byMount: byMount.map((row) => ({ mount: String(row.mount ?? ""), turns: n(row.turns), tokens: n(row.tokens) })),
  };
}

/** Ratings on Iris replies, from the traces database. */
export async function loadIrisFeedback(db: D1Database, window: TimeWindow): Promise<{ helpful: number; unhelpful: number }> {
  const [row] = await rows<Record<string, number>>(
    db,
    `SELECT
       SUM(rating = 'helpful') AS helpful,
       SUM(rating = 'unhelpful') AS unhelpful
     FROM askiris_response_feedback WHERE created_at >= ?1 AND created_at < ?2`,
    window.from,
    window.to,
  );
  return { helpful: n(row?.helpful), unhelpful: n(row?.unhelpful) };
}

export interface AccountActivity {
  newAccounts: number;
  totalAccounts: number;
  favoritesAdded: number;
  gearAdded: number;
}

/** Account sign-ups and saves, from the app database; guest users are not accounts. */
export async function loadAccounts(db: D1Database, window: TimeWindow): Promise<AccountActivity> {
  // Better Auth stores user.createdAt as ISO text; the app's own tables store epoch milliseconds.
  const fromIso = new Date(window.from).toISOString();
  const toIso = new Date(window.to).toISOString();
  const [[users], [saves]] = await Promise.all([
    rows<Record<string, number>>(
      db,
      `SELECT
         SUM(createdAt >= ?1 AND createdAt < ?2) AS new_accounts,
         COUNT(*) AS total_accounts
       FROM user WHERE COALESCE(isAnonymous, 0) = 0`,
      fromIso,
      toIso,
    ),
    rows<Record<string, number>>(
      db,
      `SELECT
         (SELECT COUNT(*) FROM user_favorites WHERE created_at >= ?1 AND created_at < ?2) AS favorites,
         (SELECT COUNT(*) FROM user_gear WHERE created_at >= ?1 AND created_at < ?2) AS gear`,
      window.from,
      window.to,
    ),
  ]);
  return {
    newAccounts: n(users?.new_accounts),
    totalAccounts: n(users?.total_accounts),
    favoritesAdded: n(saves?.favorites),
    gearAdded: n(saves?.gear),
  };
}

/** Share of sessions with a signed-in event; imported history has no sign-in data, so live rows only. */
export async function loadSignedInShare(db: D1Database, window: TimeWindow): Promise<{ sessions: number; signedIn: number }> {
  const [row] = await rows<Record<string, number>>(
    db,
    `SELECT COUNT(*) AS sessions, SUM(signed_in) AS signed_in FROM (
       SELECT session_id, MAX(signed_in) AS signed_in
       FROM event_sessions WHERE ${IN_WINDOW} AND origin = 'live'
       GROUP BY session_id
     )`,
    window.from,
    window.to,
  );
  return { sessions: n(row?.sessions), signedIn: n(row?.signed_in) };
}
