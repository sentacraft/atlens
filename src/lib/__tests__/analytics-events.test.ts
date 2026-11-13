import { describe, expect, it } from "vitest";
import { parseEventProps, valueLabel, type EventProps } from "../analytics/events";

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

  it("keeps a combined filter snapshot intact beyond the usual string limit", () => {
    const filters = {
      brands: ["fujifilm", "tamron", "sigma", "ttartisan", "7artisans", "sgimage", "viltrox", "brightinstar", "laowa"],
      typeFilter: "zoom",
      focusFilter: "auto",
      features: ["apertureRing", "internalZoom", "wr", "ois"],
      focusMotorClass: "stepping",
      focalLengthMm: 27,
      maxAperture: 3.5,
      weightLimit: { kind: "custom", grams: 400 },
      sort: "weightG",
    };
    const filters_json = JSON.stringify(filters);
    expect(parseEventProps("filter_apply", { filters_json })).toEqual({ filters_json });
  });

  it("keeps the common viewport prop on every event", () => {
    expect(parseEventProps("filter_reset", { viewport: "phone" })).toEqual({ viewport: "phone" });
    expect(parseEventProps("nav_click", { item: "charts", place: "menu", viewport: "tablet" })).toEqual({
      item: "charts",
      place: "menu",
      viewport: "tablet",
    });
  });
});

describe("valueLabel", () => {
  it("labels a common prop's values on any event", () => {
    expect(valueLabel("page_view", "viewport", "phone")).toBe("Phone width");
  });
});

// Compile-time checks: track() accepts only the props each event declares.
// @ts-expect-error href is not a purchase_click prop
const _undeclared: EventProps<"purchase_click"> = { href: "https://example.com" };
// @ts-expect-error results_count is a number
const _wrongType: EventProps<"search"> = { results_count: "3" };
void _undeclared;
void _wrongType;
// @ts-expect-error viewport is added by track(), not passed by callers
const _common: EventProps<"page_view"> = { viewport: "phone" };
void _common;
