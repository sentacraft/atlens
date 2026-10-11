// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import Markdown from "../Markdown";
import { LensLinkProvider } from "../LensLinkContext";
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

// Iris writes the opaque ref; the index maps it back to the real lens.
const REF = "9q0ih";
const INDEX: LensLinkIndex = {
  [REF]: { id: "viltrox-af-35mm-f17-air-x", mount: "X" },
};

describe("Markdown lens: links", () => {
  it("renders a known lens ref as a link to its lens page", () => {
    const { container } = render(
      <LensLinkProvider index={INDEX}>
        <Markdown>
          {`See [Viltrox AF 35mm F1.7 Air](lens:${REF}) here.`}
        </Markdown>
      </LensLinkProvider>,
    );
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe(
      "/lenses/x/viltrox-af-35mm-f17-air-x",
    );
    expect(link!.textContent).toBe("Viltrox AF 35mm F1.7 Air");
    expect(link!.getAttribute("target")).toBe("_blank");
  });

  it("degrades an unknown lens ref to plain text, not a link", () => {
    const { container } = render(
      <LensLinkProvider index={INDEX}>
        <Markdown>{"This [made-up lens](lens:zzzzz) does not exist."}</Markdown>
      </LensLinkProvider>,
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
      <LensLinkProvider index={INDEX}>
        <Markdown>{"[Official site](https://example.com)"}</Markdown>
      </LensLinkProvider>,
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
      <LensLinkProvider index={index}>
        <Markdown>{table}</Markdown>
      </LensLinkProvider>,
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
      <LensLinkProvider index={index}>
        <Markdown>{table}</Markdown>
      </LensLinkProvider>,
    );
    const rows = [...container.querySelectorAll("tbody tr")].map((tr) =>
      [...tr.querySelectorAll("td")].map((td) => td.textContent),
    );
    expect(rows).toEqual(names.map((name) => [name, "ok"]));
    expect(container.querySelectorAll("tbody a")).toHaveLength(lenses.length);
  });
});
