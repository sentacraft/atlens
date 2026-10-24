// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import AuthDialog from "../AuthDialog";

const social = vi.hoisted(() => vi.fn(async () => ({})));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { provider?: string }) => (values?.provider ? `${key} ${values.provider}` : key),
}));
vi.mock("@/lib/auth-client", () => ({ authClient: { signIn: { social } } }));
vi.mock("@/lib/analytics/analytics", () => ({ track: vi.fn() }));

afterEach(cleanup);

function benefits() {
  return within(screen.getByRole("list")).getAllByRole("listitem").map((item) => item.textContent);
}

describe("AuthDialog", () => {
  it("titles the dialog for the action and leads with its own benefit", async () => {
    render(<AuthDialog open source="gear" onOpenChange={() => {}} />);

    expect(await screen.findByRole("heading", { name: "reasonGearTitle" })).toBeInTheDocument();
    expect(benefits()).toEqual(["benefitGear", "benefitFavorites", "benefitChats", "benefitQuota", "benefitReviews"]);
  });

  it("offers Google and GitHub side by side and signs in with the one pressed", async () => {
    render(<AuthDialog open source="account_menu" onOpenChange={() => {}} />);

    expect(await screen.findByRole("button", { name: "continueWith Google" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "continueWith GitHub" }));

    expect(social).toHaveBeenCalledWith(expect.objectContaining({ provider: "github" }));
  });

  it("pitches the same benefits from a plain sign-in button, under the generic title", async () => {
    render(<AuthDialog open source="account_menu" onOpenChange={() => {}} />);

    expect(await screen.findByRole("heading", { name: "title" })).toBeInTheDocument();
    expect(benefits()).toEqual(["benefitFavorites", "benefitGear", "benefitChats", "benefitQuota", "benefitReviews"]);
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

  it("leads with the full review findings when a guest asks for them", async () => {
    render(<AuthDialog open source="reviews" onOpenChange={() => {}} />);

    expect(await screen.findByRole("heading", { name: "reasonReviewsTitle" })).toBeInTheDocument();
    expect(benefits()[0]).toBe("benefitReviews");
  });
});
