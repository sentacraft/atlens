// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCountryCode } from "../useCountryCode";

describe("useCountryCode", () => {
  beforeEach(() => {
    document.cookie = "xg_country=; max-age=0";
  });

  it("returns US when no cookie is set", () => {
    const { result } = renderHook(() => useCountryCode());
    expect(result.current).toBe("US");
  });

  it("reads country from xg_country cookie", () => {
    document.cookie = "xg_country=JP";
    const { result } = renderHook(() => useCountryCode());
    expect(result.current).toBe("JP");
  });

  it("ignores unrelated cookies", () => {
    document.cookie = "other=FR";
    const { result } = renderHook(() => useCountryCode());
    expect(result.current).toBe("US");
  });

  it("reads correctly when multiple cookies exist", () => {
    document.cookie = "foo=bar";
    document.cookie = "xg_country=CN";
    document.cookie = "baz=qux";
    const { result } = renderHook(() => useCountryCode());
    expect(result.current).toBe("CN");
  });
});
