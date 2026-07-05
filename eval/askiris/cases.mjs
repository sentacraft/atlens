// AskIris behavior eval cases + graders.
//
// Each case re-runs its prompt through the LIVE agent (a real /api/chat call with
// the CURRENT system prompt) and grades the fresh result. This catches PROMPT/
// behavior regressions; a UX fixture replays a frozen thread and only catches
// rendering regressions.
//
// TWO grader tiers, split by what each can know:
//   programmatic — invariants checkable against OUR data (lenses.json). Cheap and
//     exact, but "intra-system": it can only catch "the agent misused its own
//     data", never "the data/recall is itself wrong".
//   judge — an LLM-as-judge with independent lens knowledge. "Extra-system": the
//     only tier that can catch a wrong pick or a conspicuous OMISSION caused by bad
//     data / missed recall / bad ranking. Its universal duties live in run.mjs's
//     JUDGE_SYSTEM; each case adds only its scenario-specific point below.
//
// Programmatic checks are LAYERED:
//   Layer 0  universal validity — UNIVERSAL_CHECKS, applied to every case.
//   Layer 1  stated-constraint satisfaction — also in UNIVERSAL_CHECKS but gated on
//            a case declaring the constraint (e.g. budgetCNY); budget is SOFT, so we
//            only catch a gross breach and leave fit to the judge.
//   Layer 2  scenario expectation — the per-case `checks` array; keep it sparse,
//            most product opinions belong to the judge.
//
// Check signature: (result, ctx, caseObj) => boolean. `result` is
// { text, tools, queryCalls, picks, pickIds, recalledIds }; `ctx` exposes
// data lookups (exists, mountOf, priceCNY, focalEquivWide).

export const UNIVERSAL_CHECKS = [
  // Layer 0 — the agent didn't malfunction, true of any answer.
  ["produced recommendations", (r) => r.pickIds.length >= 1],
  ["all pick ids exist in the catalogue", (r, ctx) => r.pickIds.every((id) => ctx.exists(id))],
  ["all picks match the requested mount", (r, ctx, c) => r.pickIds.every((id) => ctx.mountOf(id) === c.input.mount)],
  ["no duplicate picks", (r) => new Set(r.pickIds).size === r.pickIds.length],
  ["picks were actually recalled (not conjured)", (r) => r.pickIds.every((id) => r.recalledIds.has(id))],
  ["every pick carries a reason", (r) => r.picks.every((p) => typeof p.reason === "string" && p.reason.trim() !== "")],
  ["cine catalogue not opened unless asked", (r, _ctx, c) => c.wantsCine === true || !r.queryCalls.some((q) => q.catalogue === "cine")],
  ["replied in the requested locale", (r, _ctx, c) => c.input.locale !== "zh" || /[一-鿿]/.test(r.text)],
  // Layer 1 — budget is soft ("预算 6000 左右"), so fit is the judge's call; here we
  // only flag a pick well over the stated number, i.e. the agent plainly ignored it.
  [
    "no pick grossly over budget (>1.5x)",
    (r, ctx, c) =>
      c.budgetCNY == null ||
      r.pickIds.every((id) => {
        const p = ctx.priceCNY(id);
        return p == null || p <= c.budgetCNY * 1.5;
      }),
  ],
];

export const CASES = [
  {
    id: "smoke-35mm",
    input: { prompt: "推荐几支富士 X 卡口等效 35mm 的定焦镜头", mount: "X", locale: "zh" },
    checks: [], // universal only — the cheap "still produces sane cards" guard
  },
  {
    id: "astro-milky-way",
    input: { prompt: "第一次拍银河，需要广角大光圈，预算 6000 左右，机身 X-T5。", mount: "X", locale: "zh" },
    budgetCNY: 6000,
    checks: [
      // Layer 2 — Milky Way wants a genuinely wide field of view.
      ["at least one wide pick (≤24mm equiv)", (r, ctx) => r.pickIds.some((id) => (ctx.focalEquivWide(id) ?? 999) <= 24)],
    ],
    judge:
      "针对拍银河这个场景,回复是否兼顾了两点:『视野够广』(银河拱桥需要广角)与『对焦方式不该设限』(星空本就手动对焦,是否 AF 不该是硬门槛)?这是权衡维度,不是硬性要求必须列出某支手动镜头。",
  },
  {
    id: "travel-one-lens",
    input: { prompt: "出门旅游带两三个定焦换来换去太麻烦了，想只带一支镜头走天下。", mount: "X", locale: "zh" },
    checks: [],
    judge:
      "针对『一镜走天下』,回复是否诚实讲清了核心取舍——焦段/变焦覆盖 vs 画质/光圈 vs 体积重量——而不是无脑推最大变焦比的超级变焦?",
  },
];
