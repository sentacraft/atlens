// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { useEffect } from "react";
import { useTurnstile } from "../useTurnstile";

type Options = Record<string, unknown> & {
  callback: (token: string) => void;
  "error-callback": () => void;
  "before-interactive-callback": () => void;
  "after-interactive-callback": () => void;
};

let options: Options;
const api = {
  render: vi.fn((_container: HTMLElement, opts: Options) => {
    options = opts;
    return "widget-1";
  }),
  execute: vi.fn(),
  reset: vi.fn(),
  remove: vi.fn(),
};

let turnstile: ReturnType<typeof useTurnstile>;

function Harness() {
  const { container, interactive, takeToken } = useTurnstile("email-otp");
  useEffect(() => {
    turnstile = { container, interactive, takeToken };
  });
  return <div ref={container} />;
}

async function mount() {
  render(<Harness />);
  await act(async () => {});
}

beforeEach(() => {
  window.turnstile = api as unknown as Window["turnstile"];
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useTurnstile", () => {
  it("runs the check only when a token is asked for, and starts over after each one", async () => {
    await mount();
    expect(api.render).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({ execution: "execute" }));
    expect(api.execute).not.toHaveBeenCalled();

    let token: Promise<string | null>;
    await act(async () => {
      token = turnstile.takeToken();
    });
    expect(api.execute).toHaveBeenCalledTimes(1);

    act(() => options.callback("token-1"));
    await expect(token!).resolves.toBe("token-1");
    expect(api.reset).toHaveBeenCalledWith("widget-1");
  });

  it("waits as long as the visitor needs once Cloudflare shows a challenge", async () => {
    vi.useFakeTimers();
    await mount();

    let token: Promise<string | null>;
    await act(async () => {
      token = turnstile.takeToken();
    });
    act(() => options["before-interactive-callback"]());
    expect(turnstile.interactive).toBe(true);

    await act(() => vi.advanceTimersByTimeAsync(120_000));
    act(() => {
      options["after-interactive-callback"]();
      options.callback("token-1");
    });

    await expect(token!).resolves.toBe("token-1");
    expect(turnstile.interactive).toBe(false);
  });

  it("gives up when the invisible check stalls or fails", async () => {
    vi.useFakeTimers();
    await mount();

    let stalled: Promise<string | null>;
    await act(async () => {
      stalled = turnstile.takeToken();
    });
    await act(() => vi.advanceTimersByTimeAsync(15_000));
    await expect(stalled!).resolves.toBeNull();

    let failed: Promise<string | null>;
    await act(async () => {
      failed = turnstile.takeToken();
    });
    act(() => options["error-callback"]());
    await expect(failed!).resolves.toBeNull();
  });
});
