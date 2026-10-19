import { describe, expect, it } from "vitest";
import { parseEventProps, type EventProps } from "../analytics/events";

describe("parseEventProps", () => {
  it("keeps only the props the event declares", () => {
    expect(
      parseEventProps("purchase_click", {
        channel: "jd",
        lens_id: "xf-33",
        source: "lens_page",
        is_affiliate: true,
        href: "https://example.com",
      }),
    ).toEqual({ channel: "jd", lens_id: "xf-33", source: "lens_page", is_affiliate: true });
  });

  it("drops a malformed value instead of the event", () => {
    expect(parseEventProps("lens_scroll", { lens_slug: "xf-33", depth_pct: "50" })).toEqual({ lens_slug: "xf-33" });
  });

  it("accepts an event without props", () => {
    expect(parseEventProps("filter_reset")).toEqual({});
  });
});

// Compile-time checks: track() accepts only the props each event declares.
// @ts-expect-error href is not a purchase_click prop
const _undeclared: EventProps<"purchase_click"> = { href: "https://example.com" };
// @ts-expect-error results_count is a number
const _wrongType: EventProps<"search"> = { results_count: "3" };
void _undeclared;
void _wrongType;
