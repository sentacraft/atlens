// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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

function channelOrder(): string[] {
  const kofi = screen.getByRole("link", { name: /Ko-fi/ });
  const wechat = screen.getByRole("img");
  return kofi.compareDocumentPosition(wechat) & Node.DOCUMENT_POSITION_FOLLOWING ? ["kofi", "wechat"] : ["wechat", "kofi"];
}

describe("SupportPanel", () => {
  it("leads with Ko-fi on the English site", () => {
    renderPanel("en");

    expect(channelOrder()).toEqual(["kofi", "wechat"]);
    expect(screen.getByRole("link", { name: /Support on Ko-fi/ })).toHaveClass("bg-zinc-900");
    expect(screen.getByText(/covers 224 lenses/)).toBeInTheDocument();
  });

  it("leads with the WeChat code on the Chinese site, and keeps Ko-fi for visitors abroad", () => {
    renderPanel("zh");

    expect(channelOrder()).toEqual(["wechat", "kofi"]);
    expect(screen.getByRole("img", { name: zh.Support.wechatQrAlt })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ko-fi/ })).not.toHaveClass("bg-zinc-900");
  });
});
