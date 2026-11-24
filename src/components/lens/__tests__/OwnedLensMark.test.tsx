// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import OwnedLensMark from "../OwnedLensMark";

const state = vi.hoisted(() => ({
  user: undefined as { id: string } | undefined,
  gear: [] as { id: string; kind: string; catalogId?: string }[],
  fetches: 0,
}));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => ({ data: state.user ? { user: state.user } : null }) },
  accountUser: (session: { user: { id: string } } | null) => session?.user,
}));
vi.mock("@/lib/me/gear-client", () => ({
  userGearQuery: (userId: string) => ({
    queryKey: ["me", "gear", userId],
    queryFn: async () => {
      state.fetches += 1;
      return state.gear;
    },
  }),
}));

function renderMarks(...ids: string[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      {ids.map((id) => (
        <div key={id} data-testid={id}>
          <OwnedLensMark lensId={id} form="corner" />
        </div>
      ))}
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  state.user = undefined;
  state.gear = [];
  state.fetches = 0;
});

describe("OwnedLensMark", () => {
  it("marks only the lenses in the signed-in user's gear, from one shared request", async () => {
    state.user = { id: "u1" };
    state.gear = [
      { id: "g1", kind: "lens", catalogId: "owned-lens" },
      { id: "g2", kind: "body", catalogId: "other-lens" },
    ];
    renderMarks("owned-lens", "other-lens", "third-lens");

    expect(await screen.findByText("owned")).toBeInTheDocument();
    expect(screen.getByTestId("owned-lens")).toHaveTextContent("owned");
    expect(screen.getByTestId("other-lens")).toBeEmptyDOMElement();
    expect(screen.getByTestId("third-lens")).toBeEmptyDOMElement();
    expect(state.fetches).toBe(1);
  });

  it("shows nothing to a guest and makes no gear request", () => {
    state.gear = [{ id: "g1", kind: "lens", catalogId: "owned-lens" }];
    renderMarks("owned-lens");

    expect(screen.queryByText("owned")).toBeNull();
    expect(state.fetches).toBe(0);
  });

  it("shows nothing while the gear is still loading", () => {
    state.user = { id: "u1" };
    state.gear = [{ id: "g1", kind: "lens", catalogId: "owned-lens" }];
    renderMarks("owned-lens");

    expect(screen.queryByText("owned")).toBeNull();
  });
});
