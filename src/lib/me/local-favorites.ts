import { MAX_FAVORITES } from "@/lib/me/favorites-schema";

const STORAGE_KEY = "atlens_local_favorites";
const EMPTY_IDS: string[] = [];

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedIds: string[] = EMPTY_IDS;

function parseLocalFavorites(raw: string | null): string[] {
  if (!raw) {
    return EMPTY_IDS;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return EMPTY_IDS;
    }
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const item of parsed) {
      if (typeof item !== "string") {
        continue;
      }
      const id = item.trim();
      if (!id || seen.has(id)) {
        continue;
      }
      seen.add(id);
      ids.push(id);
      if (ids.length >= MAX_FAVORITES) {
        break;
      }
    }
    return ids.length > 0 ? ids : EMPTY_IDS;
  } catch {
    return EMPTY_IDS;
  }
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function getLocalFavoritesSnapshot(): string[] {
  if (typeof window === "undefined") {
    return EMPTY_IDS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedIds;
    }
    cachedRaw = raw;
    cachedIds = parseLocalFavorites(raw);
    return cachedIds;
  } catch {
    return EMPTY_IDS;
  }
}

export function getLocalFavoritesServerSnapshot(): string[] {
  return EMPTY_IDS;
}

function writeLocalFavorites(ids: string[]): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    if (ids.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      cachedRaw = null;
      cachedIds = EMPTY_IDS;
    } else {
      const raw = JSON.stringify(ids);
      window.localStorage.setItem(STORAGE_KEY, raw);
      cachedRaw = raw;
      cachedIds = ids;
    }
    emit();
    return true;
  } catch {
    return false;
  }
}

export function addLocalFavorite(
  lensId: string,
): { ok: true; ids: string[] } | { ok: false; reason: "limit" | "storage" } {
  const current = getLocalFavoritesSnapshot();
  if (current.includes(lensId)) {
    return { ok: true, ids: current };
  }
  if (current.length >= MAX_FAVORITES) {
    return { ok: false, reason: "limit" };
  }
  const next = [lensId, ...current];
  if (!writeLocalFavorites(next)) {
    return { ok: false, reason: "storage" };
  }
  return { ok: true, ids: next };
}

export function removeLocalFavorite(lensId: string): string[] {
  const current = getLocalFavoritesSnapshot();
  if (!current.includes(lensId)) {
    return current;
  }
  const next = current.filter((id) => id !== lensId);
  writeLocalFavorites(next);
  return next;
}

export function clearLocalFavorites(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage removal errors; cached snapshot still resets for the session.
  }
  cachedRaw = null;
  cachedIds = EMPTY_IDS;
  emit();
}

export function subscribeLocalFavorites(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window === "undefined") {
    return () => {
      listeners.delete(listener);
    };
  }
  function onStorage(event: StorageEvent) {
    if (event.key === null || event.key === STORAGE_KEY) {
      listener();
    }
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
