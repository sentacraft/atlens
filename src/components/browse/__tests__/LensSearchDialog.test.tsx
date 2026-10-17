// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import LensSearchDialog from "../LensSearchDialog";
import { track } from "@/lib/analytics/analytics";
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
      description="Find your lens"
      resultAction={(lens) => ({ label: `pick ${lens.id}` })}
      onSelect={onSelect}
      footer={(context) => <HookFooter key={String(context.hasResults)} {...context} />}
      actions={() => <button type="button">add</button>}
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

  it("records a search only once IME composition commits the text", () => {
    vi.useFakeTimers();
    try {
      const { input } = renderDialog();

      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: "xing yao" } });
      act(() => vi.advanceTimersByTime(1000));
      expect(track).not.toHaveBeenCalled();

      fireEvent.change(input, { target: { value: "星曜" } });
      fireEvent.compositionEnd(input);
      act(() => vi.advanceTimersByTime(1000));
      expect(track).toHaveBeenCalledTimes(1);
      expect(track).toHaveBeenCalledWith("search", { query: "星曜", results_count: 0 });
    } finally {
      vi.useRealTimers();
    }
  });

  // The footer and the actions both render; CSS shows one or the other on touch screens.
  it("renders the caller's actions beside the title as well as the footer", () => {
    const { input } = renderDialog();
    fireEvent.change(input, { target: { value: "xf 33" } });

    expect(screen.getByRole("button", { name: "add" })).toBeInTheDocument();
    expect(screen.getByText("with-results")).toBeInTheDocument();
  });
});
