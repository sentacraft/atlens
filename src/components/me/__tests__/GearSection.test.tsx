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

  it("shows empty states and no chart without gear", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ gear: [] })));

    renderSection();

    expect(await screen.findByText("noBodies")).toBeInTheDocument();
    expect(screen.getByText("noLenses")).toBeInTheDocument();
    expect(screen.queryByText("coverageTitle")).toBeNull();
  });

  it("marks owned bodies in the add dialog and adds a new one", async () => {
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? new Response(JSON.stringify({ gear: gear[0] }), { status: 201 })
        : new Response(JSON.stringify({ gear })),
    );

    renderSection();
    await screen.findByText("X-T5");
    fireEvent.click(screen.getByRole("button", { name: /addBody/ }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByPlaceholderText("searchBodies"), { target: { value: "x-t5" } });

    const ownedRow = within(dialog).getByText("X-T5").closest("li")!;
    expect(within(ownedRow).getByRole("button", { name: "owned" })).toBeDisabled();

    fireEvent.change(within(dialog).getByPlaceholderText("searchBodies"), { target: { value: "x-h2s" } });
    fireEvent.click(within(within(dialog).getByText("X-H2S").closest("li")!).getByRole("button", { name: "add" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/me/gear",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ kind: "body", catalogId: "fujifilm-x-h2s" }) }),
      ),
    );
  });
});
