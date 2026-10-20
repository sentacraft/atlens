// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Card from "../AnalyticsCard";
import { BreakdownTree, Funnel } from "../Breakdown";
import type { BreakdownNode } from "@/lib/analytics/breakdown";

afterEach(cleanup);

const leaf = (label: string, count: number): BreakdownNode => ({ value: label, label, count, children: [] });

const HOME: BreakdownNode = {
  value: "home",
  label: "Home",
  count: 5,
  children: [{ value: "need", label: "Find a lens", count: 2, children: [leaf("Deep", 2)] }, leaf("Typed a question", 3)],
};

describe("BreakdownTree", () => {
  it("opens the first level, keeps deeper levels closed, and toggles a row", () => {
    render(<BreakdownTree nodes={[HOME, leaf("Lens page", 5)]} unit="Opens" />);

    expect(screen.getByText("Find a lens")).toBeTruthy();
    expect(screen.queryByText("Deep")).toBeNull();
    expect(screen.getAllByText("50%")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Find a lens" }));
    expect(screen.getByText("Deep")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(screen.queryByText("Find a lens")).toBeNull();
  });
});

describe("Funnel", () => {
  it("shows each nested step's share of the step above and opens its breakdown", () => {
    render(
      <Funnel
        steps={[
          { label: "All visitors", count: 20, breakdown: [] },
          { label: "Opened Iris", count: 5, breakdown: [HOME] },
        ]}
        unit="Unique visitors"
        nested
        previous={null}
      />,
    );

    expect(screen.getByText(/25% of the step above/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Opened Iris" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.queryByText("Find a lens")).toBeNull();
  });
});

describe("Card", () => {
  it("shows its definitions only when the info button is pressed", () => {
    render(
      <Card title="Opens" info={<p>What an open is</p>}>
        <p>body</p>
      </Card>,
    );

    expect(screen.queryByText("What an open is")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "What Opens means" }));
    expect(screen.getByText("What an open is")).toBeTruthy();
  });
});
