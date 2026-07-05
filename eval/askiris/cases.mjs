// AskIris behavior eval cases.
//
// Each case re-runs its prompt through the LIVE agent (a real LLM call against
// /api/chat with the CURRENT system prompt) and asserts on the fresh result.
// This is what catches PROMPT/behavior regressions — a UX fixture replays a
// frozen thread and can only catch rendering regressions, never a behavior drift
// caused by editing the prompt.
//
// Two grader tiers per case:
//   checks — programmatic invariants over the parsed tool trace. Cheap, exact.
//            Each is [name, (result, ctx) => boolean]. `result` is
//            { text, tools, queryCalls, picks, pickIds }; `ctx` exposes lens-data
//            lookups (priceCNY, focalEquivWide).
//   judge  — a rubric an LLM-as-judge scores PASS/FAIL. Covers fuzzy qualities no
//            programmatic check can (did it flag the budget? give the full picture?).
//
// Seeded from bad cases found by error analysis; add a case whenever a new failure
// mode surfaces, so the set only grows.

export const CASES = [
  {
    // Smoke / regression guard: a plain request must still yield cards, so a
    // prompt edit that over-corrects (e.g. always hedging, never picking) is caught.
    id: "smoke-35mm",
    input: { prompt: "推荐几支富士 X 卡口等效 35mm 的定焦镜头", mount: "X", locale: "zh" },
    checks: [["produces recommendations", (r) => r.pickIds.length >= 1]],
  },
  {
    id: "astro-milky-way",
    input: { prompt: "第一次拍银河，需要广角大光圈，预算 6000 左右，机身 X-T5。", mount: "X", locale: "zh" },
    checks: [
      ["no cine catalogue (not requested)", (r) => !r.queryCalls.some((q) => q.catalogue === "cine")],
      ["no pick over budget (≤¥6600)", (r, ctx) => r.pickIds.every((id) => { const p = ctx.priceCNY(id); return p == null || p <= 6600; })],
      ["at least one wide pick (≤24mm equiv)", (r, ctx) => r.pickIds.some((id) => (ctx.focalEquivWide(id) ?? 999) <= 24)],
    ],
    judge:
      "用户在 X-T5 上拍银河、预算约 ¥6000。合格回复应满足两点:(a) 点明 ¥6000 对星空绰绰有余(顶级 APS-C 星空定焦约 ¥2500–2900),预算并非约束;(b) 除 AF 大光圈定焦外,至少给出一支手动对焦超广(如 7.5–10mm MF 定焦)作为「更广/更省」的替代——星空本就手动对焦,AF 非必需。两条都做到才 PASS。",
  },
  {
    id: "travel-one-lens",
    input: { prompt: "出门旅游带两三个定焦换来换去太麻烦了，想只带一支镜头走天下。", mount: "X", locale: "zh" },
    checks: [],
    judge:
      "用户想「只带一支镜头走天下」。合格回复应至少点名一支「纸面上看着合适、实际并不推荐」的镜头(例如 XF 18-120 这类电动变焦视频头:焦段最短、价格最贵),并说明为何不选,给用户完整图景。做到即 PASS。",
  },
];
