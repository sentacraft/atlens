import { describe, expect, it } from "vitest";
import { cookieReader, isInternalEmail, isOptedOutOfStats, statsDbFor } from "../session";

describe("isInternalEmail", () => {
  it("matches an allowlisted email regardless of case and spacing", () => {
    expect(isInternalEmail("a@x.com, B@Y.com", "b@y.COM")).toBe(true);
  });

  it("does not match other emails, an empty list, or a missing email", () => {
    expect(isInternalEmail("a@x.com", "c@x.com")).toBe(false);
    expect(isInternalEmail("", "a@x.com")).toBe(false);
    expect(isInternalEmail(undefined, "a@x.com")).toBe(false);
    expect(isInternalEmail("a@x.com", null)).toBe(false);
    expect(isInternalEmail("a@x.com,,", "")).toBe(false);
  });
});

describe("isOptedOutOfStats", () => {
  it("is true only for the opt-out cookie set to 1", () => {
    expect(isOptedOutOfStats(cookieReader("atlens_no_stats=1"))).toBe(true);
    expect(isOptedOutOfStats(cookieReader("atlens_no_stats="))).toBe(false);
    expect(isOptedOutOfStats(cookieReader(null))).toBe(false);
  });
});

describe("statsDbFor", () => {
  it("withholds the database from an opted-out device", () => {
    expect(statsDbFor(cookieReader("atlens_no_stats=1"), "db")).toBeUndefined();
    expect(statsDbFor(cookieReader(null), "db")).toBe("db");
  });
});
