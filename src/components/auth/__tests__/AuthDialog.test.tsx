// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import AuthDialog from "../AuthDialog";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/auth-client", () => ({ authClient: {} }));

afterEach(cleanup);

describe("AuthDialog", () => {
  it("leads with the action's own benefit when opened for a reason", async () => {
    render(<AuthDialog open reason="gear" onOpenChange={() => {}} />);

    expect(await screen.findByRole("heading", { name: "reasonGearTitle" })).toBeInTheDocument();
    const benefits = within(screen.getByRole("list")).getAllByRole("listitem").map((item) => item.textContent);
    expect(benefits).toEqual(["benefitGear", "benefitFavorites", "benefitSync"]);
    expect(screen.getByRole("button", { name: "continueWithGoogle" })).toBeInTheDocument();
  });

  it("keeps the generic title without a reason", async () => {
    render(<AuthDialog open onOpenChange={() => {}} />);

    expect(await screen.findByRole("heading", { name: "title" })).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
