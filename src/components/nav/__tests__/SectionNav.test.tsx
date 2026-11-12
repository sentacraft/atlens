// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import SectionNav from "../SectionNav";

const scrollIntoView = vi.fn();

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = scrollIntoView;
  window.scrollTo = vi.fn();
  window.history.replaceState(null, "", "/page");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  scrollIntoView.mockClear();
});

const ITEMS = [
  { id: "specs", label: "Specs" },
  { id: "reviews", label: "Reviews" },
  { id: "more", label: "More reviews" },
];

function page(ids: string[], nav: React.ReactNode) {
  return (
    <div style={{ position: "relative" }}>
      {nav}
      {ids.map((id) => (
        <section key={id} id={id}>
          {id}
        </section>
      ))}
    </div>
  );
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 120));
  });
}

describe("SectionNav", () => {
  it("lists only the sections that are on the page", async () => {
    const { container } = render(
      page(["specs", "more"], <SectionNav ariaLabel="Sections" width="detail" items={ITEMS} />),
    );
    await flush();

    // One list in the margin and one row of chips; the reviews section is not there.
    expect(container.querySelectorAll('a[href="#specs"]')).toHaveLength(2);
    expect(container.querySelectorAll('a[href="#more"]')).toHaveLength(2);
    expect(container.querySelectorAll('a[href="#reviews"]')).toHaveLength(0);
  });

  it("shows nothing when fewer than two sections are on the page", async () => {
    render(page(["specs"], <SectionNav ariaLabel="Sections" width="detail" items={ITEMS} />));
    await flush();

    expect(screen.queryAllByRole("navigation")).toHaveLength(0);
  });

  it("scrolls to a section and puts it in the URL hash", async () => {
    render(page(["specs", "reviews", "more"], <SectionNav ariaLabel="Sections" width="detail" items={ITEMS} />));
    await flush();

    fireEvent.click(screen.getAllByRole("link", { name: "Reviews", hidden: true })[0]);

    expect(scrollIntoView).toHaveBeenCalled();
    expect(window.location.hash).toBe("#reviews");
  });

  it("opens a page linked to a section", async () => {
    window.history.replaceState(null, "", "/page#more");
    render(page(["specs", "reviews", "more"], <SectionNav ariaLabel="Sections" width="detail" items={ITEMS} />));
    await flush();

    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("has a chip row only, with an all chip and counts, when the page has no margin rail", async () => {
    render(
      page(
        ["specs", "reviews"],
        <SectionNav
          ariaLabel="Sections"
          width="none"
          items={[
            { id: "specs", label: "Specs", count: 4 },
            { id: "reviews", label: "Reviews", count: 7 },
          ]}
          allItem={{ label: "All", count: 11 }}
        />,
      ),
    );
    await flush();

    expect(screen.getAllByRole("navigation")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /^All\s*11$/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /^Specs\s*4$/ })).toBeTruthy();
  });
});
