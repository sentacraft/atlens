import { describe, expect, it } from "vitest";
import {
  claimPosterPrompt,
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

describe("poster prompt", () => {
  it("is claimed at most once every 30 days", () => {
    const store = memoryStore();

    expect(claimPosterPrompt(store, START)).toBe(true);
    expect(claimPosterPrompt(store, START + 29 * DAY)).toBe(false);
    expect(claimPosterPrompt(store, START + 30 * DAY)).toBe(true);
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
    expect(claimPosterPrompt(store, START)).toBe(false);
  });
});
