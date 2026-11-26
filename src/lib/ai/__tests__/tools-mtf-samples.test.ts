import { describe, expect, it, vi } from "vitest";
import { buildLensTools, type ToolData } from "../tools";
import { getLensesByMount } from "@/lib/lens/data";
import { lensRef } from "../lens-ref";

const sampled = vi.hoisted(() => ({
  axis: "image height, mm",
  series: [{ frequency: { value: 15, unit: "lines/mm" }, x: [14], curves: [{ name: "S", values: [0.64] }] }],
}));
// Every chart of every lens has readings, so what reaches the model shows which charts were asked about.
vi.mock("@/lib/lens/mtf-samples", () => ({ getMtfSamples: () => sampled }));

const GUEST: ToolData = { favorites: async () => null, gear: async () => ({ known: false, reason: "guest" }), reviews: async () => new Map() };
const lens = getLensesByMount("X", "en").find((candidate) =>
  (candidate.images ?? []).filter((image) => image.role === "mtf").length > 1
  && (candidate.images ?? []).some((image) => image.role === "optical-construction"))!;
const ref = lensRef(lens.id);
const tool = buildLensTools("X", "en", (brand) => brand, GUEST, new Set([ref])).showLensImages;

async function show(images: { role: "mtf" | "optical-construction"; imageRef?: string }[]) {
  const input = { lenses: [{ ref, images }] };
  const output = await tool.execute!(input, {} as never);
  const projected = await tool.toModelOutput!({ toolCallId: "images", input, output: output as never });
  const text = projected.type === "content" && projected.value[0].type === "text" ? projected.value[0].text : "";
  return { output, reading: JSON.parse(text) };
}

describe("showLensImages MTF samples", () => {
  it("gives the model readings for the shown charts only, and leaves them out of the tool output", async () => {
    const chart = `${ref}:image-${lens.images!.find((image) => image.role === "mtf")!.id}`;
    const { output, reading } = await show([{ role: "mtf", imageRef: chart }]);
    expect(reading.mtfSamples).toEqual({ [chart]: sampled });
    expect(reading.mtfSamplesNote).toContain("approximate");
    expect(JSON.stringify(output)).not.toContain("curves");
  });

  it("adds nothing when no chart is shown", async () => {
    const { reading } = await show([{ role: "optical-construction" }]);
    expect(reading).not.toHaveProperty("mtfSamples");
    expect(reading).not.toHaveProperty("mtfSamplesNote");
  });
});
