import { describe, it, expect } from "vitest";
import type { UIMessage } from "ai";
import { buildLensTools, seedRecalledRefs } from "../tools";
import { getLensesByMount } from "@/lib/lens/data";
import { lensRef } from "../lens-ref";

const tools = buildLensTools("X", "zh", (brand) => brand, async () => null, new Set());

// The AI SDK types `execute` as optional and passes call options every tool here ignores.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const run = (tool: { execute?: (...args: any[]) => any }, input: unknown) =>
  tool.execute!(input, {} as never);

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
    ["queryLenses", { type: "prime" }, (out: { matches: { ref: string }[] }) => out.matches],
    ["searchLensByName", { query: "35" }, (out: { results: { ref: string }[] }) => out.results],
  ])("%s", async (name, input, pick) => {
    const tools = buildLensTools("X", "zh", (brand) => brand, async () => null, new Set());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refs = pick(await run((tools as any)[name], input)).map((lens) => lens.ref);
    expect(refs.length).toBeGreaterThan(0);

    // lensDetails throws on a ref the turn never recalled, so resolving every one of
    // them is the gate asserting it holds what the payload advertised.
    const details = await run(tools.lensDetails, { refs: refs.slice(0, 6) });
    expect(details.lenses.map((lens: { ref: string }) => lens.ref)).toEqual(refs.slice(0, 6));
  });
});

describe("lensDetails hands the model refs, never ids", () => {
  it("returns a ref per lens and no id anywhere in the payload", async () => {
    // lensDetails only resolves refs the same turn already recalled, so seed the gate.
    const recall = await run(tools.queryLenses, { type: "prime" });
    const refs = recall.matches.slice(0, 3).map((lens: { ref: string }) => lens.ref);
    expect(refs.length).toBeGreaterThan(0);

    const details = await run(tools.lensDetails, { refs });

    expect(details.lenses.map((lens: { ref?: string }) => lens.ref)).toEqual(refs);

    const found: string[] = [];
    idsIn(details, "lensDetails", found);
    expect(found).toEqual([]);
  });

  it("still carries the long-tail specs a recall result leaves out", async () => {
    const recall = await run(tools.queryLenses, { type: "prime" });
    const [ref] = recall.matches.map((lens: { ref: string }) => lens.ref);
    const details = await run(tools.lensDetails, { refs: [ref] });

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

  it("tells a guest to sign in", async () => {
    expect(await run(tools.myFavorites, {})).toEqual({ status: "not_signed_in" });
  });

  it("returns the current mount's favorites in order, counts the rest, and opens the gate for their refs", async () => {
    const withFavorites = buildLensTools("X", "zh", (brand) => brand, async () => [
      ...X_FAVORITES,
      G_FAVORITE,
      "no-such-lens",
    ], new Set());
    const out = await run(withFavorites.myFavorites, {});
    expect(out.status).toBe("ok");
    expect(out.total).toBe(2);
    expect(out.otherMounts).toEqual([{ mount: "G", count: 1 }]);
    const refs = out.results.map((lens: { ref: string }) => lens.ref);
    const details = await run(withFavorites.lensDetails, { refs });
    expect(details.lenses.map((lens: { name: string }) => lens.name)).toEqual([
      expect.stringContaining("23mm"),
      expect.stringContaining("33mm"),
    ]);
    const found: string[] = [];
    idsIn(out, "out", found);
    expect(found).toEqual([]);
  });
});

describe("refs recalled earlier in the conversation", () => {
  async function priorTurn(): Promise<{ history: UIMessage[]; recalled: string[] }> {
    const earlier = buildLensTools("X", "zh", (brand) => brand, async () => null, new Set());
    const output = await run(earlier.queryLenses, { type: "prime" });
    const recalled = output.matches.slice(0, 3).map((lens: { ref: string }) => lens.ref);
    const history: UIMessage[] = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "primes" }] },
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "tool-queryLenses", toolCallId: "c1", state: "output-available", input: { type: "prime" }, output },
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
    return buildLensTools("X", "zh", (brand) => brand, async () => null, recalledRefs);
  }

  it("accepts a ref a recall tool returned in an earlier turn", async () => {
    const { history, recalled } = await priorTurn();
    const tools = toolsSeededFrom(history);

    const details = await run(tools.lensDetails, { refs: recalled });
    expect(details.lenses.map((lens: { ref: string }) => lens.ref)).toEqual(recalled);
    const cards = await run(tools.recommendLenses, {
      groups: [{ picks: [{ ref: recalled[0], reason: "r" }] }],
    });
    expect(cards.groups[0].recommendations).toHaveLength(1);
    const table = await run(tools.listLenses, { refs: recalled });
    expect(table.lenses).toHaveLength(recalled.length);
  });

  it("renders several titled groups from one call and links each ref back to the model", async () => {
    const { history, recalled } = await priorTurn();
    const tools = toolsSeededFrom(history);
    const input = {
      groups: [
        { title: "Kit A", picks: [{ ref: recalled[0], reason: "r" }] },
        { title: "  ", picks: [{ ref: recalled[1], reason: "r" }] },
      ],
    };

    const cards = await run(tools.recommendLenses, input);

    expect(cards.groups.map((g: { title: string | null }) => g.title)).toEqual(["Kit A", null]);
    expect(tools.recommendLenses.toModelOutput!({ toolCallId: "c", input, output: cards })).toEqual({
      type: "text",
      value: `Rendered recommendation cards to the user:\nKit A: ${recalled[0]}\n(untitled): ${recalled[1]}`,
    });
  });

  it("still rejects a catalogue slug or a real lens no recall returned", async () => {
    const { history, recalled } = await priorTurn();
    const tools = toolsSeededFrom(history);
    const unrecalled = getLensesByMount("X", "zh")
      .map((lens) => lensRef(lens.id))
      .find((ref) => !recalled.includes(ref) && !history.some((m) => JSON.stringify(m).includes(ref)));
    const slug = getLensesByMount("X", "zh")[0].id;

    for (const ref of [slug, unrecalled!]) {
      expect(() => run(tools.lensDetails, { refs: [ref] })).toThrow(/was not returned/);
      expect(() =>
        run(tools.recommendLenses, { groups: [{ picks: [{ ref, reason: "r" }] }] }),
      ).toThrow(/was not returned/);
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

    expect(() => run(tools.lensDetails, { refs: [recalled[0]] })).toThrow(/was not returned/);
  });
});
