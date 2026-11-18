// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompareTechnicalImages, InlineTechnicalImages, type TechnicalImageSet } from "../TechnicalImages";
import messages from "@/messages/en.json";

vi.mock("@/lib/lens/image", () => ({ getLensImageUrl: (lens: string, image: string) => `/images/${lens}/${image}.webp` }));
vi.mock("@/lib/analytics/analytics", () => ({ track: vi.fn() }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? children : null,
  DialogPopup: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogClose: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

afterEach(cleanup);

const set: TechnicalImageSet = {
  id: "example-x",
  model: "Example",
  images: [
    { id: "001", role: "mtf", focalLengthMm: 35, displayPreset: "invert-on-white" },
    { id: "002", role: "mtf", focalLengthMm: 50, displayPreset: "white-background" },
    { id: "003", role: "mtf", focalLengthMm: 70, conditionsNote: "Third chart conditions" },
    { id: "004", role: "mtf", focalLengthMm: 100 },
  ],
};

function renderLocalized(children: React.ReactNode) {
  render(<NextIntlClientProvider locale="en" timeZone="UTC" messages={messages}>{children}</NextIntlClientProvider>);
}

describe("technical image viewer", () => {
  it("renders two previews and opens remaining images at the first hidden chart", () => {
    renderLocalized(<InlineTechnicalImages set={set} role="mtf" />);
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getByRole("img", { name: "Example — 35mm" }).style.filter).toBe("invert(1) hue-rotate(180deg) saturate(0.6)");
    fireEvent.click(screen.getByRole("button", { name: "View remaining MTF charts" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("3 / 4")).toBeDefined();
    expect(dialog.getByText("Third chart conditions")).toBeDefined();
    expect(dialog.getByRole("img").style.filter).toBe("");
    fireEvent.click(dialog.getByRole("button", { name: "Previous image" }));
    expect(dialog.getByRole("img").style.filter).toBe("saturate(0.6)");
  });

  it("opens a selected preview directly and hides the overflow link without hidden images", () => {
    renderLocalized(<InlineTechnicalImages set={{ ...set, images: set.images.slice(0, 2) }} role="mtf" />);
    expect(screen.queryByRole("button", { name: "View remaining MTF charts" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open image: 35mm" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("1 / 2")).toBeDefined();
    expect(dialog.getByRole("img").style.filter).toBe("invert(1) hue-rotate(180deg) saturate(0.6)");
  });

  it("lets comparison panels choose charts independently", () => {
    renderLocalized(<CompareTechnicalImages sets={[set, { ...set, id: "second-x", model: "Second" }]} activeId={set.id} role="mtf" />);
    fireEvent.click(screen.getByRole("button", { name: "View MTF charts" }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByRole("combobox", { name: "Select image for Second" }), { target: { value: "2" } });
    expect(dialog.getByRole("img", { name: "Second — 70mm" })).toBeDefined();
    expect(dialog.getByRole("img", { name: "Example — 35mm" })).toBeDefined();
  });
});
