// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import ReplyActionBar from "../ReplyActionBar";
import ReviewSearchChip from "../ReviewSearchChip";
import { ChatLinkProvider } from "../ChatLinkContext";
import type { LensLinkIndex } from "@/lib/ai/lens-ref";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";

let isDesktopViewport = true;

vi.mock("@/hooks/useViewport", () => ({
  useBreakpoint: () => isDesktopViewport,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode; prefetch?: boolean }) => {
    const props = { ...rest };
    delete props.prefetch;
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

vi.mock("@/lib/analytics/analytics", () => ({
  track: vi.fn(),
}));

const REF_A = "9q0ih";
const REF_B = "c01n5";
const REF_C = "k3x9q";

const LENSES: LensLinkIndex = {
  [REF_A]: { id: "viltrox-af-35mm-f17-air-x", mount: "X", name: "Viltrox AF 35mm F1.7 Air", review: { en: "Viltrox AF 35mm f1.7 Air", zh: "唯卓仕 35mm F1.7" } },
  [REF_B]: { id: "sigma-contemporary-12mm-f14-dc-x", mount: "X", name: "Sigma 12mm F1.4 DC", review: { en: "Sigma 12mm f1.4", zh: "适马 12mm F1.4" } },
  [REF_C]: { id: "fujifilm-xf-23mm-f2-r-wr-x", mount: "X", name: "Fujifilm XF 23mm F2 R WR", review: { en: "Fujifilm XF 23mm f2", zh: "富士 XF 23mm F2" } },
};

afterEach(cleanup);

describe("ReplyActionBar", () => {
  it("renders fixed-copy review and compare action pills in English and Chinese", () => {
    isDesktopViewport = true;
    const { rerender } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ChatLinkProvider targets={{ lenses: LENSES, collections: [], brands: [] }}>
          <ReplyActionBar
            actions={[
              { kind: "reviews", refs: [REF_A, REF_B, REF_C] },
              { kind: "compare", refs: [REF_A, REF_B] },
            ]}
          />
        </ChatLinkProvider>
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("button", { name: "Reviews & samples (3)" })).toBeInTheDocument();
    const compare = screen.getByRole("link", { name: "Compare 2 lenses" });
    expect(compare).toHaveAttribute(
      "href",
      "/lenses/x/compare?ids=viltrox-af-35mm-f17-air-x,sigma-contemporary-12mm-f14-dc-x",
    );

    rerender(
      <NextIntlClientProvider locale="zh" messages={zh as never}>
        <ChatLinkProvider targets={{ lenses: LENSES, collections: [], brands: [] }}>
          <ReplyActionBar actions={[{ kind: "reviews", refs: [REF_A] }, { kind: "compare", refs: [REF_A, REF_B, REF_C] }]} />
        </ChatLinkProvider>
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("button", { name: "看评测和样张" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "对比这 3 支" })).toBeInTheDocument();
  });

  it("disambiguates labels when multiple actions of the same kind appear in one reply", () => {
    isDesktopViewport = true;
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ChatLinkProvider targets={{ lenses: LENSES, collections: [], brands: [] }}>
          <ReplyActionBar
            actions={[
              { kind: "compare", refs: [REF_A, REF_B] },
              { kind: "compare", refs: [REF_A, REF_C] },
              { kind: "reviews", refs: [REF_A] },
              { kind: "reviews", refs: [REF_B] },
            ]}
          />
        </ChatLinkProvider>
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("link", { name: "Compare 2 lenses: Viltrox AF 35mm F1.7 Air, Sigma 12mm F1.4 DC" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Compare 2 lenses: Viltrox AF 35mm F1.7 Air, Fujifilm XF 23mm F2 R WR" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reviews & samples: Viltrox AF 35mm F1.7 Air" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reviews & samples: Sigma 12mm F1.4 DC" })).toBeInTheDocument();
  });
});

describe("ReviewSearchChip responsive layouts", () => {
  it("renders all lenses with compact inline platform pills on desktop", () => {
    isDesktopViewport = true;
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ReviewSearchChip
          lenses={[LENSES[REF_A], LENSES[REF_B]]}
          className="btn"
          iconClassName="ico"
          iconPosition="leading"
        >
          Reviews &amp; samples (2)
        </ReviewSearchChip>
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reviews & samples (2)" }));
    const searches = [...document.body.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')].map((a) => a.href);
    expect(searches.filter((href) => href.includes("youtube.com"))).toEqual([
      "https://www.youtube.com/results?search_query=Viltrox%20AF%2035mm%20f1.7%20Air%20review",
      "https://www.youtube.com/results?search_query=Sigma%2012mm%20f1.4%20review",
    ]);
    expect(document.body.textContent).toContain("Viltrox AF 35mm F1.7 Air");
    expect(document.body.textContent).toContain("Sigma 12mm F1.4 DC");
  });

  it("renders a lens card switcher with the active lens full name above a single platform list on mobile", () => {
    isDesktopViewport = false;
    const apd = { id: "fujifilm-xf-56mm-f12-r-apd-x", mount: "X" as const, name: "Fujifilm XF 56mm F1.2 R APD", review: { en: "XF 56mm f1.2 APD", zh: "富士 XF 56mm F1.2 APD" } };
    const wr = { id: "fujifilm-xf-56mm-f12-r-wr-x", mount: "X" as const, name: "Fujifilm XF 56mm F1.2 R WR", review: { en: "XF 56mm f1.2 WR", zh: "富士 XF 56mm F1.2 WR" } };

    render(
      <NextIntlClientProvider locale="zh" messages={zh as never}>
        <ReviewSearchChip
          lenses={[apd, wr, LENSES[REF_C]]}
          className="btn"
          iconClassName="ico"
          iconPosition="leading"
        >
          看评测和样张（3）
        </ReviewSearchChip>
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "看评测和样张（3）" }));
    const firstTab = screen.getByRole("button", { name: "Fujifilm XF 56mm F1.2 R APD" });
    const secondTab = screen.getByRole("button", { name: "Fujifilm XF 56mm F1.2 R WR" });
    expect(firstTab).toHaveAttribute("aria-pressed", "true");
    expect(secondTab).toHaveAttribute("aria-pressed", "false");

    const activeSection = screen.getByRole("region", { name: "Fujifilm XF 56mm F1.2 R APD" });
    expect(activeSection.querySelector("p")?.textContent).toBe("Fujifilm XF 56mm F1.2 R APD");

    // Only one lens's 4 links render at a time.
    const initialLinks = [...document.body.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')];
    expect(initialLinks).toHaveLength(4);
    expect(initialLinks[0].href).toContain(encodeURIComponent("富士 XF 56mm F1.2 APD"));

    fireEvent.click(secondTab);
    expect(secondTab).toHaveAttribute("aria-pressed", "true");
    const updatedSection = screen.getByRole("region", { name: "Fujifilm XF 56mm F1.2 R WR" });
    expect(updatedSection.querySelector("p")?.textContent).toBe("Fujifilm XF 56mm F1.2 R WR");
    const updatedLinks = [...document.body.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')];
    expect(updatedLinks).toHaveLength(4);
    expect(updatedLinks[0].href).toContain(encodeURIComponent("富士 XF 56mm F1.2 WR"));
  });

  it("omits the mobile lens switcher when only one lens is passed", () => {
    isDesktopViewport = false;
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ReviewSearchChip
          lenses={[LENSES[REF_A]]}
          className="btn"
          iconClassName="ico"
          iconPosition="leading"
        >
          Reviews &amp; samples
        </ReviewSearchChip>
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reviews & samples" }));
    expect(screen.queryByRole("button", { name: "Viltrox AF 35mm F1.7 Air" })).toBeNull();
    expect(document.body.querySelectorAll('a[target="_blank"]')).toHaveLength(4);
  });
});
