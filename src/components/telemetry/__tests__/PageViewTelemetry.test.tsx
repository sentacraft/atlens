// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { track } from "@/lib/analytics/analytics";

const nav = vi.hoisted(() => ({ pathname: "/zh" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));
vi.mock("@/lib/analytics/analytics", () => ({ track: vi.fn() }));

const { default: PageViewTelemetry } = await import("../PageViewTelemetry");

afterEach(() => {
  cleanup();
  vi.mocked(track).mockClear();
});

describe("PageViewTelemetry", () => {
  it("records the landing page once, then each in-app route with the page it came from", () => {
    const { rerender } = render(
      <StrictMode>
        <PageViewTelemetry />
      </StrictMode>,
    );
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("page_view", { referrer: undefined });

    nav.pathname = "/zh/lenses/x/collections/pancake";
    rerender(
      <StrictMode>
        <PageViewTelemetry />
      </StrictMode>,
    );

    expect(track).toHaveBeenCalledTimes(2);
    expect(track).toHaveBeenLastCalledWith("page_view", { from_path: "/zh" });
  });
});
