// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveLens, type Recommendation } from "@/lib/ai/recall";
import { getLensesByMount } from "@/lib/lens/data";
import RecommendationDeck from "../RecommendationDeck";

vi.mock("next-intl", () => ({ useTranslations: () => Object.assign((key: string) => key, { rich: (key: string) => key }) }));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));
vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/lib/analytics/analytics", () => ({ track: vi.fn() }));
vi.mock("@/components/askiris/Markdown", () => ({ default: ({ children }: { children: string }) => <p>{children}</p> }));
vi.mock("@/components/lens/LensActions", () => ({ default: () => null }));

afterEach(cleanup);

const [first, second] = getLensesByMount("X", "en").slice(0, 2).map((lens, i): Recommendation => ({
  ...resolveLens(lens, "en", (brand) => brand), reason: `reason ${i}`,
}));

describe("RecommendationDeck owned lenses", () => {
  it("marks a card whose lens the user owns, on its image, and no other card", () => {
    render(<RecommendationDeck recommendations={[{ ...first, owned: true }, second]} />);
    expect(screen.getAllByText("owned")).toHaveLength(1);
    const owned = screen.getByText("owned").closest("div.relative") as HTMLElement;
    expect(within(owned).getByRole("img", { name: first.name })).toBeInTheDocument();
    expect(screen.getByText(second.name)).toBeInTheDocument();
  });
});
