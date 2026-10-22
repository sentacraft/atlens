import { describe, expect, it } from "vitest";
import {
  claimPrompt,
  finishRevisitPrompt,
  recordVisit,
  revisitPromptDue,
  type PromptStore,
} from "../support-prompts";

function memoryStore(): PromptStore {
  const values = new Map<string, string>();
  return {
    get: (key) => values.get(key) ?? null,
    set: (key, value) => {
      values.set(key, value);
    },
  };
}

const DAY = 86_400_000;
const START = new Date(2026, 9, 1, 12).getTime();

describe("returning-visit prompt", () => {
  it("is due on the third distinct day of visits within 30 days", () => {
    const store = memoryStore();

    recordVisit(store, START);
    recordVisit(store, START + 60_000);
    expect(revisitPromptDue(store, START + 60_000)).toBe(false);

    recordVisit(store, START + 5 * DAY);
    expect(revisitPromptDue(store, START + 5 * DAY)).toBe(false);

    recordVisit(store, START + 12 * DAY);
    expect(revisitPromptDue(store, START + 12 * DAY)).toBe(true);
  });

  it("does not count visits older than 30 days", () => {
    const store = memoryStore();

    recordVisit(store, START);
    recordVisit(store, START + 20 * DAY);
    recordVisit(store, START + 40 * DAY);

    expect(revisitPromptDue(store, START + 40 * DAY)).toBe(false);
  });

  it("never comes back once closed or acted on", () => {
    const store = memoryStore();
    for (const day of [0, 1, 2]) {
      recordVisit(store, START + day * DAY);
    }

    finishRevisitPrompt(store);
    recordVisit(store, START + 3 * DAY);

    expect(revisitPromptDue(store, START + 3 * DAY)).toBe(false);
  });
});

describe("claimed prompts", () => {
  it("lets the poster prompt through at most once every 30 days", () => {
    const store = memoryStore();

    expect(claimPrompt(store, "poster", START)).toBe(true);
    expect(claimPrompt(store, "poster", START + 29 * DAY)).toBe(false);
    expect(claimPrompt(store, "poster", START + 30 * DAY)).toBe(true);
  });

  it("lets the line after a helpful Iris answer through at most once every 7 days, apart from the poster's", () => {
    const store = memoryStore();
    claimPrompt(store, "poster", START);

    expect(claimPrompt(store, "iris_helpful", START)).toBe(true);
    expect(claimPrompt(store, "iris_helpful", START + 6 * DAY)).toBe(false);
    expect(claimPrompt(store, "iris_helpful", START + 7 * DAY)).toBe(true);
  });
});

describe("unavailable storage", () => {
  it("shows no prompt when storage throws", () => {
    const store: PromptStore = {
      get: () => {
        throw new Error("blocked");
      },
      set: () => {
        throw new Error("blocked");
      },
    };

    for (const day of [0, 1, 2]) {
      recordVisit(store, START + day * DAY);
    }

    expect(revisitPromptDue(store, START + 2 * DAY)).toBe(false);
    expect(claimPrompt(store, "poster", START)).toBe(false);
  });
});
