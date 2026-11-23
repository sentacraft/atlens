// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OwnedMark from "../OwnedMark";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

afterEach(cleanup);

describe("OwnedMark", () => {
  it.each(["corner", "inline"] as const)("shows the owned label as text in the %s form", (form) => {
    render(<OwnedMark form={form} />);
    expect(screen.getByText("owned")).toBeInTheDocument();
  });

  it("gives the dot form an accessible name and no visible text", () => {
    render(<OwnedMark form="dot" />);
    const dot = screen.getByRole("img", { name: "owned" });
    expect(dot).toHaveAttribute("title", "owned");
    expect(dot.textContent).toBe("");
  });

  it("never uses a filled dark or signal colour", () => {
    const { container } = render(<OwnedMark form="corner" />);
    expect(container.innerHTML).not.toMatch(/bg-zinc-900|bg-green|bg-red|bg-amber|bg-blue/);
  });
});
