import { describe, expect, it } from "vitest";
import {
  buildTestHookSearchParams,
  getDefaultTestHookState,
  parseTestHookState,
  resolveTestHookCss,
} from "../testhook";

describe("parseTestHookState", () => {
  it("returns the default state when no query is provided", () => {
    expect(parseTestHookState(new URLSearchParams())).toEqual(
      getDefaultTestHookState()
    );
  });

  it("accepts the testhook flag", () => {
    expect(parseTestHookState(new URLSearchParams("testhook=1")).testHook).toBe(
      true
    );
  });
});

describe("buildTestHookSearchParams", () => {
  it("removes default values from the URL", () => {
    const params = buildTestHookSearchParams(
      new URLSearchParams("foo=bar&testhook=1"),
      { ...getDefaultTestHookState(), testHook: false }
    );

    expect(params.toString()).toBe("foo=bar");
  });
});

describe("resolveTestHookCss", () => {
  it("returns an empty string when no option css is registered", () => {
    expect(resolveTestHookCss(getDefaultTestHookState())).toBe("");
  });
});
