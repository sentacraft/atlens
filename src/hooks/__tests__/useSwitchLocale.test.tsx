// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSwitchLocale } from "../useSwitchLocale";

const env = vi.hoisted(() => ({
  user: undefined as { id: string } | undefined,
  order: [] as string[],
}));
const replace = vi.fn((href: string, options: { locale: string }) => {
  env.order.push(`replace ${href} ${options.locale} cookie=${document.cookie}`);
});
const patchUserSettings = vi.fn(async (patch: { locale: string }) => ({ defaultMount: "X", locale: patch.locale, supportPromptRespondedAt: null }));

vi.mock("next-intl", () => ({ useLocale: () => "zh", useTranslations: () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/lenses/x/browse", useRouter: () => ({ replace }) }));
vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => ({ data: env.user ? { user: env.user } : null }) },
  accountUser: (session: { user: { id: string } } | null) => session?.user,
}));
vi.mock("@/lib/me/settings-client", () => ({
  userSettingsQuery: (userId: string) => ({ queryKey: ["me", "settings", userId] }),
  patchUserSettings: (patch: { locale: string }) => patchUserSettings(patch),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  env.user = undefined;
  env.order = [];
  document.cookie = "atlens_locale=; Max-Age=0; Path=/";
  window.history.replaceState(null, "", "/zh/lenses/x/browse?brand=sigma");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useSwitchLocale", () => {
  it("keeps the page and its query for a guest, saving nothing", () => {
    const { result } = renderHook(() => useSwitchLocale(), { wrapper });

    act(() => result.current("en"));

    expect(replace).toHaveBeenCalledWith("/lenses/x/browse?brand=sigma", { locale: "en" });
    expect(patchUserSettings).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain("atlens_locale=en");
  });

  it("saves a signed-in visitor's choice, writing the cookie before leaving so the middleware does not send them back", () => {
    env.user = { id: "u1" };
    const { result } = renderHook(() => useSwitchLocale(), { wrapper });

    act(() => result.current("en"));

    expect(env.order).toEqual(["replace /lenses/x/browse?brand=sigma en cookie=atlens_locale=en"]);
    expect(patchUserSettings).toHaveBeenCalledWith({ locale: "en" });
  });

  it("does nothing for the language already shown", () => {
    const { result } = renderHook(() => useSwitchLocale(), { wrapper });

    act(() => result.current("zh"));

    expect(replace).not.toHaveBeenCalled();
  });
});
