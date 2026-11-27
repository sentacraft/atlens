// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_FAVORITES } from "../favorites-schema";
import {
  addLocalFavorite,
  clearLocalFavorites,
  getLocalFavoritesSnapshot,
  removeLocalFavorite,
  subscribeLocalFavorites,
} from "../local-favorites";

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
  clearLocalFavorites();
});

afterEach(() => {
  clearLocalFavorites();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("localFavorites", () => {
  it("prepends new favorites without duplicates and notifies subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLocalFavorites(listener);

    expect(addLocalFavorite("xf-56")).toEqual({ ok: true, ids: ["xf-56"] });
    expect(addLocalFavorite("xf-23")).toEqual({ ok: true, ids: ["xf-23", "xf-56"] });
    expect(addLocalFavorite("xf-56")).toEqual({ ok: true, ids: ["xf-23", "xf-56"] });
    expect(getLocalFavoritesSnapshot()).toEqual(["xf-23", "xf-56"]);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });

  it("removes a favorite and drops the storage key once empty", () => {
    addLocalFavorite("xf-56");
    addLocalFavorite("xf-23");

    expect(removeLocalFavorite("xf-56")).toEqual(["xf-23"]);
    expect(removeLocalFavorite("xf-23")).toEqual([]);
    expect(localStorage.getItem("atlens_local_favorites")).toBeNull();
  });

  it("ignores corrupt storage data", () => {
    localStorage.setItem("atlens_local_favorites", "{not-json");
    expect(getLocalFavoritesSnapshot()).toEqual([]);

    localStorage.setItem("atlens_local_favorites", JSON.stringify(["xf-56", "", 123, "xf-56"]));
    expect(getLocalFavoritesSnapshot()).toEqual(["xf-56"]);
  });

  it("rejects additions past MAX_FAVORITES and handles storage errors", () => {
    const full = Array.from({ length: MAX_FAVORITES }, (_, index) => `lens-${index}`);
    localStorage.setItem("atlens_local_favorites", JSON.stringify(full));

    expect(addLocalFavorite("extra")).toEqual({ ok: false, reason: "limit" });

    clearLocalFavorites();
    const broken = memoryStorage();
    broken.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    vi.stubGlobal("localStorage", broken);
    expect(addLocalFavorite("xf-56")).toEqual({ ok: false, reason: "storage" });
  });
});
