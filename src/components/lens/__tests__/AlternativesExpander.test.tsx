// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import AlternativesExpander from "../AlternativesExpander";

afterEach(cleanup);

describe("AlternativesExpander", () => {
  it("keeps the hidden rows in the document and marks the group expanded on click", () => {
    const { container } = render(
      <AlternativesExpander showMoreLabel="Show 3 more" showLessLabel="Show less">
        <span>Hidden lens</span>
      </AlternativesExpander>,
    );
    const group = container.firstElementChild!;

    expect(screen.getByText("Hidden lens")).toBeTruthy();
    expect(group.hasAttribute("data-expanded")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Show 3 more" }));

    expect(group.hasAttribute("data-expanded")).toBe(true);
    expect(screen.getByRole("button", { name: "Show less" }).getAttribute("aria-expanded")).toBe("true");
  });
});
