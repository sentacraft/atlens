/** Where the prompts keep what they have shown; localStorage in the browser. */
export interface PromptStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

const REVISIT_DISTINCT_DAYS = 3;
const REVISIT_WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;

const VISIT_DAYS_KEY = "atlens_visit_days";
const REVISIT_DONE_KEY = "atlens_support_revisit_done";

/** Prompts that show at most once per interval, and how many days that interval is. */
const CLAIMED_PROMPTS = {
  poster: { key: "atlens_support_poster_at", days: 30 },
  iris_helpful: { key: "atlens_support_iris_helpful_at", days: 7 },
} as const;

export type ClaimedPrompt = keyof typeof CLAIMED_PROMPTS;

export function browserPromptStore(): PromptStore {
  return {
    get: (key) => window.localStorage.getItem(key),
    set: (key, value) => window.localStorage.setItem(key, value),
  };
}

// Private windows and blocked site data throw on access; a prompt then simply never shows.
function read(store: PromptStore, key: string): string | null | undefined {
  try {
    return store.get(key);
  } catch {
    return undefined;
  }
}

function write(store: PromptStore, key: string, value: string): boolean {
  try {
    store.set(key, value);
    return true;
  } catch {
    return false;
  }
}

/** The visitor's local calendar day, as epoch ms of its midnight. */
function localDay(now: number): number {
  const date = new Date(now);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function visitDays(store: PromptStore, now: number): number[] {
  const raw = read(store, VISIT_DAYS_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const since = localDay(now) - (REVISIT_WINDOW_DAYS - 1) * DAY_MS;
    return Array.isArray(parsed) ? parsed.filter((day): day is number => typeof day === "number" && day >= since) : [];
  } catch {
    return [];
  }
}

export function recordVisit(store: PromptStore, now = Date.now()): void {
  const days = visitDays(store, now);
  const today = localDay(now);
  if (!days.includes(today)) {
    write(store, VISIT_DAYS_KEY, JSON.stringify([...days, today]));
  }
}

export function revisitPromptDue(store: PromptStore, now = Date.now()): boolean {
  const done = read(store, REVISIT_DONE_KEY);
  return done === null && visitDays(store, now).length >= REVISIT_DISTINCT_DAYS;
}

// Holds when the prompt was finished, in epoch ms; "1" from before it kept the time means the same.
export function revisitPromptDone(store: PromptStore): boolean {
  const done = read(store, REVISIT_DONE_KEY);
  return done !== null && done !== undefined;
}

/** The visitor closed the returning-visit prompt or followed it; it does not show again. */
export function finishRevisitPrompt(store: PromptStore, now = Date.now()): void {
  write(store, REVISIT_DONE_KEY, String(now));
}

/** Whether `prompt` may show now; claiming it starts its interval. */
export function claimPrompt(store: PromptStore, prompt: ClaimedPrompt, now = Date.now()): boolean {
  const { key, days } = CLAIMED_PROMPTS[prompt];
  const last = read(store, key);
  if (last === undefined || (last !== null && now - Number(last) < days * DAY_MS)) {
    return false;
  }
  return write(store, key, String(now));
}
