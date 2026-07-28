// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import Markdown from "../Markdown";
import { LensLinkProvider } from "../LensLinkContext";
import type { LensLinkIndex } from "@/lib/ai/lens-ref";

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
