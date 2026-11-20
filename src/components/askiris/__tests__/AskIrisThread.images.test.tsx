// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type LensImageViewer from "@/components/lens/LensImageViewer";
import type { LensDetailDisplayImage } from "@/lib/ai/lens-detail-images";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import AskIrisThread from "../AskIrisThread";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/iris/Iris", () => ({ default: () => null }));
vi.mock("@/components/askiris/Markdown", () => ({ default: ({ children }: { children: string }) => <p>{children}</p> }));
vi.mock("@/components/askiris/ResponseFeedback", () => ({ default: () => <button>Feedback</button> }));
vi.mock("@/components/lens/LensImageViewer", () => ({
  default: ({ images, initialIndex, title, onClose }: ComponentProps<typeof LensImageViewer>) => (
    <div role="dialog" aria-label={title}>
      <div>{images[initialIndex].src}</div>
      <ul>{images.map(({ src }) => <li key={src}>{src}</li>)}</ul>
      <button onClick={onClose}>Close viewer</button>
    </div>
  ),
}));

afterEach(cleanup);

const chart: LensDetailDisplayImage = {
  lensRef: "x:lens-a", lensName: "Lens A", lensId: "lens-a", mount: "X",
  imageRef: "a:001", src: "/a-mtf.png",
  image: { id: "001", role: "mtf", focalLengthMm: 35, apertureFNumbers: [1.4, 8], displayPreset: "invert-on-white", conditionsNote: "The test distance is not specified." },
};
const structure: LensDetailDisplayImage = {
  lensRef: "g:lens-b", lensName: "Lens B", lensId: "lens-b", mount: "G",
  imageRef: "b:001", src: "/b-optical.png", image: { id: "001", role: "optical-construction" },
};
const product: LensDetailDisplayImage = {
  ...chart, imageRef: "a:002", src: "/a-front.jpg", image: { id: "002", role: "product" },
};
const alternate: LensDetailDisplayImage = {
  ...product, imageRef: "a:003", src: "/a-side.jpg", image: { id: "003", role: "product" },
};

function tool(toolCallId: string, displayImages?: LensDetailDisplayImage[]): AskIrisUIMessage["parts"][number] {
  return { type: "tool-lensDetails", toolCallId, state: "output-available", input: {}, output: { displayImages } };
}

const MESSAGES = { en, zh: zh as unknown as typeof en };

function renderReply(parts: AskIrisUIMessage["parts"], locale: "en" | "zh" = "en") {
  const reply: AskIrisUIMessage = {
    id: "answer", role: "assistant", metadata: { traceId: "trace", turnId: "turn" },
    parts: [{ type: "text", text: "Answer body" }, ...parts, { type: "text", text: "Last paragraph" }],
  };
  render(
    <NextIntlClientProvider locale={locale} timeZone="UTC" messages={MESSAGES[locale]}>
      <AskIrisThread messages={[reply]} />
    </NextIntlClientProvider>,
  );
}

function expectBefore(a: Element, b: Element) {
  expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

function openImage(name: RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
  return screen.findByRole("dialog");
}

function slides(dialog: HTMLElement) {
  return within(dialog).getAllByRole("listitem").map((item) => item.textContent);
}

describe("lens images in Iris replies", () => {
  it("aggregates each tool result once by ref, after the text and before sources and feedback", async () => {
    renderReply([tool("read-a", [chart]), tool("legacy"), tool("read-b", [chart, structure])]);

    const group = screen.getByRole("region", { name: "Lens images" });
    expect(within(group).getAllByRole("img")).toHaveLength(2);
    expect(within(group).getByRole("link", { name: "Lens A" })).toHaveAttribute("href", "/lenses/x/lens-a");
    expect(within(group).getByRole("link", { name: "Lens B" })).toHaveAttribute("href", "/lenses/gfx/lens-b");
    expect(within(group).getByText("35mm · f/1.4, f/8")).toBeInTheDocument();
    expect(within(group).queryByText(/not specified/i)).not.toBeInTheDocument();
    expectBefore(screen.getByText("Last paragraph"), group);
    expectBefore(group, screen.getByText(en.AskIris.sources.title));
    expectBefore(group, screen.getByRole("button", { name: "Feedback" }));

    const dialog = await openImage(/Lens B/);
    expect(within(dialog).getAllByText("/b-optical.png")[0].tagName).toBe("DIV");
    expect(slides(dialog)).toEqual([chart.src, structure.src]);
  });

  it("expands only the selected product gallery and never adds unshown technical images", async () => {
    const unreadChart = { ...chart, imageRef: "a:099", src: "/a-unread.png" };
    renderReply([tool("read-a", [{ ...product, gallery: [product, alternate, alternate, unreadChart] }, chart]), tool("read-again", [product])], "zh");

    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getByText("共 2 张")).toBeInTheDocument();
    const technical = await openImage(/MTF/);
    expect(slides(technical)).toEqual([product.src, chart.src]);
    fireEvent.click(within(technical).getByRole("button", { name: "Close viewer" }));

    const appearance = await openImage(/外观/);
    expect(within(appearance).getAllByText(product.src)[0].tagName).toBe("DIV");
    expect(slides(appearance)).toEqual([product.src, alternate.src, chart.src]);
  });

  it.each([ ["en", "MTF charts", "Image"], ["zh", "MTF 曲线", "图"] ] as const)("numbers a multi-chart comparison in %s", (locale, title, figure) => {
    renderReply([tool("read-a", [chart, { ...chart, imageRef: "a:005", src: "/a-mtf-2.png" }])], locale);
    const group = screen.getByRole("region", { name: title });
    expect(within(group).getByText(`${figure} 1 ·`)).toBeInTheDocument();
    expect(within(group).getByText(`${figure} 2 ·`)).toBeInTheDocument();
  });

  it("renders no image controls for old results or unfinished calls", () => {
    renderReply([
      tool("legacy"),
      { type: "tool-lensDetails", toolCallId: "pending", state: "input-available", input: {} },
    ]);
    expect(screen.queryByRole("region", { name: "Lens images" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
