// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { track } from "../analytics";

const sendBeacon = vi.fn((_url: string, _body: Blob) => true);

function setWidth(width: number) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: width >= Number(/min-width: (\d+)rem/.exec(query)?.[1]) * 16,
  }));
}

async function sentProps() {
  const body = sendBeacon.mock.calls.at(-1)![1];
  return JSON.parse(await body.text()).props;
}

beforeEach(() => {
  document.documentElement.style.setProperty("--breakpoint-sm", "40rem");
  document.documentElement.style.setProperty("--breakpoint-lg", "64rem");
  Object.defineProperty(navigator, "sendBeacon", { value: sendBeacon, configurable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  sendBeacon.mockClear();
});

describe("track", () => {
  it.each([
    [375, "phone"],
    [768, "tablet"],
    [1440, "desktop"],
  ])("records a %ipx window as %s", async (width, viewport) => {
    setWidth(width);
    track("nav_click", { item: "charts", place: "menu" });

    expect(await sentProps()).toEqual({ item: "charts", place: "menu", viewport });
  });

  it("adds the viewport to an event sent without props", async () => {
    setWidth(375);
    track("filter_reset");

    expect(await sentProps()).toEqual({ viewport: "phone" });
  });
});
