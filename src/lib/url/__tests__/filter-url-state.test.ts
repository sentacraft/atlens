// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultFilters } from "@/lib/lens/lens";
import { writeFiltersToUrl } from "../filter-params";

afterEach(() => vi.restoreAllMocks());

describe("writeFiltersToUrl", () => {
  it("pushes applied filters and preserves unrelated query and hash", () => {
    window.history.replaceState(null, "", "/en/lenses/x/browse?src=test&fc=wide#lenses");
    const push = vi.spyOn(window.history, "pushState");
    writeFiltersToUrl({ ...defaultFilters, focalLength: { value: 40, reference: "equivalent" }, weightLimit: 500 });
    expect(push).toHaveBeenCalledOnce();
    expect(window.location.search).toBe("?src=test&fmm=40&fr=equivalent&w=500");
    expect(window.location.hash).toBe("#lenses");
  });

  it("clears every owned parameter on reset without adding duplicates", () => {
    window.history.replaceState(null, "", "/en/lenses/x/browse?src=test&fmm=40&fr=actual&ap=2.8&w=500");
    writeFiltersToUrl(defaultFilters);
    expect(window.location.search).toBe("?src=test");
    const push = vi.spyOn(window.history, "pushState");
    writeFiltersToUrl(defaultFilters);
    expect(push).not.toHaveBeenCalled();
  });
});
