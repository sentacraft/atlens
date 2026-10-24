// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import SignInBenefits from "../SignInBenefits";

afterEach(cleanup);

describe("SignInBenefits", () => {
  it("tags Iris as AI wherever a benefit names it", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SignInBenefits source="account_menu" />
      </NextIntlClientProvider>,
    );
    const items = screen.getAllByRole("listitem");
    const naming = items.filter((item) => item.textContent?.includes("Iris"));
    expect(naming).toHaveLength(3);
    for (const item of naming) {
      expect(within(item).getByText("AI")).toBeTruthy();
    }
    expect(items.filter((item) => !item.textContent?.includes("Iris")).every((item) => !within(item).queryByText("AI"))).toBe(true);
  });
});
