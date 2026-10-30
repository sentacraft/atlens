// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import GearSection from "../GearSection";
import type { LensSummary } from "@/lib/lens/data";

vi.mock("next-intl", () => {
  const t = (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${Object.values(values).join(",")}` : key;
  t.has = () => true;
  return { useTranslations: () => t, useLocale: () => "en" };
});
vi.mock("@/context/MountPreferenceProvider", () => ({
  useMountPreference: () => ({ preference: "X" }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}));
vi.mock("@/components/browse/LensSearchDialog", () => ({ default: () => null }));
vi.mock("@/components/me/ManualLensDialog", () => ({ default: () => null }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const lenses: LensSummary[] = [
  { id: "xf-18-55", brand: "fujifilm", series: "XF", model: "XF 18-55mm", mount: "X", focalLengthMin: 18, focalLengthMax: 55, maxAperture: [2.8, 4] },
];

const gear = [
  { id: "g1", kind: "body", catalogId: "fujifilm-x-t5", name: "X-T5", brand: "fujifilm", mount: "X", createdAt: 1 },
  { id: "g2", kind: "lens", catalogId: "xf-18-55", name: "XF 18-55mm", brand: "fujifilm", mount: "X", createdAt: 2 },
  {
    id: "g3",
    kind: "lens",
    name: "44-2 58mm F2",
    brand: "Helios",
    mount: "X",
    manual: { brand: "Helios", model: "44-2 58mm F2", mount: "X", focalMinMm: 58, focalMaxMm: 58, adapted: true, originalMount: "M42" },
    createdAt: 3,
  },
];

const fetchMock = vi.fn();

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <GearSection id="gear" className="" userId="u1" lenses={lenses} heading={null} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("GearSection", () => {
  it("lists bodies and lenses with their equivalents, marking manual entries", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ gear })));

    renderSection();

    expect(await screen.findByText("X-T5")).toBeInTheDocument();
    expect(screen.getAllByText("equivalent 27–83mm").length).toBeGreaterThan(0);
    expect(screen.getAllByText("equivalent 87mm").length).toBeGreaterThan(0);
    expect(screen.getAllByText("manualBadge · adaptedBadge M42").length).toBeGreaterThan(0);
    expect(screen.getByText("coverageTitle")).toBeInTheDocument();
  });

  it("links catalog lenses to their detail page and leaves manual ones plain", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ gear })));

    renderSection();

    expect((await screen.findAllByText("XF 18-55mm"))[0].closest("a")).toHaveAttribute("href", "/lenses/x/xf-18-55");
    expect(screen.getAllByText("44-2 58mm F2")[0].closest("a")).toBeNull();
    expect(screen.getAllByText("X-T5")[0].closest("a")).toBeNull();
  });

  it("shows empty states and no chart without gear", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ gear: [] })));

    renderSection();

    expect(await screen.findByText("noBodies")).toBeInTheDocument();
    expect(screen.getByText("noLenses")).toBeInTheDocument();
    expect(screen.queryByText("coverageTitle")).toBeNull();
  });

  // The profile flashed "No bodies yet" and "Bodies · 0" for a moment before the gear arrived.
  it("shows placeholders, not empty states, while the gear loads", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    renderSection();

    expect(screen.queryByText("noBodies")).toBeNull();
    expect(screen.queryByText("noLenses")).toBeNull();
    expect(screen.queryByText("bodies · 0")).toBeNull();
    expect(screen.getAllByTestId("gear-loading")).toHaveLength(2);
  });

  it("adds the selected bodies in one go, with owned ones shown but not selectable", async () => {
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? new Response(JSON.stringify({ gear: gear[0] }), { status: 201 })
        : new Response(JSON.stringify({ gear })),
    );

    renderSection();
    await screen.findAllByText("X-T5");
    fireEvent.click(screen.getByRole("button", { name: /addBody/ }));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByRole("button", { name: "X-T5 owned" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "add" })).toBeDisabled();

    fireEvent.click(within(dialog).getByRole("button", { name: "X-S20" }));
    fireEvent.click(within(dialog).getByRole("radio", { name: "gfxCaption" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "GFX100 II" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "addCount 2" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    for (const catalogId of ["fujifilm-x-s20", "fujifilm-gfx100-ii"]) {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/me/gear",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ kind: "body", catalogId }) }),
      );
    }
  });
});
