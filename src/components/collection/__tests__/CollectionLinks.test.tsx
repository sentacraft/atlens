// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { COLLECTIONS } from "@/lib/collections";
import type { CollectionSummary } from "@/lib/collection-stats";
import CollectionLinks from "../CollectionLinks";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

const [first, second] = Object.values(COLLECTIONS);
const items: CollectionSummary[] = [
  { collection: first, previewLens: { id: "fujifilm-xf-56mmf12-r-wr-x", mount: "X" }, lensCount: 46, brandCount: 7 },
  { collection: second, previewLens: { id: "fujifilm-xf-56mmf12-r-wr-x", mount: "X" }, lensCount: 12, brandCount: 3 },
];

function renderLinks(list: CollectionSummary[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <CollectionLinks items={list} mount="X" locale="en" title="Featured In" />
    </NextIntlClientProvider>,
  );
}

describe("CollectionLinks", () => {
  it("renders each collection as a phone list row and as a card, under one heading", () => {
    renderLinks(items);

    expect(screen.getByRole("heading", { name: "Featured In" })).toBeInTheDocument();
    const [phoneList, cardGrid] = screen.getAllByRole("list");
    expect(within(phoneList).getAllByRole("link")).toHaveLength(2);
    expect(within(phoneList).getByText("46 lenses")).toBeInTheDocument();
    expect(within(cardGrid).getByText("46 lenses · 7 brands")).toBeInTheDocument();
    expect(within(phoneList).getAllByRole("link")[0]).toHaveAttribute("href", `/lenses/x/collections/${first.slug}`);
  });

  it("renders nothing without collections", () => {
    const { container } = renderLinks([]);

    expect(container).toBeEmptyDOMElement();
  });
});
