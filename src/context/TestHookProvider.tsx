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

export const TestHookContext = createContext<TestHookContextValue | null>(null);

export function TestHookProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<TestHookState>(() =>
    parseTestHookState(searchParams)
  );

  // Strip testhook params from URL after cold-start init
  useEffect(() => {
    if (!state.testHook) return;
    const clean = new URLSearchParams(searchParams.toString());
    clean.delete(TESTHOOK_QUERY_KEYS.testHook);
    for (const option of TESTHOOK_OPTION_DEFINITIONS) {
      clean.delete(option.key);
    }
    const query = clean.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
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
        setState((prev) => ({ ...prev, testHook: enabled })),
      setOption: (key, val) =>
        setState((prev) => ({
          ...prev,
          options: { ...prev.options, [key]: val },
        })),
      reset: () =>
        setState((prev) => ({
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

export function useUiHookAttr(): (value: string) => Record<string, string> {
  const context = useContext(TestHookContext);
  const enabled = context?.state.testHook ?? false;
  return enabled ? (value) => ({ "data-ui-hook": value }) : () => ({});
}
