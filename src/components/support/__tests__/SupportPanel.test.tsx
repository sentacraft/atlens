// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import SupportPanel from "../SupportPanel";

const device = vi.hoisted(() => ({ mobile: false, wechat: false }));

vi.mock("@/hooks/useViewport", () => ({
  useIsMobileDevice: () => device.mobile,
  useIsWeChatBrowser: () => device.wechat,
}));

afterEach(() => {
  cleanup();
  device.mobile = false;
  device.wechat = false;
});

// The app types messages as en.json; zh.json has the same keys with other literals.
const MESSAGES = { en, zh: zh as unknown as typeof en };

function renderPanel(locale: "en" | "zh") {
  render(
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      <SupportPanel />
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

    fireEvent.click(screen.getByRole("tab", { name: en.Support.wechatTitle }));

    expect(screen.getByRole("img", { name: en.Support.wechatQrAlt })).toBeInTheDocument();
  });

  it("opens on the WeChat code on the Chinese site, with Ko-fi a tab away", () => {
    renderPanel("zh");

    expect(tabNames()).toEqual([zh.Support.wechatTitle, "Ko-fi"]);
    expect(screen.getByRole("tab", { name: zh.Support.wechatTitle })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("img", { name: zh.Support.wechatQrAlt })).toBeInTheDocument();
  });

  it("offers no save button on a desktop", () => {
    renderPanel("zh");

    expect(screen.queryByRole("button", { name: zh.Support.wechatSave })).not.toBeInTheDocument();
    expect(screen.queryByText(zh.Support.wechatPressHint)).not.toBeInTheDocument();
  });

  it("offers to save the code in a phone browser", () => {
    device.mobile = true;
    renderPanel("zh");

    expect(screen.getByRole("button", { name: zh.Support.wechatSave })).toBeInTheDocument();
    expect(screen.getByText(zh.Support.wechatSaveHint)).toBeInTheDocument();
  });

  it("says to press and hold the code inside WeChat, with the code outside a link", () => {
    device.mobile = true;
    device.wechat = true;
    renderPanel("zh");

    expect(screen.getByText(zh.Support.wechatPressHint)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: zh.Support.wechatSave })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: zh.Support.wechatQrAlt }).closest("a")).toBeNull();
  });

  it("shows the small WebP of the code, and the full-size JPEG inside WeChat where it is pressed", () => {
    renderPanel("zh");
    expect(screen.getByRole("img", { name: zh.Support.wechatQrAlt }).getAttribute("src")).toContain("wechat-qr-425fb78f.webp");
    cleanup();

    device.mobile = true;
    device.wechat = true;
    renderPanel("zh");
    expect(screen.getByRole("img", { name: zh.Support.wechatQrAlt }).getAttribute("src")).toContain("wechat-qr.jpg");
  });
});
