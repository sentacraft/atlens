// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFocalReferencePreference, writeFocalReferencePreference } from "../focal-preference";

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("focal reference preference", () => {
  it("defaults to equivalent and remembers only an explicit preference", () => {
    expect(readFocalReferencePreference()).toBe("equivalent");
    writeFocalReferencePreference("actual");
    expect(readFocalReferencePreference()).toBe("actual");
    writeFocalReferencePreference("equivalent");
    expect(readFocalReferencePreference()).toBe("equivalent");
  });

  it("keeps working when storage access is denied", () => {
    vi.mocked(window.localStorage.getItem).mockImplementation(() => { throw new Error("denied"); });
    vi.mocked(window.localStorage.setItem).mockImplementation(() => { throw new Error("denied"); });
    expect(readFocalReferencePreference()).toBe("equivalent");
    expect(() => writeFocalReferencePreference("actual")).not.toThrow();
  });
});
