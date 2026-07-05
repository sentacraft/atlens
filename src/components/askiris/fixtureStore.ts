"use client";

import type { UIMessage } from "ai";

// Dev-only fixture store shared between AskIrisChat (publishes its live messages,
// reads the selected fixture) and the test-hook panel (selects, saves, renames,
// deletes). Fixtures are persisted as JSON files under a gitignored repo dir via
// /api/askiris-fixtures — a captured session survives reloads and is visible on
// disk, so you can save a live reply and replay it while debugging. None of this
// ships to prod: the API route 404s outside dev and AskIrisChat gates fixture use
// on NODE_ENV.

const API = "/api/askiris-fixtures";

let live: UIMessage[] = [];
let selected = "off";
// In-memory mirror of the on-disk fixtures, so resolveFixture() stays sync for
// render. Seeded by refresh() on load and kept in step on every mutation.
let saved: Record<string, UIMessage[]> = {};
const listeners = new Set<() => void>();

export interface FixtureSnapshot {
  selected: string;
  saved: string[];
}

let snapshot: FixtureSnapshot = { selected, saved: [] };
const SERVER_SNAPSHOT: FixtureSnapshot = { selected: "off", saved: [] };

function rebuild() {
  snapshot = { selected, saved: Object.keys(saved) };
}

function emit() {
  rebuild();
  listeners.forEach((l) => l());
}

async function post(body: Record<string, unknown>) {
  try {
    await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Dev-only convenience; a failed write just leaves disk out of step.
  }
}

async function refresh() {
  try {
    const res = await fetch(API);
    if (res.ok) {
      saved = await res.json();
      emit();
    }
  } catch {
    // No API (e.g. prod) — nothing to replay.
  }
}

if (typeof window !== "undefined") {
  // Restore query-param repro links, e.g. ?fixture=foo — resolves once refresh()
  // lands the saved fixtures from disk.
  const fromUrl = new URLSearchParams(window.location.search).get("fixture");
  if (fromUrl) {
    selected = fromUrl;
    snapshot = { selected, saved: [] };
  }
  void refresh();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): FixtureSnapshot {
  return snapshot;
}

export function getServerSnapshot(): FixtureSnapshot {
  return SERVER_SNAPSHOT;
}

// AskIrisChat publishes on every change; not reactive (no emit) so streaming
// doesn't churn the panel — the panel reads `live` only when Save is pressed.
export function publishLive(messages: UIMessage[]) {
  live = messages;
}

export function setSelected(name: string) {
  selected = name;
  emit();
}

export function resolveFixture(name: string): UIMessage[] | undefined {
  if (name === "off") {
    return undefined;
  }
  return saved[name];
}

export function saveFixture(name: string) {
  saved = { ...saved, [name]: live };
  selected = name;
  emit();
  void post({ action: "save", name, messages: live });
}

export function deleteFixture(name: string) {
  const next = { ...saved };
  delete next[name];
  saved = next;
  if (selected === name) {
    selected = "off";
  }
  emit();
  void post({ action: "delete", name });
}

export function renameFixture(from: string, to: string) {
  if (!(from in saved) || !to || to === from) {
    return;
  }
  const next = { ...saved };
  next[to] = next[from];
  delete next[from];
  saved = next;
  if (selected === from) {
    selected = to;
  }
  emit();
  void post({ action: "rename", from, to });
}
