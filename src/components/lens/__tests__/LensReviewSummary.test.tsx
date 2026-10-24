// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import LensReviewSummary from "../LensReviewSummary";
import type { LensReviewsView } from "@/lib/lens/reviews-view";

const view = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
  useFormatter: () => ({ list: (items: string[]) => items.join(", ") }),
  useTranslations: () => (key: string, values?: Record<string, string | number>) =>
    values ? `${key}(${Object.values(values).join(",")})` : key,
}));
vi.mock("@/lib/lens/reviews-client", () => ({
  lensReviewsQuery: (id: string) => ({ queryKey: ["lens-reviews", id], queryFn: async () => view.current }),
}));

afterEach(cleanup);

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

function renderWith(data: LensReviewsView) {
  view.current = data;
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <LensReviewSummary lensId="lens" />
    </QueryClientProvider>,
  );
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
  });

  it("lists the reviews behind a finding from its review count", async () => {
    renderWith(DATA);
    fireEvent.click(await screen.findByRole("button", { name: "reviewSources(2,aspects.bokeh)" }));
    expect((await screen.findByRole("link", { name: /Site A/ })).getAttribute("href")).toBe("https://example.com/a");
    expect(screen.getByRole("link", { name: /Site B/ })).toBeTruthy();
  });

  it("renders nothing for a lens without findings", async () => {
    const { container } = renderWith({ sources: [], claims: [] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.innerHTML).toBe("");
  });
});
