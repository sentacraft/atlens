// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import { WECHAT_QR_DISPLAY_SRC } from "@/lib/support";
import { SupportDialogProvider } from "../SupportDialogProvider";

const MESSAGES = { en, zh: zh as unknown as typeof en };
const loaded: string[] = [];

beforeEach(() => {
  loaded.length = 0;
  vi.stubGlobal(
    "Image",
    class {
      set src(value: string) {
        loaded.push(value);
      }
    },
  );
  vi.stubGlobal("requestIdleCallback", (callback: () => void) => {
    callback();
    return 1;
  });
  vi.stubGlobal("cancelIdleCallback", () => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderProvider(locale: "en" | "zh") {
  render(
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      <SupportDialogProvider>
        <p>page</p>
      </SupportDialogProvider>
    </NextIntlClientProvider>,
  );
}

describe("SupportDialogProvider", () => {
  it("fetches the WeChat code when idle where the dialog opens on it", () => {
    renderProvider("zh");

    expect(loaded).toEqual([WECHAT_QR_DISPLAY_SRC]);
  });

  it("leaves it alone where the dialog opens on Ko-fi", () => {
    renderProvider("en");

    expect(loaded).toEqual([]);
  });
});
