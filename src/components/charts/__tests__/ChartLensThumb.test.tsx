// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ChartLensThumb from "../ChartLensThumb";

const owned = vi.hoisted(() => ({ ids: new Set<string>() }));
vi.mock("@/hooks/useIsOwnedLens", () => ({ useIsOwnedLens: (id: string) => owned.ids.has(id) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- stub for the test
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

afterEach(() => {
  cleanup();
  owned.ids.clear();
});

describe("ChartLensThumb", () => {
  it("puts the owned dot on an owned lens of an interactive chart", () => {
    owned.ids.add("xf-33");
    render(<ChartLensThumb lensId="xf-33" size={76} interactive loading="lazy" />);
    expect(screen.getByRole("img", { name: "owned" })).toBeInTheDocument();
  });

  it("leaves a lens the user does not own unmarked", () => {
    render(<ChartLensThumb lensId="xf-33" size={76} interactive loading="lazy" />);
    expect(screen.queryByRole("img", { name: "owned" })).toBeNull();
  });

  it("never marks a poster, which is a shared image", () => {
    owned.ids.add("xf-33");
    render(<ChartLensThumb lensId="xf-33" size={76} interactive={false} loading="eager" />);
    expect(screen.queryByRole("img", { name: "owned" })).toBeNull();
  });
});
