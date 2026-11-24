import { describe, it, expect } from "vitest";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import { systemPrompt } from "../system-prompt";
import { convertToModelMessages, type UIMessage } from "ai";
import { buildLensTools, countShownFigures, type ToolData, seedRecalledRefs } from "../tools";
import { getLensesByMount } from "@/lib/lens/data";
import { lensRef, sourceRef } from "../lens-ref";

const GUEST: ToolData = { favorites: async () => null, gear: async () => ({ known: false, reason: "guest" }), reviews: async () => new Map() };

const tools = buildLensTools("X", "zh", (brand) => brand, GUEST, new Set());

// The AI SDK types `execute` as optional and passes call options every tool here ignores.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const run = (tool: { execute?: (...args: any[]) => any }, input: unknown) =>
  tool.execute!(input, {} as never);

describe("readSpecGuide", () => {
  it("exposes the guide directly, without the old document selector", () => {
    expect(tools).toHaveProperty("readSpecGuide");
    expect(tools).not.toHaveProperty("skill");
    expect(tools.readSpecGuide.description).toContain("Atlens spec fields and lens model names");
  });

  it.each([
    ["zh", zh.LensDetail.focusMotor],
    ["en", en.LensDetail.focusMotor],
  ])("returns the unchanged guide with %s UI labels on demand", async (locale, label) => {
    const localized = buildLensTools("X", locale, (brand) => brand, GUEST, new Set());
    const { text } = await run(localized.readSpecGuide, {});
    expect(text).toContain("# Reading Atlens specs and lens names");
    expect(text).toContain(`"${label}"`);
    expect(text).toContain('"-" means the manufacturer has not published that spec');
    expect(text).toContain('"N/A" means the spec does not apply');
    expect(text).toContain("## Reading lens model names");
    expect(text).not.toMatch(/\{\w+\.\w+\}/);
    expect(systemPrompt("X", locale)).not.toContain(text);
    expect(systemPrompt("X", locale)).not.toContain("## Spec page conventions");
  });
});

// Walk a tool payload for the raw catalogue id. Ids are patterned (brand-model slugs), so
// one in context is enough for a model to guess others and cite a lens it never recalled —
// which is the whole reason refs exist.
function idsIn(node: unknown, path: string, found: string[]): void {
  if (Array.isArray(node)) {
    node.forEach((item, i) => idsIn(item, `${path}[${i}]`, found));
    return;
  }
  if (!node || typeof node !== "object") {
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "id") {
      found.push(`${path}.id = ${String(value)}`);
    }
    idsIn(value, `${path}.${key}`, found);
  }
}

// The gate and the payload are two readings of the same question — "what did this call
// surface?" — so they have to come from one place. searchLensByName used to answer it
// twice, hashing the id for the gate and again inside the projection for the payload.
describe("a recall tool's gate accepts exactly what it returned", () => {
  it.each([
    [
      "queryLenses",
      { queries: [{ type: "prime" }] },
      (out: { results: { matches: { ref: string }[] }[] }) => out.results[0].matches,
    ],
    ["searchLensByName", { queries: ["35"] }, (out: { results: { matches: { ref: string }[] }[] }) => out.results[0].matches],
  ])("%s", async (name, input, pick) => {
    const tools = buildLensTools("X", "zh", (brand) => brand, GUEST, new Set());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refs = pick(await run((tools as any)[name], input)).map((lens) => lens.ref);
    expect(refs.length).toBeGreaterThan(0);

    // lensDetails throws on a ref the turn never recalled, so resolving every one of
    // them is the gate asserting it holds what the payload advertised.
    const details = await run(tools.lensDetails, { lenses: refs.slice(0, 6).map((ref) => ({ ref })) });
    expect(details.lenses.map((lens: { ref: string }) => lens.ref)).toEqual(refs.slice(0, 6));
  });
});

describe("showLensImages", () => {
  const ref = lensRef("sgimage-af-35mmf14-x");
  const unknownRef = lensRef("brightinstar-mf-35mm-f14-x");
  const imageTool = () => buildLensTools("X", "en", (brand) => brand, GUEST, new Set([ref, unknownRef])).showLensImages;

  it("keeps lensDetails to specs: no images input and no image output", () => {
    const lookup = buildLensTools("X", "en", (brand) => brand, GUEST, new Set([ref]));
    const output = run(lookup.lensDetails, { lenses: [{ ref, images: [{ role: "mtf" }] }] });
    expect(output).not.toHaveProperty("displayImages");
    expect(output).not.toHaveProperty("readRefs");
    expect(output.lenses[0]).not.toHaveProperty("images");
    expect(JSON.stringify(lookup.lensDetails.inputSchema)).not.toContain("images");
  });

  it("sends the pixels of every displayed image to the model", async () => {
    const input = { lenses: [
      { ref, images: [{ role: "mtf" as const, apertureFNumber: 1.4 }, { role: "optical-construction" as const }] },
      { ref: unknownRef, images: [] },
    ] };
    const tool = imageTool();
    const output = await tool.execute!(input, {} as never);
    if (!("displayImages" in output)) {throw new Error("Expected a synchronous result");}
    expect(output).not.toHaveProperty("readRefs");
    expect(output.displayImages.map(({ lensRef, image }) => [lensRef, image.role])).toEqual([[ref, "mtf"], [ref, "optical-construction"]]);
    const projected = await tool.toModelOutput!({ toolCallId: "images", input, output });
    if (projected.type !== "content") {throw new Error("Expected vision content");}
    const summary = projected.value[0];
    if (summary.type !== "text") {throw new Error("Expected image metadata before pixels");}
    expect(JSON.parse(summary.text)).toMatchObject({
      presentation: { galleries: output.displayImages.map(({ lensRef, imageRef, image }) => ({
        lensRef, role: image.role, preview: imageRef, imageCount: 1,
      })) },
      imagesForReading: output.displayImages.map(({ imageRef }) => imageRef),
      mtfNote: expect.stringContaining("Interpret only legible curves"),
    });
    expect(projected.value.filter((part) => part.type === "file")).toEqual(output.displayImages.map(({ src }) => expect.objectContaining({
      data: { type: "url", url: new URL(src) }, providerOptions: { deepseek: { imageDetail: "original" }, openai: { imageDetail: "high" } },
    })));
  });

  it("shows and reads every product photo of a requested lens", () => {
    const output = run(imageTool(), { lenses: [{ ref, images: [{ role: "product" }] }] });
    expect(output.displayImages.length).toBeGreaterThan(0);
    expect(output.displayImages.every(({ image }: { image: { role: string } }) => image.role === "product")).toBe(true);
  });

  it("displays and reads every eligible MTF chart", async () => {
    const zoom = lensRef("fujifilm-gf-35-70mmf45-56-wr-g");
    const gfx = buildLensTools("G", "en", (brand) => brand, GUEST, new Set([zoom]));
    const input = { lenses: [{ ref: zoom, images: [{ role: "mtf" as const }] }] };
    const result = run(gfx.showLensImages, input);
    expect(result.displayImages).toHaveLength(6);
    const filtered = run(gfx.showLensImages, { lenses: [{ ref: zoom, images: [{ role: "mtf", focalLengthMm: 70 }] }] });
    expect(filtered.displayImages).toHaveLength(3);
    expect(filtered.displayImages.every((entry: { image: { focalLengthMm: number } }) => entry.image.focalLengthMm === 70)).toBe(true);
    const projected = await gfx.showLensImages.toModelOutput!({ toolCallId: "images", input, output: result });
    if (projected.type !== "content" || projected.value[0].type !== "text") {throw new Error("Expected vision content");}
    expect(JSON.parse(projected.value[0].text)).toMatchObject({
      presentation: { galleries: [{ lensRef: zoom, role: "mtf", imageCount: 6 }] },
      imagesForReading: result.displayImages.map(({ imageRef }: { imageRef: string }) => imageRef),
    });
    expect(projected.value.filter((part) => part.type === "file")).toHaveLength(6);
  });

  it("does not pass unlabeled charts off as matching a requested aperture", () => {
    const output = run(imageTool(), { lenses: [{ ref: unknownRef, images: [{ role: "mtf", apertureFNumber: 1.4 }] }] });
    expect(output.displayImages).toHaveLength(1);
    const image = output.displayImages[0].imageRef;
    expect(output.lenses[0].imageResults).toEqual([expect.objectContaining({
      status: "conditions-unconfirmed", selected: [image], unconfirmed: [image], note: expect.stringContaining("do not present them as matching"),
    })]);
  });

  it("does not substitute a chart with a known different aperture", () => {
    const output = run(imageTool(), { lenses: [{ ref, images: [{ role: "mtf", apertureFNumber: 16 }] }] });
    expect(output.displayImages).toEqual([]);
    expect(output.lenses[0].imageResults).toMatchObject([{ status: "no-match" }]);
  });

  it("lists a lens's available images and refuses a ref the turn never recalled", () => {
    const output = run(imageTool(), { lenses: [{ ref, images: [{ role: "mtf" }] }] });
    expect(output.lenses[0].images).toEqual(expect.arrayContaining([expect.objectContaining({ role: "mtf" })]));
    expect(() => run(imageTool(), { lenses: [{ ref: lensRef("fujifilm-xf-56mmf12-r-wr-x"), images: [{ role: "mtf" }] }] })).toThrow(/was not returned/);
  });

  it("adds an MTF comparability grade for two lenses' charts", async () => {
    const a = lensRef("fujifilm-xf-16-55mmf28-r-lm-wr-x");
    const b = lensRef("fujifilm-xf-16-80mmf4-r-ois-wr-x");
    const both = buildLensTools("X", "en", (brand) => brand, GUEST, new Set([a, b])).showLensImages;
    const input = { lenses: [{ ref: a, images: [{ role: "mtf" as const }] }, { ref: b, images: [{ role: "mtf" as const }] }] };
    const output = run(both, input);
    const projected = await both.toModelOutput!({ toolCallId: "images", input, output });
    if (projected.type !== "content" || projected.value[0].type !== "text") {throw new Error("Expected vision content");}
    expect(JSON.parse(projected.value[0].text).mtfComparison).toMatchObject({ level: expect.any(String), caveats: expect.any(Array), rule: expect.any(String) });
  });
});

describe("lensDetails hands the model refs, never ids", () => {
  it("returns a ref per lens and no id anywhere in the payload", async () => {
    // lensDetails only resolves refs the same turn already recalled, so seed the gate.
    const recall = await run(tools.queryLenses, { queries: [{ type: "prime" }] });
    const refs = recall.results[0].matches.slice(0, 3).map((lens: { ref: string }) => lens.ref);
    expect(refs.length).toBeGreaterThan(0);

    const details = await run(tools.lensDetails, { lenses: refs.map((ref: string) => ({ ref })) });

    expect(details.lenses.map((lens: { ref?: string }) => lens.ref)).toEqual(refs);

    const found: string[] = [];
    idsIn(details, "lensDetails", found);
    expect(found).toEqual([]);
  });

  it("points rendering and handling questions to lensReviews", async () => {
    // Asked about sharpness or fringing, the model filled the silence with a verdict of its own.
    const recall = await run(tools.queryLenses, { queries: [{ type: "prime" }] });
    const [ref] = recall.results[0].matches.map((lens: { ref: string }) => lens.ref);

    const details = await run(tools.lensDetails, { lenses: [{ ref }] });

    expect(details.notInData).toMatch(/lensReviews/);
  });

  it("still carries the long-tail specs a recall result leaves out", async () => {
    const recall = await run(tools.queryLenses, { queries: [{ type: "prime" }] });
    const [ref] = recall.results[0].matches.map((lens: { ref: string }) => lens.ref);
    const details = await run(tools.lensDetails, { lenses: [{ ref }] });

    // Dropping the id must not turn into dropping the payload: these are exactly what
    // the tool exists to fetch, and none of them appears in a recall result.
    expect(Object.keys(details.lenses[0])).toEqual(
      expect.arrayContaining([
        "lensConfiguration",
        "filterMm",
        "apertureBladeCount",
        "focusMotor",
        "internalFocusing",
      ]),
    );
  });
});

describe("myFavorites", () => {
  const X_FAVORITES = ["fujifilm-xf-23mmf14-r-lm-wr-x", "fujifilm-xf-33mmf14-r-lm-wr-x"];
  const G_FAVORITE = "fujifilm-gf-45mmf28-r-wr-g";

  it("refuses to run without an account, which the sign-in gate keeps from happening", async () => {
    await expect(run(tools.myFavorites, {})).rejects.toThrow(/not signed in/);
  });

  it("returns the current mount's favorites in order, counts the rest, and opens the gate for their refs", async () => {
    const withFavorites = buildLensTools("X", "zh", (brand) => brand, { ...GUEST, favorites: async () => [
      ...X_FAVORITES,
      G_FAVORITE,
      "no-such-lens",
    ] }, new Set());
    const out = await run(withFavorites.myFavorites, {});
    expect(out.total).toBe(2);
    expect(out.otherMounts).toEqual([{ mount: "G", count: 1 }]);
    const refs = out.results.map((lens: { ref: string }) => lens.ref);
    const details = await run(withFavorites.lensDetails, { lenses: refs.map((ref: string) => ({ ref })) });
    expect(details.lenses.map((lens: { name: string }) => lens.name)).toEqual([
      expect.stringContaining("23mm"),
      expect.stringContaining("33mm"),
    ]);
    const found: string[] = [];
    idsIn(out, "out", found);
    expect(found).toEqual([]);
  });
});

describe("queryLenses with several constraint sets", () => {
  it("recalls each set separately, in order, and gates every ref it returned", async () => {
    const tools = buildLensTools("X", "zh", (brand) => brand, GUEST, new Set());

    const out = await run(tools.queryLenses, {
      queries: [{ type: "zoom", minReach: 200 }, { type: "prime", maxWeightG: 200 }],
    });

    expect(out.results).toHaveLength(2);
    type Recalled = { ref: string; focalNativeMm: [number, number] };
    const [zooms, primes] = out.results as { matches: Recalled[] }[];
    expect(zooms.matches.length).toBeGreaterThan(0);
    expect(primes.matches.length).toBeGreaterThan(0);
    expect(zooms.matches.every(({ focalNativeMm: [wide, tele] }) => wide < tele && tele >= 200)).toBe(true);
    expect(primes.matches.every(({ focalNativeMm: [wide, tele] }) => wide === tele)).toBe(true);
    const refs = [zooms.matches[0].ref, primes.matches[0].ref];
    const details = await run(tools.lensDetails, { lenses: refs.map((ref: string) => ({ ref })) });
    expect(details.lenses.map((lens: { ref: string }) => lens.ref)).toEqual(refs);
  });
});

describe("refs recalled earlier in the conversation", () => {
  async function priorTurn(): Promise<{ history: UIMessage[]; recalled: string[] }> {
    const earlier = buildLensTools("X", "zh", (brand) => brand, GUEST, new Set());
    const input = { queries: [{ type: "prime" as const }] };
    const output = await run(earlier.queryLenses, input);
    const recalled = output.results[0].matches.slice(0, 3).map((lens: { ref: string }) => lens.ref);
    const history: UIMessage[] = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "primes" }] },
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "tool-queryLenses", toolCallId: "c1", state: "output-available", input, output },
          { type: "text", text: "Here are some primes." },
        ],
      },
      { id: "u2", role: "user", parts: [{ type: "text", text: "tell me more" }] },
    ];
    return { history, recalled };
  }

  function toolsSeededFrom(history: UIMessage[]) {
    const recalledRefs = new Set<string>();
    seedRecalledRefs(recalledRefs, history);
    return buildLensTools("X", "zh", (brand) => brand, GUEST, recalledRefs);
  }

  it("accepts a ref a recall tool returned in an earlier turn", async () => {
    const { history, recalled } = await priorTurn();
    const tools = toolsSeededFrom(history);

    const details = await run(tools.lensDetails, { lenses: recalled.map((ref) => ({ ref })) });
    expect(details.lenses.map((lens: { ref: string }) => lens.ref)).toEqual(recalled);
    const cards = await run(tools.recommendLenses, { picks: [{ ref: recalled[0], reason: "r" }] });
    expect(cards.recommendations).toHaveLength(1);
    const table = await run(tools.listLenses, { refs: recalled });
    expect(table.lenses).toHaveLength(recalled.length);
  });

  it("still rejects a catalogue slug or a real lens no recall returned", async () => {
    const { history, recalled } = await priorTurn();
    const tools = toolsSeededFrom(history);
    const unrecalled = getLensesByMount("X", "zh")
      .map((lens) => lensRef(lens.id))
      .find((ref) => !recalled.includes(ref) && !history.some((m) => JSON.stringify(m).includes(ref)));
    const slug = getLensesByMount("X", "zh")[0].id;

    for (const ref of [slug, unrecalled!]) {
      expect(() => run(tools.lensDetails, { lenses: [{ ref }] })).toThrow(/was not returned/);
      expect(() => run(tools.recommendLenses, { picks: [{ ref, reason: "r" }] })).toThrow(/was not returned/);
      expect(() => run(tools.listLenses, { refs: [ref] })).toThrow(/was not returned/);
    }
  });

  it("ignores refs in a call that has no output yet", async () => {
    const { history, recalled } = await priorTurn();
    const pending = history.map((message) =>
      message === history[1]
        ? { ...message, parts: [{ type: "tool-queryLenses", toolCallId: "c1", state: "input-available", input: {} }] }
        : message,
    ) as UIMessage[];
    const tools = toolsSeededFrom(pending);

    expect(() => run(tools.lensDetails, { lenses: [{ ref: recalled[0] }] })).toThrow(/was not returned/);
  });
});

describe("myGear", () => {
  it("reads lazily and permits catalog refs only after the tool returns them", async () => {
    const [lens] = getLensesByMount("X", "zh");
    const ref = lensRef(lens.id);
    let reads = 0;
    const tools = buildLensTools("X", "zh", (brand) => brand, {
      ...GUEST,
      gear: async () => {
        reads++;
        return { known: true, bodies: [{ name: "Fujifilm X-T5" }], lenses: [{ name: lens.model, ref, manual: false, adapted: false }] };
      },
    }, new Set());
    expect(tools).not.toHaveProperty("askToSignIn");
    expect(reads).toBe(0);
    expect(() => run(tools.lensDetails, { lenses: [{ ref }] })).toThrow(/was not returned/);
    expect(await run(tools.myGear, {})).toMatchObject({ bodies: [{ name: "Fujifilm X-T5" }], lenses: [{ ref }] });
    expect(reads).toBe(1);
    expect((await run(tools.lensDetails, { lenses: [{ ref }] })).lenses).toHaveLength(1);
  });

  it("returns an empty profile without invoking an editor", async () => {
    const tools = buildLensTools("X", "en", (brand) => brand, { ...GUEST, gear: async () => ({ known: false, reason: "empty" }) }, new Set());
    expect(await run(tools.myGear, {})).toEqual({ bodies: [], lenses: [] });
  });

  it.each(["guest", "unavailable"] as const)("fails closed for %s", async (reason) => {
    const tools = buildLensTools("X", "en", (brand) => brand, { ...GUEST, gear: async () => ({ known: false, reason }) }, new Set());
    await expect(run(tools.myGear, {})).rejects.toThrow(reason === "guest" ? /not signed in/ : /could not be read/);
  });

  it("does not authorize invented, manual, or other-mount refs", async () => {
    const other = getLensesByMount("G", "en")[0];
    const refs = new Set<string>();
    const tools = buildLensTools("X", "en", (brand) => brand, { ...GUEST, gear: async () => ({ known: true, bodies: [], lenses: [
      { name: "Invented", ref: "fake1", manual: true, adapted: false },
      { name: other.model, ref: lensRef(other.id), manual: false, adapted: false },
    ] }) }, refs);
    await run(tools.myGear, {});
    expect(refs.size).toBe(0);
  });
});

describe("lensReviews", () => {
  const source = (id: string) => ({ id, url: `https://example.com/${id}`, site: id, lang: "en", kind: "measured" as const });
  const claim = (aspect: "bokeh" | "autofocus", sources: string[], detail?: string) => ({
    aspect,
    polarity: "positive" as const,
    agreement: sources.length > 1 ? ("consensus" as const) : ("single_source" as const),
    text: `Good ${aspect}.`,
    textZh: `${aspect} 不错。`,
    sources,
    reviewCount: sources.length,
    outletCount: sources.length,
    ...(detail ? { details: [{ id: detail, text: "More.", textZh: "更多。" }] } : {}),
  });

  async function setup() {
    const recalledRefs = new Set<string>();
    const lookup = buildLensTools("X", "zh", (brand) => brand, GUEST, recalledRefs);
    const recall = await run(lookup.queryLenses, { queries: [{ type: "prime" }] });
    const [reviewed, unreviewed] = recall.results[0].matches.map((lens: { ref: string }) => lens.ref);
    const byRef = new Map(getLensesByMount("X", "zh").map((lens) => [lensRef(lens.id), lens.id]));
    const reviewedId = byRef.get(reviewed)!;
    const asked: string[][] = [];
    const tools = buildLensTools(
      "X",
      "zh",
      (brand) => brand,
      {
        ...GUEST,
        reviews: async (ids) => {
          asked.push(ids);
          return new Map([
            [
              reviewedId,
              {
                sources: [source("a"), source("b"), source("c"), source("unused")],
                claims: [claim("bokeh", ["a", "b"]), claim("autofocus", ["c"], "a")],
              },
            ],
          ]);
        },
      },
      recalledRefs,
    );
    return { tools, reviewed, unreviewed, reviewedId, asked };
  }

  it("returns each lens's claims and only the sources they cite, by ref", async () => {
    const { tools, reviewed, unreviewed, reviewedId } = await setup();
    const out = await run(tools.lensReviews, { refs: [reviewed, unreviewed] });

    expect(out.lenses.map((lens: { ref: string }) => lens.ref)).toEqual([reviewed, unreviewed]);
    const ref = (id: string) => sourceRef(reviewedId, id);
    expect(out.lenses[0].claims.map((c: { aspect: string }) => c.aspect)).toEqual(["bokeh", "autofocus"]);
    expect(out.lenses[0].sources.map((s: { id: string }) => s.id)).toEqual(["a", "b", "c"].map(ref));
    expect(out.lenses[0].claims[1]).toMatchObject({ sources: [ref("c")], details: [{ id: ref("a") }] });
    expect(out.lenses[1]).toMatchObject({ claims: [], sources: [] });
    expect(out.note).toMatch(/otherMount/);
    expect(JSON.stringify(out)).not.toContain("textZh");
    expect(JSON.stringify(out)).not.toContain(reviewedId);
  });

  it("narrows to the asked aspects, keeping the sources their details cite", async () => {
    const { tools, reviewed, reviewedId } = await setup();
    const out = await run(tools.lensReviews, { refs: [reviewed], aspects: ["autofocus"] });

    expect(out.lenses[0].claims.map((c: { aspect: string }) => c.aspect)).toEqual(["autofocus"]);
    expect(out.lenses[0].sources.map((s: { id: string }) => s.id)).toEqual(["a", "c"].map((id) => sourceRef(reviewedId, id)));
  });

  it("refuses a ref the conversation never recalled, without reading the store", async () => {
    const { tools, asked } = await setup();
    await expect(run(tools.lensReviews, { refs: ["zzzzz"] })).rejects.toThrow(/was not returned/);
    expect(asked).toEqual([]);
  });
});

describe("lists longer than one call returns", () => {
  async function recalledRefs(count: number) {
    const lookup = buildLensTools("X", "zh", (brand) => brand, GUEST, new Set());
    const recall = await run(lookup.queryLenses, { queries: [{ type: "prime" }] });
    const refs = recall.results[0].matches.slice(0, count).map((lens: { ref: string }) => lens.ref);
    expect(refs).toHaveLength(count);
    return { lookup, refs };
  }

  it("lensDetails takes the first 6 and names the rest instead of rejecting the call", async () => {
    const { lookup, refs } = await recalledRefs(9);
    const out = await run(lookup.lensDetails, { lenses: refs.map((ref: string) => ({ ref })) });

    expect(out.lenses.map((lens: { ref: string }) => lens.ref)).toEqual(refs.slice(0, 6));
    expect(out.notReturned.refs).toEqual(refs.slice(6));
    expect(out.notReturned.note).toMatch(/first 6/);
  });

  it("lensReviews takes the first 6 and names the rest", async () => {
    const { lookup, refs } = await recalledRefs(8);
    const out = await run(lookup.lensReviews, { refs });

    expect(out.lenses.map((lens: { ref: string }) => lens.ref)).toEqual(refs.slice(0, 6));
    expect(out.notReturned.refs).toEqual(refs.slice(6));
  });

  it("adds no notReturned field when everything fits", async () => {
    const { lookup, refs } = await recalledRefs(6);

    expect((await run(lookup.lensDetails, { lenses: refs.map((ref: string) => ({ ref })) })).notReturned).toBeUndefined();
    expect((await run(lookup.lensReviews, { refs })).notReturned).toBeUndefined();
  });

  it("the tool schemas accept any number of refs, so the call is never refused before it runs", async () => {
    const { lookup, refs } = await recalledRefs(12);
    const many = Array.from({ length: 20 }, (_, i) => refs[i % refs.length]);

    for (const tool of [lookup.lensReviews]) {
      const schema = tool.inputSchema as { safeParse: (value: unknown) => { success: boolean } };
      expect(schema.safeParse({ refs: many }).success).toBe(true);
      expect(schema.safeParse({ refs: [] }).success).toBe(false);
    }
  });
});

describe("queryLenses result note", () => {
  it("explains an empty search per query without telling the model to relax requirements", async () => {
    const gfx = buildLensTools("G", "en", (brand) => brand, GUEST, new Set());
    const result = await run(gfx.queryLenses, { queries: [
      { brands: ["fujifilm"], type: "prime", focalWithin: { min: 33, max: 37 }, maxApertureF: { wide: 1.4, tele: 1.4 } },
      { brands: ["fujifilm"], type: "prime", focalWithin: { min: 30, max: 30 } },
    ] });
    expect(result.results[0]).toMatchObject({ totalMatched: 0, totalMaybe: 0, note: expect.stringContaining("GFX") });
    expect(result.results[0].note).toMatch(/Do not relax/);
    expect(result.results[1].totalMatched).toBeGreaterThan(0);
    expect(result.results[1]).not.toHaveProperty("note");
  });

  it("keeps a failed XF lookup scoped to the current GFX catalogue", async () => {
    const gfx = buildLensTools("G", "en", (brand) => brand, GUEST, new Set());
    const result = await run(gfx.searchLensByName, { queries: ["XF 35mm"] });
    expect(result.results).toMatchObject([{ query: "XF 35mm", matches: [] }]);
    expect(result.results[0].note).toMatch(/GFX.*different mount/);
  });

  it("carries the rules for reading maybe and the cap with the data", async () => {
    const result = await run(tools.queryLenses, { queries: [{ type: "prime" }] });
    expect(result.note).toMatch(/`maybe`[\s\S]*never drop them/);
    expect(result.note).toMatch(/totalMatched[\s\S]*no paging/);
  });
});

describe("queryBodies", () => {
  it("returns specs with the no-prices-or-verdicts note and no catalogue ids", async () => {
    const result = await run(tools.queryBodies, { names: ["X-T5"] });
    expect(result.matches[0].name).toBe("Fujifilm X-T5");
    expect(result.note).toMatch(/no prices, reviews/);
    const found: string[] = [];
    idsIn(result, "result", found);
    expect(found).toEqual([]);
  });
});

it("sends the model the cell values a table shows, with the caption", async () => {
  const ref = lensRef("fujifilm-xf-35mmf14-r-x");
  const lookup = buildLensTools("X", "en", (brand) => brand, GUEST, new Set([ref]));
  const input = { refs: [ref], columns: ["lensConfiguration" as const], caption: "Construction" };
  const output = await run(lookup.listLenses, input);
  const projected = await lookup.listLenses.toModelOutput!({ toolCallId: "table", input, output });
  if (projected.type !== "text") { throw new Error("Expected table summary"); }
  const { presentation } = JSON.parse(projected.value);
  expect(presentation).toMatchObject({ caption: "Construction", table: { lensRefs: [ref], columns: ["lensConfiguration"] } });
  expect(presentation.table.lenses).toEqual([{ ref, name: expect.any(String), values: { lensConfiguration: expect.stringMatching(/\d/) } }]);
});

describe("recall results name the specs they leave out", () => {
  const OMITTED_NOTE = /leave out these detail specs: ([^.]+)\./;

  it("lists exactly the ResolvedLens fields toRecalled drops, on every recall result", async () => {
    const recall = await run(tools.searchLensByName, { queries: ["35"] });
    const recalled = Object.keys(recall.results[0].matches[0]);
    const lensRefFound = recall.results[0].matches[0].ref as string;
    const seeded = buildLensTools("X", "zh", (brand) => brand, GUEST, new Set([lensRefFound]));
    const detailed = Object.keys((await run(seeded.lensDetails, { lenses: [{ ref: lensRefFound }] })).lenses[0]);
    const expected = detailed.filter((key) => !recalled.includes(key)).sort();
    expect(expected.length).toBeGreaterThan(5);

    const results = [
      recall,
      await run(tools.queryLenses, { queries: [{ type: "prime" }] }),
    ];
    for (const result of results) {
      const text = JSON.stringify(result);
      const listed = JSON.parse(`"${(text.match(OMITTED_NOTE) ?? [])[1] ?? ""}"`).split(", ").sort();
      expect(listed).toEqual(expected);
      expect(text).toContain("lensDetails");
      expect(text).toContain("null means the catalogue holds no value");
    }
  });
});

describe("listLenses tells the model the values it shows", () => {
  it("sends each tabled lens with the chosen columns' values, formed as the table forms them", async () => {
    const found = await run(tools.searchLensByName, { queries: ["35mm F1.4"] });
    const refs = found.results[0].matches.slice(0, 2).map((lens: { ref: string }) => lens.ref);
    const input = { refs, columns: ["lensConfiguration", "weight"] as ("lensConfiguration" | "weight")[] };
    const output = await run(tools.listLenses, input);
    const projected = await tools.listLenses.toModelOutput!({ toolCallId: "table", input, output });
    if (projected.type !== "text") {throw new Error("Expected text output");}
    const { presentation } = JSON.parse(projected.value);
    expect(presentation).not.toHaveProperty("scope");
    expect(presentation.table.columns).toEqual(["lensConfiguration", "weight"]);
    expect(presentation.table.lensRefs).toEqual(refs);
    expect(presentation.table.lenses).toHaveLength(refs.length);
    for (const row of presentation.table.lenses) {
      expect(row).toMatchObject({ ref: expect.any(String), name: expect.any(String) });
      expect(row.values.lensConfiguration).toMatch(/\d/);
      expect(row.values.weight).toMatch(/\d\s?g/);
    }
  });
});

describe("queryLenses bounds", () => {
  const parse = (query: unknown) => (tools.queryLenses.inputSchema as unknown as { safeParse: (value: unknown) => { success: boolean; error?: { message: string } } }).safeParse({ queries: [query] });

  it.each([
    { maxWide: 0 }, { maxWeightG: 0 }, { maxLengthMm: 0 }, { maxPrice: 0 }, { minReach: 0 },
    { minMagnification: 0 }, { minApertureBladeCount: 0 }, { minReleaseYear: 0 },
    { maxApertureF: { wide: 0 } }, { maxApertureF: { tele: 0 } },
    { focalWithin: { min: 0 } }, { focalWithin: { max: 0 } }, { coversFocals: [0] },
  ])("rejects a zero bound %o and says null means unrestricted", (query) => {
    const result = parse(query);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("null");
  });

  it("still accepts null and positive bounds", () => {
    expect(parse({ maxWide: null, maxWeightG: 400, maxApertureF: { wide: 2.8, tele: null }, focalWithin: { min: 35, max: null } }).success).toBe(true);
  });
});

describe("owned lenses", () => {
  const ref = lensRef("fujifilm-xf-35mmf14-r-x");
  const other = lensRef("fujifilm-xf-56mmf12-r-wr-x");
  const ownerData = (gear: ToolData["gear"]): ToolData => ({ ...GUEST, gear });
  const owner = ownerData(async () => ({ known: true, bodies: [], lenses: [{ name: "XF 35mm F1.4 R", ref, manual: false, adapted: false }] }));
  const build = (data: ToolData) => buildLensTools("X", "en", (brand) => brand, data, new Set([ref, other]));

  it("flags a lens the signed-in user owns in the card, table and model output, and no other", async () => {
    const lookup = build(owner);
    const cards = await run(lookup.recommendLenses, { picks: [{ ref, reason: "r" }, { ref: other, reason: "r" }] });
    expect(cards.recommendations.map((rec: { owned?: boolean }) => rec.owned)).toEqual([true, undefined]);
    const cardText = await lookup.recommendLenses.toModelOutput!({ toolCallId: "c", input: { picks: [] }, output: cards });
    expect(JSON.stringify(cardText)).toMatch(new RegExp(`${ref}[^,]*already owned`));
    expect(JSON.stringify(cardText)).not.toMatch(new RegExp(`${other}[^,]*already owned`));

    const input = { refs: [ref, other], columns: ["weight" as const] };
    const table = await run(lookup.listLenses, input);
    expect(table.lenses.map((lens: { owned?: boolean }) => lens.owned)).toEqual([true, undefined]);
    const projected = await lookup.listLenses.toModelOutput!({ toolCallId: "t", input, output: table });
    if (projected.type !== "text") {throw new Error("Expected text");}
    expect(JSON.parse(projected.value).presentation.table.lenses.map((row: { owned?: boolean }) => row.owned)).toEqual([true, undefined]);
  });

  it.each([
    ["a guest", GUEST],
    ["a failed gear read", ownerData(async () => { throw new Error("db down"); })],
    ["an unavailable profile", ownerData(async () => ({ known: false, reason: "unavailable" }))],
  ])("marks nothing, without an error, for %s", async (_name, data) => {
    const lookup = build(data);
    const cards = await run(lookup.recommendLenses, { picks: [{ ref, reason: "r" }] });
    expect(cards.recommendations[0]).not.toHaveProperty("owned");
    const table = await run(lookup.listLenses, { refs: [ref] });
    expect(table.lenses[0]).not.toHaveProperty("owned");
  });
});

describe("searchLensByName with several names", () => {
  it("groups matches per query in input order and recalls every ref", async () => {
    const recalledRefs = new Set<string>();
    const lookup = buildLensTools("X", "zh", (brand) => brand, GUEST, recalledRefs);
    const result = await run(lookup.searchLensByName, { queries: ["XF 56mm", "no-such-lens-zzz", "XF 35mm F1.4"] });
    expect(result.results.map((group: { query: string }) => group.query)).toEqual(["XF 56mm", "no-such-lens-zzz", "XF 35mm F1.4"]);
    expect(result.results[1].matches).toEqual([]);
    expect(result.results[1].note).toMatch(/No name match/);
    expect(result.results[0]).not.toHaveProperty("note");
    for (const group of result.results) {
      for (const lens of group.matches) {expect(recalledRefs.has(lens.ref)).toBe(true);}
    }
    expect(result.detailSpecsNote).toContain("lensDetails");
  });

  it("caps the names at four", () => {
    const schema = tools.searchLensByName.inputSchema as unknown as { safeParse: (value: unknown) => { success: boolean } };
    expect(schema.safeParse({ queries: ["a", "b", "c", "d"] }).success).toBe(true);
    expect(schema.safeParse({ queries: ["a", "b", "c", "d", "e"] }).success).toBe(false);
    expect(schema.safeParse({ queries: [] }).success).toBe(false);
  });

  // Compatibility: replies saved before the multi-name input hold `results` as a flat lens list.
  it("still seeds refs from a saved turn in the old flat output shape", () => {
    const recalledRefs = new Set<string>();
    seedRecalledRefs(recalledRefs, [{
      id: "a", role: "assistant",
      parts: [{ type: "tool-searchLensByName", toolCallId: "c", state: "output-available", input: { query: "56" }, output: { results: [{ ref: "old1" }, { ref: "old2" }] } }],
    } as UIMessage]);
    expect([...recalledRefs]).toEqual(["old1", "old2"]);
  });
});

describe("figure numbers", () => {
  const a = lensRef("fujifilm-xf-16-55mmf28-r-lm-wr-x");
  const b = lensRef("fujifilm-xf-16-80mmf4-r-ois-wr-x");
  const figures = (locale: string, next = 1) => {
    const counter = { next };
    return { counter, tool: buildLensTools("X", locale, (brand) => brand, GUEST, new Set([a, b]), counter).showLensImages };
  };
  const input = { lenses: [{ ref: a, images: [{ role: "mtf" as const }] }, { ref: b, images: [{ role: "mtf" as const }] }] };

  it("numbers displayed images 1..n across calls in one request, in display order", async () => {
    const { tool, counter } = figures("en");
    const first = await run(tool, input);
    const second = await run(tool, { lenses: [{ ref: b, images: [{ role: "optical-construction" as const }] }] });
    const all = [...first.displayImages, ...second.displayImages];
    expect(all.map((image: { figure: number }) => image.figure)).toEqual(all.map((_, i) => i + 1));
    expect(all[0].figureLabel).toBe("Fig. 1");
    expect(counter.next).toBe(all.length + 1);
  });

  it("continues from a seeded count and labels in the reply's locale", async () => {
    const { tool } = figures("zh", 5);
    const out = await run(tool, { lenses: [{ ref: a, images: [{ role: "mtf" as const }] }] });
    expect(out.displayImages[0]).toMatchObject({ figure: 5, figureLabel: "图 5" });
  });

  it("counts the figures already shown in the resumed assistant message", () => {
    const shown = (n: number) => ({ type: "tool-showLensImages", toolCallId: `c${n}`, state: "output-available", input: {}, output: { displayImages: Array.from({ length: n }, () => ({})) } });
    const resumed = [
      { id: "u", role: "user", parts: [{ type: "text", text: "hi" }] },
      { id: "a", role: "assistant", parts: [shown(2), shown(3)] },
    ] as UIMessage[];
    expect(countShownFigures(resumed)).toBe(5);
    expect(countShownFigures([...resumed, { id: "u2", role: "user", parts: [{ type: "text", text: "next" }] } as UIMessage])).toBe(0);
    expect(countShownFigures([])).toBe(0);
  });

  it("labels each image the model receives and tells it to refer to figures by label", async () => {
    const { tool } = figures("en");
    const output = await run(tool, input);
    const projected = await tool.toModelOutput!({ toolCallId: "i", input, output });
    if (projected.type !== "content" || projected.value[0].type !== "text") {throw new Error("Expected vision content");}
    const summary = JSON.parse(projected.value[0].text);
    expect(summary.figureNote).toMatch(/label/i);
    expect(summary.shownImages[0]).toMatchObject({ figure: "Fig. 1", imageRef: output.displayImages[0].imageRef });
    const captions = projected.value.filter((part) => part.type === "text").slice(1).map((part) => (part as { text: string }).text);
    expect(captions[0]).toBe(`Image Fig. 1 (${output.displayImages[0].imageRef}):`);
  });
});

describe("a past table reaches the model as it was", () => {
  it("sends a stored listLenses output through toModelOutput unchanged, with no history marker", async () => {
    const ref = lensRef("fujifilm-xf-35mmf14-r-x");
    const lookup = buildLensTools("X", "en", (brand) => brand, GUEST, new Set([ref]));
    const input = { refs: [ref], columns: ["weight" as const] };
    const output = await run(lookup.listLenses, input);
    const past = [
      { id: "u", role: "user", parts: [{ type: "text", text: "table" }] },
      { id: "a", role: "assistant", parts: [{ type: "tool-listLenses", toolCallId: "t", state: "output-available", input, output }] },
      { id: "u2", role: "user", parts: [{ type: "text", text: "next" }] },
    ] as UIMessage[];
    const messages = await convertToModelMessages(past, { tools: lookup, ignoreIncompleteToolCalls: true });
    const result = JSON.stringify(messages);
    const direct = await lookup.listLenses.toModelOutput!({ toolCallId: "t", input, output });
    if (direct.type !== "text") {throw new Error("Expected text output");}
    expect(result).toContain(JSON.stringify(direct.value).slice(1, -1));
    expect(result).not.toContain("history");
  });
});
