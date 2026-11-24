// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import type { Lens } from "@/lib/types";
import LensCard from "../LensCard";

const owned = vi.hoisted(() => ({ ids: new Set<string>() }));
vi.mock("@/hooks/useIsOwnedLens", () => ({ useIsOwnedLens: (id: string) => owned.ids.has(id) }));
vi.mock("@/components/lens/LensActions", () => ({ default: () => null }));
vi.mock("@/components/price/ApproxPrice", () => ({ default: () => null }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- stub for the test
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const lens = {
  id: "xf-33-f14",
  brand: "fujifilm",
  series: "XF",
  model: "XF 33mm F1.4",
  mount: "X",
  focalLengthMin: 33,
  focalLengthMax: 33,
  maxAperture: [1.4, 1.4],
  weightG: 360,
  filterMm: 58,
} as unknown as Lens;

function renderCard() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <LensCard lens={lens} isSelected={false} selectionDisabled={false} onToggle={() => {}} />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  owned.ids.clear();
});

describe("LensCard owned mark", () => {
  it("shows the corner pill on the thumbnail of an owned lens, outside the feature-badge row", () => {
    owned.ids.add(lens.id);
    renderCard();
    const pill = screen.getByText("Owned");
    expect(pill.closest('[class*="aspect-[3/2]"]')).not.toBeNull();
    expect(pill.parentElement?.querySelector("h3")).toBeNull();
  });

  it("shows nothing for a lens the user does not own or a guest", () => {
    renderCard();
    expect(screen.queryByText("Owned")).toBeNull();
  });
});
