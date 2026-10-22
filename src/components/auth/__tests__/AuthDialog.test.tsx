// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import AuthDialog from "../AuthDialog";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/auth-client", () => ({ authClient: {} }));

afterEach(cleanup);

function benefits() {
  return within(screen.getByRole("list")).getAllByRole("listitem").map((item) => item.textContent);
}

describe("AuthDialog", () => {
  it("titles the dialog for the action and leads with its own benefit", async () => {
    render(<AuthDialog open source="gear" onOpenChange={() => {}} />);

    expect(await screen.findByRole("heading", { name: "reasonGearTitle" })).toBeInTheDocument();
    expect(benefits()).toEqual(["benefitGear", "benefitFavorites", "benefitChats", "benefitQuota"]);
    expect(screen.getByRole("button", { name: "continueWithGoogle" })).toBeInTheDocument();
  });

  it("pitches the same benefits from a plain sign-in button, under the generic title", async () => {
    render(<AuthDialog open source="account_menu" onOpenChange={() => {}} />);

    expect(await screen.findByRole("heading", { name: "title" })).toBeInTheDocument();
    expect(benefits()).toEqual(["benefitFavorites", "benefitGear", "benefitChats", "benefitQuota"]);
  });

  it("leads with kept chats where Iris offers the sign-in", async () => {
    render(<AuthDialog open source="iris_history" onOpenChange={() => {}} />);

    expect(await screen.findByRole("heading", { name: "reasonChatsTitle" })).toBeInTheDocument();
    expect(benefits()[0]).toBe("benefitChats");
  });

  it("leads with the daily questions when a guest has run out of them", async () => {
    render(<AuthDialog open source="iris_quota" onOpenChange={() => {}} />);

    expect(await screen.findByRole("heading", { name: "reasonQuotaTitle" })).toBeInTheDocument();
    expect(benefits()[0]).toBe("benefitQuota");
  });
});
