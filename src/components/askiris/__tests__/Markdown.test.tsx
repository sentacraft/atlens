// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import Markdown from "../Markdown";
import { ChatLinkProvider } from "../ChatLinkContext";
import { lensRef, type LensLinkIndex } from "@/lib/ai/lens-ref";
import { getAllLenses } from "@/lib/lens/data";
import { lensDisplayName } from "@/lib/lens/format";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";

vi.mock("@/i18n/navigation", () => ({
  // Mirror the locale-aware Link closely enough for href assertions.
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/analytics/analytics", () => ({
  track: vi.fn(),
}));

const openSignIn = vi.fn();
const openLensPreview = vi.fn();
vi.mock("@/hooks/useLensPreview", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/useLensPreview")>()),
  useLensPreview: () => ({ lensId: null, openLensPreview, closeLensPreview: vi.fn() }),
}));
vi.mock("@/context/SignInDialogProvider", () => ({ useSignInDialog: () => openSignIn }));
vi.mock("@/hooks/useMountParam", () => ({ useEffectiveMount: () => "X" }));
vi.mock("@/components/feedback/FeedbackTrigger", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <button type="button" data-feedback>
      {children}
    </button>
  ),
}));

// Iris writes the opaque ref; the index maps it back to the real lens.
const REF = "9q0ih";
const INDEX: LensLinkIndex = {
  [REF]: { id: "viltrox-af-35mm-f17-air-x", mount: "X" },
};

describe("Markdown lens: links", () => {
  it("renders a known lens ref as a link to its lens page", () => {
    const { container } = render(
      <ChatLinkProvider targets={{ lenses: INDEX, collections: [] }}>
        <Markdown>
          {`See [Viltrox AF 35mm F1.7 Air](lens:${REF}) here.`}
        </Markdown>
      </ChatLinkProvider>,
    );
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe(
      "/lenses/x/viltrox-af-35mm-f17-air-x",
    );
    expect(link!.textContent).toBe("Viltrox AF 35mm F1.7 Air");
    expect(link!.getAttribute("target")).toBe("_blank");
  });

  it("previews the lens on a plain click and leaves a modified click to open the full page", () => {
    const { container } = render(
      <ChatLinkProvider targets={{ lenses: INDEX, collections: [] }}>
        <Markdown>{`See [Viltrox AF 35mm F1.7 Air](lens:${REF}) here.`}</Markdown>
      </ChatLinkProvider>,
    );
    const link = container.querySelector("a")!;

    expect(fireEvent.click(link, { metaKey: true })).toBe(true);
    expect(openLensPreview).not.toHaveBeenCalled();

    expect(fireEvent.click(link)).toBe(false);
    expect(openLensPreview).toHaveBeenCalledWith("viltrox-af-35mm-f17-air-x");
  });

  it("degrades an unknown lens ref to plain text, not a link", () => {
    const { container } = render(
      <ChatLinkProvider targets={{ lenses: INDEX, collections: [] }}>
        <Markdown>{"This [made-up lens](lens:zzzzz) does not exist."}</Markdown>
      </ChatLinkProvider>,
    );
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("made-up lens");
  });

  it("degrades every lens: link to plain text outside a provider", () => {
    const { container } = render(
      <Markdown>{`[Viltrox AF 35mm F1.7 Air](lens:${REF})`}</Markdown>,
    );
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("Viltrox AF 35mm F1.7 Air");
  });

  it("leaves non-lens links as ordinary anchors", () => {
    const { container } = render(
      <ChatLinkProvider targets={{ lenses: INDEX, collections: [] }}>
        <Markdown>{"[Official site](https://example.com)"}</Markdown>
      </ChatLinkProvider>,
    );
    const link = container.querySelector("a");
    expect(link!.getAttribute("href")).toBe("https://example.com");
  });
});

describe("Markdown lens: links in tables", () => {
  it("keeps a lens name containing a pipe in one table cell", () => {
    const ref = "c01n5";
    const index: LensLinkIndex = {
      [ref]: { id: "sigma-contemporary-12mm-f14-dc-x", mount: "X" },
    };
    const table = [
      "| Lens | Weight | Price |",
      "|---|---|---|",
      `| [Sigma 12mm F1.4 DC | Contemporary](lens:${ref}) | 235g | $579 |`,
    ].join("\n");
    const { container } = render(
      <ChatLinkProvider targets={{ lenses: index, collections: [] }}>
        <Markdown>{table}</Markdown>
      </ChatLinkProvider>,
    );
    const cells = [...container.querySelectorAll("tbody td")].map((td) => td.textContent);
    expect(cells).toEqual(["Sigma 12mm F1.4 DC | Contemporary", "235g", "$579"]);
    expect(container.querySelector("tbody a")?.getAttribute("href")).toBe(
      "/lenses/x/sigma-contemporary-12mm-f14-dc-x",
    );
  });
});

describe("Markdown lens: links across the catalogue", () => {
  // Names are pipeline output, so the hazard set is whatever the data contains. Writing
  // every real name into a table cell, as the model would, turns a new Markdown-active
  // character in a future name into a CI failure instead of a broken answer.
  it.each([
    ["en", en.Brands],
    ["zh", zh.Brands],
  ] as const)("keeps every %s lens name intact in a table cell", (locale, brands) => {
    const lenses = getAllLenses(locale);
    const index: LensLinkIndex = Object.fromEntries(
      lenses.map((lens) => [lensRef(lens.id), { id: lens.id, mount: lens.mount }]),
    );
    const names = lenses.map((lens) =>
      lensDisplayName(brands[lens.brand as keyof typeof brands] ?? lens.brand, lens.series, lens.model),
    );
    const table = [
      "| Lens | Note |",
      "|---|---|",
      ...lenses.map((lens, i) => `| [${names[i]}](lens:${lensRef(lens.id)}) | ok |`),
    ].join("\n");
    const { container } = render(
      <ChatLinkProvider targets={{ lenses: index, collections: [] }}>
        <Markdown>{table}</Markdown>
      </ChatLinkProvider>,
    );
    const rows = [...container.querySelectorAll("tbody tr")].map((tr) =>
      [...tr.querySelectorAll("td")].map((td) => td.textContent),
    );
    expect(rows).toEqual(names.map((name) => [name, "ok"]));
    expect(container.querySelectorAll("tbody a")).toHaveLength(lenses.length);
  });
});

describe("Markdown chat links", () => {
  const OTHER = "c01n5";
  const GFX = "g0000";
  const TARGETS = {
    lenses: {
      ...INDEX,
      [OTHER]: { id: "sigma-contemporary-12mm-f14-dc-x", mount: "X" as const },
      [GFX]: { id: "fujifilm-gf-45mm-f28-r-wr-g", mount: "G" as const },
    },
    collections: ["pancake"],
  };
  const renderLinks = (markdown: string) =>
    render(
      <ChatLinkProvider targets={TARGETS}>
        <Markdown>{markdown}</Markdown>
      </ChatLinkProvider>,
    ).container;

  it("links a page key to its path in a new tab", () => {
    const link = renderLinks("[support](page:aboutSupport)").querySelector("a");
    expect(link!.getAttribute("href")).toBe("/about#support");
    expect(link!.getAttribute("target")).toBe("_blank");
  });

  it("links an external page key to its URL", () => {
    const link = renderLinks("[pipeline](page:readmePipeline)").querySelector("a");
    expect(link!.getAttribute("href")).toBe("https://github.com/sentacraft/atlens#data-pipeline");
  });

  it("builds a compare link from known refs", () => {
    const link = renderLinks(`[compare](compare:${REF},${OTHER})`).querySelector("a");
    expect(link!.getAttribute("href")).toBe(
      "/lenses/x/compare?ids=viltrox-af-35mm-f17-air-x,sigma-contemporary-12mm-f14-dc-x",
    );
  });

  it("links a known collection on the current mount", () => {
    const link = renderLinks("[pancakes](collection:pancake)").querySelector("a");
    expect(link!.getAttribute("href")).toBe("/lenses/x/collections/pancake");
  });

  it("opens the sign-in dialog from a sign-in action", () => {
    renderLinks("[sign in](action:signIn)").querySelector("button")!.click();
    expect(openSignIn).toHaveBeenCalledWith("iris_reply");
  });

  it("opens feedback from a feedback action", () => {
    expect(renderLinks("[tell us](action:feedback)").querySelector("[data-feedback]")).not.toBeNull();
  });

  it.each([
    ["an unknown page key", "[x](page:nowhere)"],
    ["an unknown action", "[x](action:delete)"],
    ["a compare link with an unknown ref", `[x](compare:${REF},zzzzz)`],
    ["a compare link with one lens", `[x](compare:${REF})`],
    ["a compare link across mounts", `[x](compare:${REF},${GFX})`],
    ["an unknown collection", "[x](collection:nope)"],
  ])("renders %s as plain text", (_, markdown) => {
    const container = renderLinks(markdown);
    expect(container.querySelector("a, button")).toBeNull();
    expect(container.textContent).toBe("x");
  });
});
