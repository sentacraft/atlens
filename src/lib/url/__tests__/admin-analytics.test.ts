import { describe, expect, it } from "vitest";
import { adminAnalyticsPath, analyticsTabOf, parseAnalyticsRange, resolveAnalyticsRange } from "../admin-analytics";

describe("admin analytics URLs", () => {
  it("keeps the range on every tab and leaves the default range out", () => {
    expect(adminAnalyticsPath("", "30d")).toBe("/admin/analytics");
    expect(adminAnalyticsPath("iris", "7d")).toBe("/admin/analytics/iris?range=7d");
    expect(adminAnalyticsPath("discovery", "30d")).toBe("/admin/analytics/discovery");
  });

  it("falls back to 30 days for a missing or unknown range", () => {
    expect(resolveAnalyticsRange({ range: "90d" })).toBe("90d");
    expect(resolveAnalyticsRange({ range: "1y" })).toBe("30d");
    expect(parseAnalyticsRange(null)).toBe("30d");
  });

  it("reads the tab from the pathname", () => {
    expect(analyticsTabOf("/admin/analytics")).toBe("");
    expect(analyticsTabOf("/admin/analytics/conversion")).toBe("conversion");
    expect(analyticsTabOf("/admin/analytics/nope")).toBeNull();
    expect(analyticsTabOf("/admin")).toBeNull();
  });
});
