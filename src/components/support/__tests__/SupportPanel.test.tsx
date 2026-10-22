// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import SupportPanel from "../SupportPanel";

afterEach(cleanup);

// The app types messages as en.json; zh.json has the same keys with other literals.
const MESSAGES = { en, zh: zh as unknown as typeof en };

function renderPanel(locale: "en" | "zh") {
  render(
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      <SupportPanel lensCount={224} />
    </NextIntlClientProvider>,
  );
}

function tabNames(): string[] {
  return screen.getAllByRole("tab").map((tab) => tab.textContent ?? "");
}

describe("SupportPanel", () => {
  it("opens on Ko-fi on the English site, with WeChat a tab away", () => {
    renderPanel("en");

    expect(tabNames()).toEqual(["Ko-fi", en.Support.wechatTitle]);
    expect(screen.getByRole("tab", { name: "Ko-fi" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: /Support on Ko-fi/ })).toBeInTheDocument();
    expect(screen.getByText(/covers 224 lenses/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: en.Support.wechatTitle }));

    expect(screen.getByRole("img", { name: en.Support.wechatQrAlt })).toBeInTheDocument();
  });

  it("opens on the WeChat code on the Chinese site, with Ko-fi a tab away", () => {
    renderPanel("zh");

    expect(tabNames()).toEqual([zh.Support.wechatTitle, "Ko-fi"]);
    expect(screen.getByRole("tab", { name: zh.Support.wechatTitle })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("img", { name: zh.Support.wechatQrAlt })).toBeInTheDocument();
  });
});
