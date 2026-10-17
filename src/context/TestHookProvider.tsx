"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  TESTHOOK_OPTION_DEFINITIONS,
  TESTHOOK_QUERY_KEYS,
  buildTestHookSearchParams,
  getDefaultTestHookState,
  parseTestHookState,
  resolveTestHookCss,
  type TestHookState,
} from "@/lib/testhook";

interface TestHookContextValue {
  state: TestHookState;
  setTestHook: (enabled: boolean) => void;
  setOption: (key: string, value: string) => void;
  reset: () => void;
  buildShareableLink: () => string;
}

// Dev-only, and the panel already keeps its active tab this way.
const STORAGE_KEY = "testhook-state";

export const TestHookContext = createContext<TestHookContextValue | null>(null);

function saveState(state: TestHookState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or a full quota — persistence is a convenience, not a feature.
  }
}

export function TestHookProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<TestHookState>(() =>
    parseTestHookState(searchParams)
  );

  // Survive a reload. The URL params are stripped right after boot so a shared link
  // stays clean, which used to mean every Fast Refresh dropped whatever was toggled —
  // a trace you turned on to watch one turn was gone by the next edit. The URL still
  // wins when it carries anything, so a shared link opens as its author left it.
  useEffect(() => {
    if (searchParams.has(TESTHOOK_QUERY_KEYS.testHook)) {
      saveState(state);
      return;
    }
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setState(JSON.parse(saved) as TestHookState);
      }
    } catch {
      // Unparseable or unavailable storage: start from the defaults, not a crash.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cold-start restore, once
  }, []);

  // Saves on change, not in an effect on `state`: such an effect would write the initial
  // state over the stored one before the restore above lands (StrictMode runs effects twice).
  function update(next: (prev: TestHookState) => TestHookState) {
    setState((prev) => {
      const value = next(prev);
      saveState(value);
      return value;
    });
  }

  // Strip testhook params from URL after cold-start init
  useEffect(() => {
    if (!state.testHook) {
      return;
    }
    const clean = new URLSearchParams(searchParams.toString());
    clean.delete(TESTHOOK_QUERY_KEYS.testHook);
    for (const option of TESTHOOK_OPTION_DEFINITIONS) {
      clean.delete(option.key);
    }
    const query = clean.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- cold-start init: strip testhook params once
  }, []);

  // Sync state → CSS injection
  useEffect(() => {
    let styleElement = document.getElementById("testhook-css") as HTMLStyleElement | null;
    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = "testhook-css";
      document.head.appendChild(styleElement);
    }
    styleElement.textContent = resolveTestHookCss(state);
  }, [state]);

  const value: TestHookContextValue = useMemo(
    () => ({
      state,
      setTestHook: (enabled) =>
        update((prev) => ({ ...prev, testHook: enabled })),
      setOption: (key, val) =>
        update((prev) => ({
          ...prev,
          options: { ...prev.options, [key]: val },
        })),
      reset: () =>
        update((prev) => ({
          ...getDefaultTestHookState(),
          testHook: prev.testHook,
        })),
      buildShareableLink: () => {
        const params = buildTestHookSearchParams(new URLSearchParams(), state);
        return `${window.location.origin}${pathname}?${params.toString()}`;
      },
    }),
    [state, pathname]
  );

  return <TestHookContext value={value}>{children}</TestHookContext>;
}

/** Whether test-hook mode is on; every test-hook feature asks this one hook. */
export function useTestHookEnabled(): boolean {
  return useContext(TestHookContext)?.state.testHook ?? false;
}

export function useUiHookAttr(): (value: string) => Record<string, string> {
  return useTestHookEnabled() ? (value) => ({ "data-ui-hook": value }) : () => ({});
}

// Current value of a test-hook option, or undefined when test hooks are off.
// Used by behaviour toggles (AskIris trace / fixture) rather than CSS injection.
export function useTestHookOption(key: string): string | undefined {
  const context = useContext(TestHookContext);
  const enabled = useTestHookEnabled();
  return enabled ? context?.state.options[key] : undefined;
}
