"use client";

import { useCallback, useRef, useState } from "react";
import { TURNSTILE_SITE_KEY, TURNSTILE_TEST_SITE_KEY } from "@/config/turnstile";

// Turnstile fails if this script is proxied or cached; it must load from this exact URL.
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const TOKEN_TIMEOUT_MS = 15_000;

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      appearance: "interaction-only";
      size: "flexible";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      "before-interactive-callback": () => void;
      "after-interactive-callback": () => void;
    },
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile_missing")));
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("turnstile_unavailable"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * A Turnstile widget that stays invisible unless Cloudflare wants the visitor to interact. Pass
 * `container` as the ref of the element to render it in, and keep that element out of the layout
 * until `interactive`; `takeToken` resolves with a token for one request, or null when the check
 * can't complete.
 */
export function useTurnstile(action: string) {
  const widget = useRef<{ api: TurnstileApi; id: string } | null>(null);
  const token = useRef<string | null>(null);
  const waiters = useRef<((token: string | null) => void)[]>([]);
  const [interactive, setInteractive] = useState(false);

  const settle = useCallback((value: string | null) => {
    for (const resolve of waiters.current.splice(0)) {
      resolve(value);
    }
  }, []);

  const container = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) {
        return;
      }
      let removed = false;
      loadTurnstile()
        .then((api) => {
          if (removed) {
            return;
          }
          const local = LOCAL_HOSTS.includes(window.location.hostname);
          const id = api.render(element, {
            sitekey: local ? TURNSTILE_TEST_SITE_KEY : TURNSTILE_SITE_KEY,
            action,
            appearance: "interaction-only",
            size: "flexible",
            callback: (value) => {
              if (waiters.current.length > 0) {
                settle(value);
                api.reset(id);
              } else {
                token.current = value;
              }
            },
            "expired-callback": () => {
              token.current = null;
            },
            "error-callback": () => settle(null),
            "before-interactive-callback": () => setInteractive(true),
            "after-interactive-callback": () => setInteractive(false),
          });
          widget.current = { api, id };
        })
        .catch(() => settle(null));
      return () => {
        removed = true;
        if (widget.current) {
          widget.current.api.remove(widget.current.id);
          widget.current = null;
        }
        token.current = null;
        setInteractive(false);
        settle(null);
      };
    },
    [action, settle],
  );

  const takeToken = useCallback((): Promise<string | null> => {
    const ready = token.current;
    if (ready && widget.current) {
      token.current = null;
      // Each token is accepted once; start on the next one for a retry or a resend.
      widget.current.api.reset(widget.current.id);
      return Promise.resolve(ready);
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        waiters.current = waiters.current.filter((waiter) => waiter !== done);
        resolve(null);
      }, TOKEN_TIMEOUT_MS);
      const done = (value: string | null) => {
        clearTimeout(timer);
        resolve(value);
      };
      waiters.current.push(done);
    });
  }, []);

  return { container, interactive, takeToken };
}
