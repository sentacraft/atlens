// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChartLens } from "@/lib/charts/catalog";
import { ChartLensSummary } from "../ChartLensCard";

const owned = vi.hoisted(() => ({ ids: new Set<string>() }));
vi.mock("@/hooks/useIsOwnedLens", () => ({ useIsOwnedLens: (id: string) => owned.ids.has(id) }));
vi.mock("next-intl", () => ({ useTranslations: () => Object.assign((key: string) => key, { has: () => false }) }));
vi.mock("@/components/ui/dialog", () => ({ DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2> }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- stub for the test
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const lens = { id: "xf-33", brand: "fujifilm", model: "XF 33mm F1.4", focalMin: 33, focalMax: 33, weightG: 360 } as unknown as ChartLens;

afterEach(() => {
  cleanup();
  owned.ids.clear();
});

describe("ChartLensSummary owned label", () => {
  it.each(["card", "sheet"] as const)("names an owned lens on the %s's brand line", (size) => {
    owned.ids.add(lens.id);
    render(<ChartLensSummary lens={lens} size={size} />);
    expect(screen.getByText("owned")).toBeInTheDocument();
  });

  it("leaves a lens the user does not own unlabeled", () => {
    render(<ChartLensSummary lens={lens} size="sheet" />);
    expect(screen.queryByText("owned")).toBeNull();
  });
});
