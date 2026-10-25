// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import LensReviewSummary from "../LensReviewSummary";
import type { LensReviewsView } from "@/lib/lens/reviews-view";

const view = vi.hoisted(() => ({ current: null as unknown }));
const openSignIn = vi.hoisted(() => vi.fn());

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
  useFormatter: () => ({ list: (items: string[]) => items.join(", "), dateTime: (date: Date) => `${date.getFullYear()}/${date.getMonth() + 1}` }),
  useTranslations: () =>
    Object.assign(
      (key: string, values?: Record<string, string | number>) => (values ? `${key}(${Object.values(values).join(",")})` : key),
      { rich: (key: string, tags: Record<string, (chunks: string) => unknown>) => [key, ...Object.values(tags).map((tag) => tag(""))] },
    ),
}));
vi.mock("@/lib/lens/reviews-client", () => ({
  lensReviewsQuery: (id: string) => ({ queryKey: ["lens-reviews", id], queryFn: async () => view.current }),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => ({ data: null }) },
  accountUser: () => undefined,
}));
vi.mock("@/context/SignInDialogProvider", () => ({ useSignInDialog: () => openSignIn }));

afterEach(() => {
  cleanup();
  openSignIn.mockClear();
  scrollIntoView.mockClear();
  window.history.replaceState(null, "", "/");
});

const claim = (aspect: string, polarity: string, text: string, sources: string[]) => ({
  aspect,
  polarity,
  agreement: sources.length > 1 ? "consensus" : "single_source",
  text,
  sources,
  reviewCount: sources.length,
  outletCount: sources.length,
  details: [],
  staleness: [],
  otherMount: false,
});

const scrollIntoView = vi.fn();
Element.prototype.scrollIntoView = scrollIntoView;

function renderWith(data: LensReviewsView, client = new QueryClient()) {
  view.current = data;
  return render(
    <QueryClientProvider client={client}>
      <LensReviewSummary lensId="lens" />
    </QueryClientProvider>,
  );
}

const LOCKED = {
  sources: [DATA_SOURCES()[1]],
  claims: [claim("autofocus", "negative", "对焦偏慢", ["b"])],
  locked: { total: 4, sourceCount: 2, disputed: ["manual_focus"], hiddenAspects: ["vignetting", "manual_focus"] },
} as LensReviewsView;

function DATA_SOURCES() {
  return [
    { id: "a", url: "https://example.com/a", site: "Site A", kind: "measured" },
    { id: "b", url: "https://example.com/b", site: "Site B", kind: "hands_on" },
  ];
}

const DATA = {
  sources: [
    { id: "a", url: "https://example.com/a", site: "Site A", kind: "measured" },
    { id: "b", url: "https://example.com/b", site: "Site B", kind: "hands_on" },
  ],
  claims: [
    claim("bokeh", "positive", "背景虚化讨喜", ["a", "b"]),
    claim("autofocus", "negative", "对焦偏慢", ["b"]),
    claim("vignetting", "mixed", "全开有暗角", ["a"]),
    { ...claim("manual_focus", "mixed", "两家看法相反", ["a", "b"]), agreement: "conflict" },
  ],
} as LensReviewsView;

describe("LensReviewSummary", () => {
  it("shows strengths and weaknesses first and the mixed findings only once expanded", async () => {
    renderWith(DATA);
    expect(await screen.findByText("背景虚化讨喜")).toBeTruthy();
    expect(screen.getByText("对焦偏慢")).toBeTruthy();
    expect(screen.queryByText("全开有暗角")).toBeNull();

    expect(screen.getByText("disagree(aspects.manual_focus)")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "expand(4)" }));
    expect(screen.getByText("全开有暗角")).toBeTruthy();
    expect(screen.getByText("groups.image")).toBeTruthy();
    expect(screen.queryByText(/^count\(/)).toBeNull();
  });

  it("lists the reviews behind a finding from its review count, numbered as the full view numbers them", async () => {
    renderWith(DATA);
    fireEvent.click(await screen.findByRole("button", { name: "reviewSources(2,aspects.bokeh)" }));
    const siteA = await screen.findByRole("link", { name: /Site A/ });
    expect(siteA.getAttribute("href")).toBe("https://example.com/a");
    expect(siteA.textContent).toMatch(/^1/);
    expect(screen.getByRole("link", { name: /Site B/ }).textContent).toMatch(/^2/);
  });

  it("leaves the aspect off collapsed findings, whose sentences already name it", async () => {
    renderWith(DATA);
    expect(await screen.findByText("背景虚化讨喜")).toBeTruthy();
    expect(screen.queryByText("aspects.bokeh")).toBeNull();
  });

  it("cites a finding by its review count in the full view, keeping numbered markers for each review's own points", async () => {
    renderWith({
      ...DATA,
      claims: [...DATA.claims, { ...claim("focus_breathing", "negative", "有呼吸效应", ["a"]), details: [{ id: "b", text: "视频里明显" }] }],
    } as LensReviewsView);
    fireEvent.click(await screen.findByRole("button", { name: "expand(5)" }));
    expect(screen.getByRole("button", { name: "reviewSources(1,aspects.focus_breathing)" })).toBeTruthy();
    expect(screen.queryAllByRole("button", { name: /^marker\(/ })).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "showDetails(1)" }));
    expect(screen.getAllByRole("button", { name: /^marker\(/ })).toHaveLength(1);
  });

  it("explains a technical aspect from its label", async () => {
    renderWith({ ...DATA, claims: [...DATA.claims, claim("focus_breathing", "negative", "有呼吸效应", ["a"])] } as LensReviewsView);
    fireEvent.click(await screen.findByRole("button", { name: "expand(5)" }));
    fireEvent.click(screen.getByRole("button", { name: "aspects.focus_breathing" }));
    expect(await screen.findByText("aspectHint.focus_breathing")).toBeTruthy();
  });

  it("leads with the overall verdict, labelled by how reviewers lean", async () => {
    renderWith({ ...DATA, claims: [claim("overall", "positive", "值得推荐", ["a", "b"]), ...DATA.claims] } as LensReviewsView);
    expect(await screen.findByText("值得推荐")).toBeTruthy();
    expect(screen.getByText("summary")).toBeTruthy();
    expect(screen.getByText("verdict.positive")).toBeTruthy();
  });

  it("labels a disputed overall verdict as disputed rather than by its lean", async () => {
    renderWith({ ...DATA, claims: [{ ...claim("overall", "mixed", "两家结论相反", ["a", "b"]), agreement: "conflict" }, ...DATA.claims] } as LensReviewsView);
    expect(await screen.findByText("两家结论相反")).toBeTruthy();
    expect(screen.getByText("conflict")).toBeTruthy();
    expect(screen.queryByText("verdict.mixed")).toBeNull();
  });

  it("explains why a finding may not hold on the reader's body in one sentence", async () => {
    renderWith({
      ...DATA,
      claims: [{ ...claim("autofocus", "positive", "对焦快", ["a", "b"]), staleness: ["pre_x_trans_iv_body", "unknown_body"], otherMount: true }],
    } as LensReviewsView);
    expect(await screen.findByRole("button", { name: "staleNote(staleCause.pre_x_trans_iv_body, staleCause.unknown_body, staleCause.other_mount)" })).toBeTruthy();
  });

  it("asks a guest to sign in for the rest, counting what the full view holds", async () => {
    renderWith({
      sources: [DATA.sources[1]],
      claims: [DATA.claims[1]],
      locked: { total: 4, sourceCount: 2, disputed: ["manual_focus"], hiddenAspects: ["vignetting", "manual_focus"] },
    } as LensReviewsView);
    expect(await screen.findByText("对焦偏慢")).toBeTruthy();
    expect(screen.getByText("subtitle(2)")).toBeTruthy();
    expect(screen.getByText("disagree(aspects.manual_focus)")).toBeTruthy();

    expect(screen.getByText("aspects.vignetting")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "expandSignIn(4)" }));
    expect(openSignIn).toHaveBeenCalledWith("reviews", { returnTo: expect.stringMatching(/#reviews$/) });
    expect(screen.queryByText("groups.image")).toBeNull();
  });

  it("opens the findings it asked to sign in for once the full set arrives", async () => {
    const client = new QueryClient();
    renderWith(LOCKED, client);
    fireEvent.click(await screen.findByRole("button", { name: "expandSignIn(4)" }));

    act(() => client.setQueryData(["lens-reviews", "lens"], DATA));
    expect(await screen.findByText("全开有暗角")).toBeTruthy();
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("opens the findings when a sign-in comes back to them by link", async () => {
    window.history.replaceState(null, "", "/#reviews");
    renderWith(DATA);
    expect(await screen.findByText("全开有暗角")).toBeTruthy();
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("leaves a guest's findings collapsed even when linked to them", async () => {
    window.history.replaceState(null, "", "/#reviews");
    renderWith(LOCKED);
    expect(await screen.findByText("对焦偏慢")).toBeTruthy();
    expect(screen.queryByText("groups.image")).toBeNull();
  });

  it("renders nothing for a lens without findings", async () => {
    const { container } = renderWith({ sources: [], claims: [] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.innerHTML).toBe("");
  });
});
