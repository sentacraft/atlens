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
      execution: "execute";
      size: "flexible";
      callback: (token: string) => void;
      "error-callback": () => void;
      "before-interactive-callback": () => void;
      "after-interactive-callback": () => void;
    },
  ): string;
  execute(container: HTMLElement): void;
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

type Widget = { api: TurnstileApi; id: string; element: HTMLElement };

/**
 * A Turnstile widget that checks the visitor only when `takeToken` asks, and stays invisible
 * unless Cloudflare wants them to interact. Pass `container` as the ref of the element to render
 * it in, and keep that element out of the layout until `interactive`. `takeToken` resolves with a
 * token for one request, or null when the check can't complete.
 */
export function useTurnstile(action: string) {
  const widget = useRef<Promise<Widget | null> | null>(null);
  const pending = useRef<{ resolve: (token: string | null) => void; timer?: ReturnType<typeof setTimeout> } | null>(
    null,
  );
  const [interactive, setInteractive] = useState(false);

  const finish = useCallback((token: string | null) => {
    const current = pending.current;
    if (!current) {
      return;
    }
    pending.current = null;
    clearTimeout(current.timer);
    current.resolve(token);
  }, []);

  const container = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) {
        return;
      }
      let removed = false;
      const rendered = loadTurnstile()
        .then((api): Widget | null => {
          if (removed) {
            return null;
          }
          const local = LOCAL_HOSTS.includes(window.location.hostname);
          const id = api.render(element, {
            sitekey: local ? TURNSTILE_TEST_SITE_KEY : TURNSTILE_SITE_KEY,
            action,
            appearance: "interaction-only",
            execution: "execute",
            size: "flexible",
            callback: (token) => finish(token),
            "error-callback": () => finish(null),
            // A person may take a while with a challenge; the timeout is only for a stalled check.
            "before-interactive-callback": () => {
              clearTimeout(pending.current?.timer);
              setInteractive(true);
            },
            "after-interactive-callback": () => setInteractive(false),
          });
          return { api, id, element };
        })
        .catch(() => null);
      widget.current = rendered;
      return () => {
        removed = true;
        widget.current = null;
        void rendered.then((rendered) => rendered?.api.remove(rendered.id));
        setInteractive(false);
        finish(null);
      };
    },
    [action, finish],
  );

  const takeToken = useCallback(async (): Promise<string | null> => {
    const rendered = await widget.current;
    if (!rendered) {
      return null;
    }
    finish(null);
    const token = new Promise<string | null>((resolve) => {
      pending.current = { resolve, timer: setTimeout(() => finish(null), TOKEN_TIMEOUT_MS) };
    });
    rendered.api.execute(rendered.element);
    const value = await token;
    setInteractive(false);
    // Each token is accepted once; reset so a retry or a resend can run the check again.
    rendered.api.reset(rendered.id);
    return value;
  }, [finish]);

  return { container, interactive, takeToken };
}
