"use client";

import { useEffect, useSyncExternalStore } from "react";
import { TESTHOOK_ALLOWED } from "@/lib/testhook";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";
import { fetchFixtures, writeFixture } from "@/lib/askiris/fixture-client";

let live: AskIrisUIMessage[] = [];
let selected = "off";
let saved: Record<string, AskIrisUIMessage[]> = {};
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

async function refresh() {
  const fixtures = await fetchFixtures();
  if (fixtures) {
    saved = fixtures;
    emit();
  }
}

// TESTHOOK_ALLOWED, not `typeof window`: this module ships in production client chunks.
if (TESTHOOK_ALLOWED && typeof window !== "undefined") {
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

// Not reactive, so streaming does not churn the panel.
function publishLive(messages: AskIrisUIMessage[]) {
  live = messages;
}

export function setSelected(name: string) {
  selected = name;
  emit();
}

function resolveFixture(name: string): AskIrisUIMessage[] | undefined {
  if (name === "off") {
    return undefined;
  }
  return saved[name];
}

export function saveFixture(name: string) {
  saved = { ...saved, [name]: live };
  selected = name;
  emit();
  void writeFixture({ action: "save", name, messages: live });
}

export function deleteFixture(name: string) {
  const next = { ...saved };
  delete next[name];
  saved = next;
  if (selected === name) {
    selected = "off";
  }
  emit();
  void writeFixture({ action: "delete", name });
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
  void writeFixture({ action: "rename", from, to });
}

export function useFixtureMessages(messages: AskIrisUIMessage[]): AskIrisUIMessage[] {
  const { selected } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    publishLive(messages);
  }, [messages]);
  const fixture = TESTHOOK_ALLOWED && selected !== "off" ? resolveFixture(selected) : undefined;
  return fixture ?? messages;
}
