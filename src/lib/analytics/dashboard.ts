import "server-only";

import { buildBreakdown, type BreakdownNode, type FunnelStep, type LabelFor } from "@/lib/analytics/breakdown";
import { ASKIRIS_TURN_EVENT, EVENT_DOCS, valueLabel } from "@/lib/analytics/events";
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

/** When the earliest stored event (of one kind, if given) happened; null when there is none. */
export async function loadFirstEventTs(db: D1Database, event?: string): Promise<number | null> {
  const [row] = event
    ? await rows<{ first: number | null }>(db, "SELECT MIN(ts) AS first FROM events WHERE event = ?1", event)
    : await rows<{ first: number | null }>(db, "SELECT MIN(ts) AS first FROM events");
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

/** Sessions that reached each step, in any order within the session; steps are not subsets of each other. */
export async function loadSessionFunnel(db: D1Database, window: TimeWindow): Promise<FunnelStep[]> {
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
    { label: "All sessions", count: n(row?.sessions), breakdown: [] },
    { label: "Searched or filtered", count: n(row?.explored), breakdown: [] },
    { label: "Viewed a lens", count: n(row?.viewed), breakdown: [] },
    { label: "Opened a comparison", count: n(row?.compared), breakdown: [] },
    { label: "Clicked through to a store", count: n(row?.to_store), breakdown: [] },
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

// Breakdowns sum every row into their groups, so they read all of them; they suit props with a
// handful of values, never free text such as queries or paths.
const BREAKDOWN_ROW_LIMIT = 1000;

const NOT_RECORDED = "Not recorded";

type DocumentedEvent = keyof typeof EVENT_DOCS;

/** Labels a documented event's values, with names for missing values per level. */
export function eventLabels(event: DocumentedEvent, missing: Record<string, string> = {}): LabelFor {
  return (level, value) => (value === null ? (missing[level] ?? NOT_RECORDED) : valueLabel(event, level, value));
}

/** Weighted counts of one event split by `levels`, nested in that order. */
export async function loadBreakdown(
  db: D1Database,
  window: TimeWindow,
  event: DocumentedEvent,
  levels: string[],
  labelFor: LabelFor = eventLabels(event),
): Promise<BreakdownNode[]> {
  const counted = await countBy(db, window, event, levels, { limit: BREAKDOWN_ROW_LIMIT });
  return buildBreakdown(counted, levels, labelFor);
}

const EVENT_PATTERN = /^[a-z_]+$/;

function eventList(events: string[]): string {
  for (const event of events) {
    if (!EVENT_PATTERN.test(event)) {
      throw new Error(`invalid event name: ${event}`);
    }
  }
  return events.map((event) => `'${event}'`).join(", ");
}

export interface VisitorStep {
  label: string;
  /** Events any one of which puts a visitor in this step; null for every visitor. */
  events: string[] | null;
  /** Splits the step by the props of each member's first such event in the window. */
  split?: { event: DocumentedEvent; levels: string[]; missing?: Record<string, string> };
}

/**
 * Unique visitors in each step, where a step keeps only the visitors of every step before it, so
 * each step is a subset of the one above.
 */
export async function loadVisitorFunnel(db: D1Database, window: TimeWindow, steps: VisitorStep[]): Promise<FunnelStep[]> {
  const flags = steps.map((step, i) => (step.events ? `MAX(event IN (${eventList(step.events)})) AS s${i}` : `1 AS s${i}`));
  const reached = (i: number) => steps.slice(0, i + 1).map((_, j) => `s${j}`).join(" AND ");
  const visitors = `
    WITH v AS (
      SELECT vid, ${flags.join(", ")}
      FROM events WHERE ${IN_WINDOW} AND vid IS NOT NULL
      GROUP BY vid
    )`;
  const [counts] = await rows<Record<string, number | null>>(
    db,
    `${visitors} SELECT ${steps.map((_, i) => `SUM(${reached(i)}) AS c${i}`).join(", ")} FROM v`,
    window.from,
    window.to,
  );
  return Promise.all(
    steps.map(async (step, i) => {
      const count = n(counts?.[`c${i}`]);
      if (!step.split || count === 0) {
        return { label: step.label, count, breakdown: [] };
      }
      const { event, levels, missing } = step.split;
      const firsts = await rows<Record<string, unknown> & { n: number }>(
        db,
        `${visitors}
         SELECT ${levels.map((level) => `${keySql(level)} AS ${level}`).join(", ")}, COUNT(*) AS n
         FROM (
           SELECT *, ROW_NUMBER() OVER (PARTITION BY vid ORDER BY ts, id) AS rn
           FROM events
           WHERE ${IN_WINDOW} AND event = ?3 AND vid IN (SELECT vid FROM v WHERE ${reached(i)})
         )
         WHERE rn = 1
         GROUP BY ${levels.join(", ")}`,
        window.from,
        window.to,
        event,
      );
      return { label: step.label, count, breakdown: buildBreakdown(firsts, levels, eventLabels(event, missing), count) };
    }),
  );
}

/** Visitors from arriving to clicking a lens Iris recommended. */
export function loadIrisFunnel(db: D1Database, window: TimeWindow): Promise<FunnelStep[]> {
  return loadVisitorFunnel(db, window, [
    { label: "All visitors", events: null },
    {
      label: "Opened Iris",
      events: ["askiris_view"],
      split: { event: "askiris_open", levels: ["entry", "pool"], missing: { entry: "Ask Iris page directly", pool: "Typed a question" } },
    },
    { label: "Asked a question", events: [ASKIRIS_TURN_EVENT], split: { event: "askiris_message", levels: ["method", "pool"] } },
    { label: "Clicked a recommendation", events: ["askiris_rec_click"], split: { event: "askiris_rec_click", levels: ["source"] } },
  ]);
}

/** Visitors who opened the sign-in dialog, then sent it. */
export function loadSignInFunnel(db: D1Database, window: TimeWindow): Promise<FunnelStep[]> {
  return loadVisitorFunnel(db, window, [
    { label: "Opened sign-in", events: ["sign_in_open"], split: { event: "sign_in_open", levels: ["reason"] } },
    { label: "Sent sign-in", events: ["sign_in_submit"], split: { event: "sign_in_submit", levels: ["method"] } },
  ]);
}

/** Searches, those with results, and the results picked, by the position picked. */
export async function loadSearchFunnel(db: D1Database, window: TimeWindow): Promise<FunnelStep[]> {
  const [[totals], ranks] = await Promise.all([
    rows<Record<string, number | null>>(
      db,
      `SELECT
         SUM(CASE WHEN event = 'search' THEN weight END) AS searches,
         SUM(CASE WHEN event = 'search' AND json_extract(props, '$.results_count') > 0 THEN weight END) AS with_results,
         SUM(CASE WHEN event = 'search_select' THEN weight END) AS picks
       FROM events WHERE ${IN_WINDOW} AND event IN ('search', 'search_select')`,
      window.from,
      window.to,
    ),
    countBy(db, window, "search_select", ["rank"], { limit: BREAKDOWN_ROW_LIMIT }),
  ]);
  const position = (value: string | null) => (value === null ? NOT_RECORDED : `Position ${value}`);
  return [
    { label: "Searches", count: n(totals?.searches), breakdown: [] },
    { label: "Returned results", count: n(totals?.with_results), breakdown: [] },
    {
      label: "A result was picked",
      count: n(totals?.picks),
      breakdown: buildBreakdown(ranks, ["rank"], (_, value) => position(value)).sort(
        (a, b) => Number(a.value ?? Infinity) - Number(b.value ?? Infinity),
      ),
    },
  ];
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

export interface ConversationsPerVisitor {
  /** Visitors with at least one answered turn. */
  askers: number;
  /** Their conversations, counted per visitor. */
  conversations: number;
  /** Askers who had a second conversation. */
  returning: number;
  /** Askers by how many conversations they had: 1, 2, 3, 4 or more. */
  distribution: BreakdownNode[];
}

const CONVERSATION_BUCKETS = ["1", "2", "3", "4+"];

/** How many conversations each visitor who asked Iris something had in the window. */
export async function loadConversationsPerVisitor(db: D1Database, window: TimeWindow): Promise<ConversationsPerVisitor> {
  const counted = await rows<{ bucket: string; n: number; conversations: number }>(
    db,
    `SELECT CASE WHEN c >= 4 THEN '4+' ELSE CAST(c AS TEXT) END AS bucket, COUNT(*) AS n, SUM(c) AS conversations
     FROM (
       SELECT vid, COUNT(DISTINCT ${TURN("conversation_id")}) AS c
       FROM events WHERE ${IN_WINDOW} AND event = '${ASKIRIS_TURN_EVENT}' AND vid IS NOT NULL
       GROUP BY vid
     )
     GROUP BY bucket`,
    window.from,
    window.to,
  );
  const askers = counted.reduce((sum, row) => sum + n(row.n), 0);
  const label = (bucket: string | null) => (bucket === "1" ? "1 conversation" : bucket === "4+" ? "4 or more" : `${bucket} conversations`);
  return {
    askers,
    conversations: counted.reduce((sum, row) => sum + n(row.conversations), 0),
    returning: counted.filter((row) => row.bucket !== "1").reduce((sum, row) => sum + n(row.n), 0),
    distribution: buildBreakdown(counted, ["bucket"], (_, value) => label(value)).sort(
      (a, b) => CONVERSATION_BUCKETS.indexOf(a.value ?? "") - CONVERSATION_BUCKETS.indexOf(b.value ?? ""),
    ),
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
  /** Accounts created in the window, by how they were created. */
  newBySignUp: BreakdownNode[];
  /** Every account, by how it was created. */
  allBySignUp: BreakdownNode[];
  favoritesAdded: number;
  gearAdded: number;
}

// Better Auth stores its timestamps as ISO text; integers are epoch milliseconds.
const epochSeconds = (column: string) =>
  `(CASE typeof(${column}) WHEN 'integer' THEN ${column} / 1000.0 ELSE (julianday(${column}) - 2440587.5) * 86400 END)`;

// A Google sign-up writes the user and its Google account in one request; a Google account
// added later, by signing in with Google to an email-code account, comes long after.
const SAME_SIGN_UP_SECONDS = 60;

const SIGN_UP_LABELS: LabelFor = (level, value) =>
  level === "sign_up"
    ? value === "google"
      ? "Google"
      : "Email code"
    : value === "linked"
      ? "Later linked Google"
      : "Email only";

/** Account sign-ups and saves, from the app database; guest users are not accounts. */
export async function loadAccounts(db: D1Database, window: TimeWindow): Promise<AccountActivity> {
  const fromIso = new Date(window.from).toISOString();
  const toIso = new Date(window.to).toISOString();
  const userCreated = epochSeconds("u.createdAt");
  const [users, [saves]] = await Promise.all([
    rows<{ sign_up: string; later: string | null; new_accounts: number; accounts: number }>(
      db,
      `SELECT
         CASE WHEN g.first - ${userCreated} <= ${SAME_SIGN_UP_SECONDS} THEN 'google' ELSE 'email' END AS sign_up,
         CASE WHEN g.first - ${userCreated} > ${SAME_SIGN_UP_SECONDS} THEN 'linked' END AS later,
         SUM(u.createdAt >= ?1 AND u.createdAt < ?2) AS new_accounts,
         COUNT(*) AS accounts
       FROM user u
       LEFT JOIN (
         SELECT userId, MIN(${epochSeconds("createdAt")}) AS first FROM account WHERE providerId = 'google' GROUP BY userId
       ) g ON g.userId = u.id
       WHERE COALESCE(u.isAnonymous, 0) = 0
       GROUP BY sign_up, later`,
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
  const levels = ["sign_up", "later"];
  return {
    newBySignUp: buildBreakdown(
      users.map((row) => ({ ...row, n: n(row.new_accounts) })).filter((row) => row.n > 0),
      levels,
      SIGN_UP_LABELS,
    ),
    allBySignUp: buildBreakdown(users.map((row) => ({ ...row, n: n(row.accounts) })), levels, SIGN_UP_LABELS),
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

const LOCALE_LABELS: Record<string, string> = { en: "English", zh: "Chinese" };

/** Events of every kind by the language of the page they came from. */
export async function loadLocales(db: D1Database, window: TimeWindow): Promise<BreakdownNode[]> {
  const counted = await countBy(db, window, null, ["locale"], { limit: BREAKDOWN_ROW_LIMIT });
  return buildBreakdown(counted, ["locale"], (_, value) => (value === null ? NOT_RECORDED : (LOCALE_LABELS[value] ?? value)));
}
