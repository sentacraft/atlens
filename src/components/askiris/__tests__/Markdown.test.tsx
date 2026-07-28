// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import Markdown, { type LensLinkIndex } from "../Markdown";

vi.mock("@/i18n/navigation", () => ({
  // Mirror the locale-aware Link closely enough for href assertions.
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
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
const INDEX: LensLinkIndex = { [REF]: { id: "viltrox-af-35mm-f17-air-x", mount: "X" } };

describe("Markdown lens: links", () => {
  it("renders a known lens ref as a link to its lens page", () => {
    const { container } = render(
      <Markdown lensIndex={INDEX}>
        {`看看 [唯卓仕 AF 35mm F1.7 Air](lens:${REF}) 这只。`}
      </Markdown>,
    );
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe("/lenses/x/viltrox-af-35mm-f17-air-x");
    expect(link!.textContent).toBe("唯卓仕 AF 35mm F1.7 Air");
    expect(link!.getAttribute("target")).toBe("_blank");
  });

  it("degrades an unknown lens ref to plain text, not a link", () => {
    const { container } = render(
      <Markdown lensIndex={INDEX}>{"这只 [幻觉镜头](lens:zzzzz) 不存在。"}</Markdown>,
    );
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("幻觉镜头");
  });

  it("degrades every lens: link to plain text when no index is supplied", () => {
    const { container } = render(
      <Markdown>{`[唯卓仕 AF 35mm F1.7 Air](lens:${REF})`}</Markdown>,
    );
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("唯卓仕 AF 35mm F1.7 Air");
  });

  it("leaves non-lens links as ordinary anchors", () => {
    const { container } = render(
      <Markdown lensIndex={INDEX}>{"[官网](https://example.com)"}</Markdown>,
    );
    const link = container.querySelector("a");
    expect(link!.getAttribute("href")).toBe("https://example.com");
  });
});
