// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildChartPreviews } from "@/lib/charts/previews";
import { getLensesByMount } from "@/lib/lens/data";
import HomeCharts from "../HomeCharts";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}));
vi.mock("@/components/mount/WhenMountHas", () => ({ default: ({ children }: { children: ReactNode }) => children }));

afterEach(cleanup);

describe("HomeCharts", () => {
  it("links a card to each chart, with the chart's real counts", () => {
    const previews = buildChartPreviews(getLensesByMount("X", "en"))!;
    render(<HomeCharts previews={previews} />);

    const cards = within(screen.getByRole("list")).getAllByRole("link");
    expect(cards.map((card) => card.getAttribute("href"))).toEqual([
      "/lenses/x/charts/timeline",
      "/lenses/x/charts/weight",
      "/lenses/x/charts/lineups",
    ]);
    expect(cards[0]).toHaveTextContent(`"count":${previews.timeline.count}`);
    expect(cards[1]).toHaveTextContent(`"heaviest":"${previews.weight.heaviestG}"`);
    expect(screen.getByRole("link", { name: /chartsLink/ })).toHaveAttribute("href", "/lenses/x/charts");
  });
});
