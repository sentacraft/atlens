// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import LensSearchDialog from "../LensSearchDialog";
import type { SearchableLens } from "@/lib/lens/search";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/analytics/analytics", () => ({ track: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ Link: (props: object) => <a {...props} /> }));
vi.mock("@/components/feedback/FeedbackTrigger", () => ({ default: () => null }));

const lenses: SearchableLens[] = [
  { id: "xf-33", brand: "fujifilm", series: "XF", model: "XF 33mm F1.4", focalLengthMin: 33, focalLengthMax: 33, maxAperture: 1.4 },
];

// A footer with its own hook: the dialog must render it as a component, never call it.
function HookFooter({ hasResults }: { hasResults: boolean }) {
  const [label] = useState(hasResults ? "with-results" : "no-results");
  return <p>{label}</p>;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderDialog(onSelect = vi.fn()) {
  render(
    <LensSearchDialog
      open
      onOpenChange={() => {}}
      lenses={lenses}
      title="Search"
      resultAction={(lens) => ({ label: `pick ${lens.id}` })}
      onSelect={onSelect}
      footer={(context) => <HookFooter key={String(context.hasResults)} {...context} />}
    />,
  );
  return { input: screen.getByRole("textbox"), onSelect };
}

describe("LensSearchDialog", () => {
  it("switches between no results and results with a footer that uses hooks", () => {
    const { input } = renderDialog();

    fireEvent.change(input, { target: { value: "zenitar" } });
    expect(screen.getByText("no-results")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "xf 33" } });
    expect(screen.getByText("with-results")).toBeInTheDocument();
  });

  it("shows each result's action and hands the pick to the caller", () => {
    const { input, onSelect } = renderDialog();

    fireEvent.change(input, { target: { value: "xf 33" } });
    fireEvent.click(screen.getByRole("option", { name: /pick xf-33/ }));

    expect(onSelect).toHaveBeenCalledWith(lenses[0]);
  });
});
