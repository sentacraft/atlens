// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";
import { migrated } from "@/lib/askiris/__tests__/support/legacy-lens-details";
import zh from "@/messages/zh.json";
import AskIrisThread from "../AskIrisThread";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/iris/Iris", () => ({ default: () => null }));
vi.mock("@/components/askiris/Markdown", () => ({ default: ({ children }: { children: string }) => <p>{children}</p> }));
vi.mock("@/components/askiris/ResponseFeedback", () => ({ default: () => null }));

afterEach(cleanup);

it("renders the images of a migrated legacy reply with their figure labels, in place", () => {
  const message = migrated() as AskIrisUIMessage;
  render(
    <NextIntlClientProvider locale="zh" timeZone="UTC" messages={zh as never}>
      <AskIrisThread messages={[message]} />
    </NextIntlClientProvider>,
  );
  expect(screen.getAllByRole("img")).toHaveLength(3);
  for (const label of ["图 1", "图 2", "图 3"]) {
    expect(screen.getByText(label)).toBeInTheDocument();
  }
  const [first] = screen.getAllByRole("img");
  expect(screen.getByText("Here you go").compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
