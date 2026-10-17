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
const device = vi.hoisted(() => ({ mobile: false }));
vi.mock("@/hooks/useViewport", async (importActual) => ({
  ...(await importActual<typeof import("@/hooks/useViewport")>()),
  useIsMobileDevice: () => device.mobile,
}));

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
  device.mobile = false;
});

function renderDialog(onSelect = vi.fn(), { withActions = true } = {}) {
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
      actions={withActions ? () => <button type="button">add</button> : undefined}
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

  it("pins the footer under the results on a computer", () => {
    const { input } = renderDialog();
    fireEvent.change(input, { target: { value: "xf 33" } });

    expect(screen.getByText("Find your lens")).toBeInTheDocument();
    expect(screen.getByText("with-results")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "add" })).not.toBeInTheDocument();
  });

  // Regression: with the keyboard up on a phone, the description and footer left room for about
  // one result.
  it("puts the actions beside the title on a phone, without the description or footer", () => {
    device.mobile = true;
    const { input } = renderDialog();
    fireEvent.change(input, { target: { value: "xf 33" } });

    expect(screen.getByRole("button", { name: "add" })).toBeInTheDocument();
    expect(screen.queryByText("Find your lens")).not.toBeInTheDocument();
    expect(screen.queryByText("with-results")).not.toBeInTheDocument();
  });

  it("moves the footer after the results on a phone when there are no actions", () => {
    device.mobile = true;
    const { input } = renderDialog(vi.fn(), { withActions: false });
    fireEvent.change(input, { target: { value: "xf 33" } });

    const footer = screen.getByText("with-results");
    expect(screen.getByRole("listbox").compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
