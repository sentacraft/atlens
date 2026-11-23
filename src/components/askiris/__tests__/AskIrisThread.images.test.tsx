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
const second: LensDetailDisplayImage = {
  ...chart, imageRef: "a:002", src: "/a-mtf-2.png", image: { ...chart.image, id: "002", apertureFNumbers: [1.4], conditionsNote: undefined },
};
const third: LensDetailDisplayImage = { ...chart, imageRef: "a:003", src: "/a-mtf-3.png", image: { ...chart.image, id: "003", focalLengthMm: 50 } };
const numbered = (entries: LensDetailDisplayImage[], from: number, locale: "en" | "zh" = "en") =>
  entries.map((entry, i) => ({ ...entry, figure: from + i, figureLabel: locale === "en" ? `Fig. ${from + i}` : `图 ${from + i}` }));

function tool(toolCallId: string, displayImages?: LensDetailDisplayImage[], type: "tool-showLensImages" | "tool-lensDetails" = "tool-showLensImages"): AskIrisUIMessage["parts"][number] {
  return { type, toolCallId, state: "output-available", input: {}, output: { displayImages } } as AskIrisUIMessage["parts"][number];
}

const MESSAGES = { en, zh: zh as unknown as typeof en };
const text = (value: string): AskIrisUIMessage["parts"][number] => ({ type: "text", text: value });

function renderParts(parts: AskIrisUIMessage["parts"], { locale = "en", busy = false }: { locale?: "en" | "zh"; busy?: boolean } = {}) {
  const reply: AskIrisUIMessage = { id: "answer", role: "assistant", metadata: { traceId: "trace", turnId: "turn" }, parts };
  return render(
    <NextIntlClientProvider locale={locale} timeZone="UTC" messages={MESSAGES[locale]}>
      <AskIrisThread messages={[reply]} busy={busy} />
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
  it("renders the images where their tool part is, between the texts around it", () => {
    renderParts([text("Before"), tool("a", numbered([chart, second], 1)), text("After")]);
    const group = screen.getByRole("region", { name: /MTF/ });
    expectBefore(screen.getByText("Before"), group);
    expectBefore(group, screen.getByText("After"));
    expect(within(group).getAllByRole("img")).toHaveLength(2);
    expect(within(group).getByRole("link", { name: "Lens A" })).toHaveAttribute("href", "/lenses/x/lens-a");
  });

  it("renders them while the reply is still streaming", () => {
    renderParts([text("Before"), tool("a", numbered([chart], 1))], { busy: true });
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("gives every image its own tile with its figure label and conditions, numbered across calls", () => {
    renderParts([tool("a", numbered([chart, second], 1)), text("Between"), tool("b", numbered([structure, third], 3))]);
    for (const label of ["Fig. 1", "Fig. 2", "Fig. 3", "Fig. 4"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("img")).toHaveLength(4);
    expect(screen.getByText("35mm · f/1.4, f/8")).toBeInTheDocument();
    expectBefore(screen.getByText("Fig. 2"), screen.getByText("Between"));
    expectBefore(screen.getByText("Between"), screen.getByText("Fig. 3"));
  });

  it("opens the viewer at the clicked tile and steps through every image of that call", async () => {
    renderParts([tool("a", numbered([chart, second, third], 1))]);
    const dialog = await openImage(/Fig\. 3/);
    expect(within(dialog).getAllByText(third.src)[0].tagName).toBe("DIV");
    expect(slides(dialog)).toEqual([chart.src, second.src, third.src]);
  });

  it("labels figures in the reply's locale", () => {
    renderParts([tool("a", numbered([chart], 1, "zh"))], { locale: "zh" });
    expect(screen.getByText("图 1")).toBeInTheDocument();
  });

  it("still renders images saved in the retired lensDetails output, without figure labels", () => {
    renderParts([text("Before"), tool("saved", [chart, structure], "tool-lensDetails"), text("After")]);
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.queryByText(/Fig\./)).not.toBeInTheDocument();
    expectBefore(screen.getByText("Before"), screen.getAllByRole("img")[0]);
    expectBefore(screen.getAllByRole("img")[1], screen.getByText("After"));
  });

  it("renders no image controls for old results or unfinished calls", () => {
    renderParts([
      tool("legacy"),
      { type: "tool-showLensImages", toolCallId: "pending", state: "input-available", input: {} },
    ]);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
