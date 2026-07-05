// AskIris behavior-eval runner.
//
//   node eval/askiris/run.mjs [caseId ...] [--runs=N]
//
// Needs the dev server up (localhost:3000) — it drives the real /api/chat path so
// the CURRENT system prompt is under test. For each case it runs the agent N times
// (default 1; use more to read a pass-RATE, since the model is non-deterministic),
// applies the universal + per-case programmatic checks to each run's tool trace,
// and scores the judge rubric with an INDEPENDENT model (OpenAI gpt-5.4-mini via the
// Responses API, with web search) — not the DeepSeek agent under test, so it doesn't
// grade its own output. Reads OPENAI_API_KEY from the env or .env.local.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CASES, UNIVERSAL_CHECKS } from "./cases.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = "http://localhost:3000";
const JUDGE_MODEL = "gpt-5.4-mini";

// The judge's universal duties (Layers A/B), shared by every case. Its headline job
// is to AUDIT the recommendation against its own lens knowledge and the web — the one
// thing the programmatic checks (which only see our own data) structurally cannot do.
const JUDGE_SYSTEM = [
  "你是镜头推荐 agent「Iris」的严格评测员,你本身也是资深镜头专家。你会拿到 [用户提问]、Iris 的 [回复]、以及 [本 case 的评估点]。",
  "",
  "首要职责——用你自己的镜头知识 + 联网搜索,审计推荐本身,不要只看它说得好不好听:",
  "- 主动联网搜『这个场景 + 这个卡口大家常推哪些镜头』(评测、博客、论坛),据此判断有没有『明显该出现却缺席』的镜头:真正典型、被反复推荐的却没进来,就是问题——这能暴露数据缺失、召回遗漏或排序错误。不是吹毛求疵找『还能再加一支』。",
  "- 推荐的每支镜头,对这个需求和卡口是否真的合适?有没有明显选错的?",
  "- 联网也用来核实你拿不准的镜头:绝不能因为训练数据里没有就判它编造——新镜头层出不穷,先搜清它是否真实存在、参数与卡口对不对再下结论。",
  "",
  "再看通用质量:",
  "- 是否只推了符合用户明说硬约束的镜头;是否诚实交代取舍;漏掉看着合适的候选有没有说明为何;用户给的约束明显离谱时有没有点破。",
  "- prose 里有没有报一个查无实据、疑似编造的镜头名或参数。",
  "",
  "最后再核对 [本 case 的评估点]。",
  "",
  "综合以上,第一行只输出 PASS 或 FAIL,第二行给一句话理由,优先点出最严重的问题。",
].join("\n");

// -- lens-data lookups the checks assert against --------------------------------
const lenses = JSON.parse(readFileSync(join(REPO, "src/data/lenses.json"), "utf8"));
const byId = new Map(lenses.map((l) => [l.id, l]));
const ctx = {
  exists: (id) => byId.has(id),
  mountOf: (id) => byId.get(id)?.mount ?? null,
  priceCNY(id) {
    const cn = byId.get(id)?.pricing?.cn;
    const arr = cn?.new ?? cn?.used ?? [];
    return arr.length ? Math.min(...arr.map((x) => x.price)) : null;
  },
  focalEquivWide(id) {
    const l = byId.get(id);
    return l ? Math.round(l.focalLengthMin * 1.5) : null;
  },
};

// -- DeepSeek/OpenAI key (env, then .env.local) ---------------------------------
let KEY = process.env.OPENAI_API_KEY;
if (!KEY) {
  try {
    KEY = readFileSync(join(REPO, ".env.local"), "utf8").match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim();
  } catch {
    // no .env.local — judge just reports PENDING.
  }
}

// Pull lens ids out of any tool output (queryLenses matches/maybe, searchLensByName
// results, …) so we can assert picks were actually recalled, not conjured.
function idsFromOutput(output) {
  const ids = [];
  if (output && typeof output === "object") {
    for (const v of Object.values(output)) {
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item && typeof item === "object" && typeof item.id === "string") ids.push(item.id);
        }
      }
    }
  }
  return ids;
}

// -- run one agent turn, fold the SSE stream into a result ----------------------
async function runAgent({ prompt, mount, locale }) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ id: "u1", role: "user", parts: [{ type: "text", text: prompt }] }],
      mount,
      locale,
    }),
  });
  const body = await res.text();
  let text = "";
  const tools = [];
  const byCall = new Map();
  for (const line of body.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    let o;
    try {
      o = JSON.parse(line.slice(6));
    } catch {
      continue;
    }
    if (o.type === "text-delta") {
      text += o.delta ?? "";
    } else if (o.type === "tool-input-available") {
      const t = { name: o.toolName, input: o.input, output: null };
      tools.push(t);
      byCall.set(o.toolCallId, t);
    } else if (o.type === "tool-output-available") {
      const t = byCall.get(o.toolCallId);
      if (t) t.output = o.output;
    }
  }
  // Only count picks from recommendLenses calls that SUCCEEDED (rendered cards).
  // A call with a bad id throws (tool-error, no output); the model then retries
  // with the corrected id — counting the failed attempt's input would flag ids the
  // user never saw.
  const picks = tools
    .filter((t) => t.name === "recommendLenses" && Array.isArray(t.output?.recommendations))
    .flatMap((t) => t.input?.picks ?? []);
  const recalledIds = new Set();
  for (const t of tools) for (const id of idsFromOutput(t.output)) recalledIds.add(id);
  return {
    text,
    tools,
    queryCalls: tools.filter((t) => t.name === "queryLenses").map((t) => t.input),
    picks,
    pickIds: picks.map((p) => p.id),
    recalledIds,
  };
}

// Pull the assistant text out of a Responses API result. Via raw fetch there's no
// SDK `output_text` helper, so read it off the message item (the output array also
// holds reasoning and web_search_call items we skip).
function responseText(data) {
  const msg = (data.output ?? []).find((o) => o.type === "message");
  const text = (msg?.content ?? [])
    .filter((p) => p.type === "output_text")
    .map((p) => p.text)
    .join("")
    .trim();
  return text || data.error?.message || "";
}

// -- LLM-as-judge (sees the user's real prompt, not a paraphrase) ---------------
// Uses the Responses API with the web_search tool so the judge can verify lenses
// it doesn't recognise (new models postdate its training) instead of guessing —
// web search needs at least "low" reasoning (minimal/none are unsupported).
async function judge(rubric, text, prompt) {
  if (!KEY) return { verdict: "PENDING", reason: "no OPENAI_API_KEY" };
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        instructions: JUDGE_SYSTEM,
        input: `[用户提问]\n${prompt}\n\n[回复]\n${text}\n\n[本 case 的评估点]\n${rubric}`,
        tools: [{ type: "web_search" }],
        reasoning: { effort: "low" },
      }),
    });
    const out = responseText(await res.json());
    const verdict = /^\s*PASS/i.test(out) ? "PASS" : /^\s*FAIL/i.test(out) ? "FAIL" : "?";
    return { verdict, reason: out.split("\n").slice(1).join(" ").trim().slice(0, 160) };
  } catch (e) {
    return { verdict: "ERROR", reason: String(e).slice(0, 100) };
  }
}

// -- main -----------------------------------------------------------------------
const RUNS = Number((process.argv.find((a) => a.startsWith("--runs=")) ?? "--runs=1").split("=")[1]);
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const cases = only.length ? CASES.filter((c) => only.includes(c.id)) : CASES;
const results = [];

for (const c of cases) {
  console.log(`\n=== ${c.id}  (${RUNS} run${RUNS > 1 ? "s" : ""}) ===`);
  const checks = [...UNIVERSAL_CHECKS, ...(c.checks ?? [])];
  const pass = new Map();
  let judgePass = 0;
  const judgeNotes = [];
  for (let i = 0; i < RUNS; i++) {
    const r = await runAgent(c.input);
    console.log(`  run ${i + 1}: picks=[${r.pickIds.join(", ") || "—"}]`);
    for (const [name, fn] of checks) {
      let ok = false;
      try {
        ok = !!fn(r, ctx, c);
      } catch {
        ok = false;
      }
      pass.set(name, (pass.get(name) ?? 0) + (ok ? 1 : 0));
    }
    if (c.judge) {
      const v = await judge(c.judge, r.text, c.input.prompt);
      if (v.verdict === "PASS") judgePass++;
      judgeNotes.push(`${v.verdict} — ${v.reason}`);
    }
  }
  let progFail = false;
  for (const [name] of checks) {
    const n = pass.get(name) ?? 0;
    if (n < RUNS) progFail = true;
    console.log(`  [${n}/${RUNS}]${n < RUNS ? " ✗" : "  "} ${name}`);
  }
  const judgeFail = Boolean(c.judge) && judgePass < RUNS;
  const gapped = judgeFail && (c.knownGaps?.length ?? 0) > 0;
  if (c.judge) {
    console.log(`  [${judgePass}/${RUNS}] JUDGE${gapped ? " ⚠ expected-fail (known gap)" : ""}`);
    judgeNotes.forEach((n) => console.log(`         ${n}`));
    if (gapped) {
      c.knownGaps.forEach((g) => console.log(`         · known gap: ${g}`));
    }
  }
  results.push({ id: c.id, real: progFail || (judgeFail && !gapped), gapped });
}

// Only a programmatic fail or a judge fail WITHOUT a known gap is a real regression
// (exit 1). Known-gap judge fails are surfaced but don't fail the suite, so it stays
// green on what we knowingly can't do yet and flips red the moment something new breaks.
const real = results.filter((r) => r.real).map((r) => r.id);
const expected = results.filter((r) => r.gapped).map((r) => r.id);
console.log(
  `\n${real.length ? `✗ ${real.length} failing: ${real.join(", ")}` : "✓ all green"}` +
    (expected.length ? `  ·  ${expected.length} expected-fail on known gaps: ${expected.join(", ")}` : ""),
);
process.exitCode = real.length ? 1 : 0;
