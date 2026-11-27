// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAnalyticsForTests, track } from "../analytics";

const sendBeacon = vi.fn<(url: string, body: Blob) => boolean>(() => true);

function setWidth(width: number) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: width >= Number(/min-width: (\d+)rem/.exec(query)?.[1]) * 16,
  }));
}

async function sentProps() {
  const body = sendBeacon.mock.calls.at(-1)![1];
  return JSON.parse(await body.text()).props;
}

function deferredResponse() {
  let resolve!: (res: Response) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<Response>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  document.documentElement.style.setProperty("--breakpoint-sm", "40rem");
  document.documentElement.style.setProperty("--breakpoint-lg", "64rem");
  Object.defineProperty(navigator, "sendBeacon", { value: sendBeacon, configurable: true });
});

afterEach(() => {
  resetAnalyticsForTests();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  sendBeacon.mockClear();
});

describe("track", () => {
  beforeEach(() => {
    sessionStorage.setItem("atlens_vid_ready", "1");
  });

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

describe("track landing source", () => {
  beforeEach(() => {
    sessionStorage.setItem("atlens_vid_ready", "1");
  });

  it("adds src and campaign from the landing URL and keeps them for later events", async () => {
    setWidth(1200);
    window.history.replaceState({}, "", "/en?utm_source=hn&utm_campaign=launch");
    track("filter_reset");
    expect(await sentProps()).toMatchObject({ src: "hn", campaign: "launch" });
    expect(window.location.search).toBe("");

    window.history.replaceState({}, "", "/en/lenses");
    track("filter_reset");
    expect(await sentProps()).toMatchObject({ src: "hn", campaign: "launch" });
  });
});

describe("track first-visit cookie serialization", () => {
  it("sends the first event via fetch and queues concurrent calls until it settles, then uses sendBeacon", async () => {
    setWidth(1200);
    const first = deferredResponse();
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(() => first.promise);
    vi.stubGlobal("fetch", fetchMock);

    track("page_view", { referrer: undefined });
    track("lens_view", { lens_slug: "xf-35mm-f1-4-r" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/track",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        keepalive: true,
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({ event: "page_view" });
    expect(sendBeacon).not.toHaveBeenCalled();

    first.resolve(new Response(null, { status: 204 }));
    await Promise.resolve();
    await Promise.resolve();

    expect(sessionStorage.getItem("atlens_vid_ready")).toBe("1");
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(JSON.parse(await sendBeacon.mock.calls[0][1].text())).toMatchObject({
      event: "lens_view",
      props: { lens_slug: "xf-35mm-f1-4-r" },
    });

    track("lens_scroll", { lens_slug: "xf-35mm-f1-4-r", depth_pct: 50 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sendBeacon).toHaveBeenCalledTimes(2);
    expect(JSON.parse(await sendBeacon.mock.calls[1][1].text())).toMatchObject({
      event: "lens_scroll",
      props: { lens_slug: "xf-35mm-f1-4-r", depth_pct: 50 },
    });
  });

  it("flushes queued calls immediately on pagehide before the first fetch settles", async () => {
    setWidth(1200);
    const first = deferredResponse();
    const fetchMock = vi.fn(() => first.promise);
    vi.stubGlobal("fetch", fetchMock);

    track("page_view", { referrer: undefined });
    track("lens_view", { lens_slug: "xf-35mm-f1-4-r" });
    expect(sendBeacon).not.toHaveBeenCalled();

    window.dispatchEvent(new Event("pagehide"));

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(JSON.parse(await sendBeacon.mock.calls[0][1].text())).toMatchObject({ event: "lens_view" });

    first.resolve(new Response(null, { status: 204 }));
    await Promise.resolve();
    await Promise.resolve();
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it("does not mark vid ready if the initial fetch fails, and retries fetch on the next call", async () => {
    setWidth(1200);
    const first = deferredResponse();
    const second = deferredResponse();
    const fetchMock = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    vi.stubGlobal("fetch", fetchMock);

    track("page_view", { referrer: undefined });
    track("lens_view", { lens_slug: "xf-35mm-f1-4-r" });

    first.reject(new Error("network error"));
    await Promise.resolve();
    await Promise.resolve();

    expect(sessionStorage.getItem("atlens_vid_ready")).toBeNull();
    expect(sendBeacon).toHaveBeenCalledTimes(1);

    track("lens_scroll", { lens_slug: "xf-35mm-f1-4-r", depth_pct: 50 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    second.resolve(new Response(null, { status: 204 }));
    await Promise.resolve();
    await Promise.resolve();
    expect(sessionStorage.getItem("atlens_vid_ready")).toBe("1");
  });

  it("does not mark vid ready on a non-ok response, and still works when sessionStorage throws", async () => {
    setWidth(1200);
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 500 })).mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    track("page_view", { referrer: undefined });
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sendBeacon).not.toHaveBeenCalled();

    track("lens_view", { lens_slug: "xf-35mm-f1-4-r" });
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    track("lens_scroll", { lens_slug: "xf-35mm-f1-4-r", depth_pct: 50 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sendBeacon).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
  });
});
