// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ChartLens } from "@/lib/charts/catalog";
import ChartLensSheet from "../ChartLensSheet";

const viewport = vi.hoisted(() => ({ wide: true }));
vi.mock("@/hooks/useViewport", async (importActual) => ({
  ...(await importActual<typeof import("@/hooks/useViewport")>()),
  useBreakpoint: () => viewport.wide,
}));
vi.mock("next-intl", () => ({
  useTranslations: () => Object.assign((key: string) => key, { has: () => false }),
}));
vi.mock("@/i18n/navigation", () => ({ Link: (props: { href: string }) => <a {...props} /> }));
vi.mock("@/components/charts/ChartLensCard", () => ({ ChartLensSummary: () => <p>summary</p> }));
vi.mock("@/components/lens/LensActions", () => ({ default: () => null }));
vi.mock("@/hooks/useCompareToggle", () => ({ useCompareToggle: () => null }));

const lens = { id: "xf-14", brand: "fujifilm", model: "XF14mm F2.8 R" } as ChartLens;

afterEach(() => {
  cleanup();
  viewport.wide = true;
});

describe("ChartLensSheet", () => {
  // A centered dialog ignores presses outside it, so a touch on a wide screen needs a way out.
  it("gives the centered card a close button", () => {
    render(<ChartLensSheet lens={lens} open onOpenChange={() => {}} />);

    expect(screen.getByRole("button", { name: "close" })).toBeInTheDocument();
  });
});
