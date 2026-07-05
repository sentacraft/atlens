// AskIris behavior-eval runner.
//
//   node eval/askiris/run.mjs [caseId ...] [--runs=N]
//
// Needs the dev server up (localhost:3000) — it drives the real /api/chat path so
// the CURRENT system prompt is under test. For each case it runs the agent N times
// (default 1; use more to read a pass-RATE, since the model is non-deterministic),
// runs the programmatic checks on each run's tool trace, and scores the judge
// rubric with DeepSeek. Reads DEEPSEEK_API_KEY from the env or .env.local.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CASES } from "./cases.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = "http://localhost:3000";

// -- lens-data lookups the checks assert against --------------------------------
const lenses = JSON.parse(readFileSync(join(REPO, "src/data/lenses.json"), "utf8"));
const byId = new Map(lenses.map((l) => [l.id, l]));
const ctx = {
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

// -- DeepSeek key (env, then .env.local) ----------------------------------------
let KEY = process.env.DEEPSEEK_API_KEY;
if (!KEY) {
  try {
    KEY = readFileSync(join(REPO, ".env.local"), "utf8").match(/^DEEPSEEK_API_KEY=(.+)$/m)?.[1]?.trim();
  } catch {
    // no .env.local — judge just reports PENDING.
  }
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
  const picks = tools.filter((t) => t.name === "recommendLenses").flatMap((t) => t.input?.picks ?? []);
  return {
    text,
    tools,
    queryCalls: tools.filter((t) => t.name === "queryLenses").map((t) => t.input),
    picks,
    pickIds: picks.map((p) => p.id),
  };
}

// -- LLM-as-judge ---------------------------------------------------------------
async function judge(rubric, text) {
  if (!KEY) return { verdict: "PENDING", reason: "no DEEPSEEK_API_KEY" };
  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        stream: false,
        messages: [
          { role: "system", content: "你是严格的评测员。第一行只输出 PASS 或 FAIL,第二行给一句话理由。" },
          { role: "user", content: `评分标准:\n${rubric}\n\n---\n待评回复:\n${text}` },
        ],
      }),
    });
    const out = (await res.json()).choices?.[0]?.message?.content ?? "";
    const verdict = /^\s*PASS/i.test(out) ? "PASS" : /^\s*FAIL/i.test(out) ? "FAIL" : "?";
    return { verdict, reason: out.split("\n").slice(1).join(" ").trim().slice(0, 140) };
  } catch (e) {
    return { verdict: "ERROR", reason: String(e).slice(0, 100) };
  }
}

// -- main -----------------------------------------------------------------------
const RUNS = Number((process.argv.find((a) => a.startsWith("--runs=")) ?? "--runs=1").split("=")[1]);
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const cases = only.length ? CASES.filter((c) => only.includes(c.id)) : CASES;

for (const c of cases) {
  console.log(`\n=== ${c.id}  (${RUNS} run${RUNS > 1 ? "s" : ""}) ===`);
  const pass = new Map();
  let judgePass = 0;
  const judgeNotes = [];
  for (let i = 0; i < RUNS; i++) {
    const r = await runAgent(c.input);
    console.log(`  run ${i + 1}: picks=[${r.pickIds.join(", ") || "—"}]`);
    for (const [name, fn] of c.checks ?? []) {
      let ok = false;
      try {
        ok = !!fn(r, ctx);
      } catch {
        ok = false;
      }
      pass.set(name, (pass.get(name) ?? 0) + (ok ? 1 : 0));
    }
    if (c.judge) {
      const v = await judge(c.judge, r.text);
      if (v.verdict === "PASS") judgePass++;
      judgeNotes.push(`${v.verdict} — ${v.reason}`);
    }
  }
  for (const [name] of c.checks ?? []) {
    console.log(`  [${pass.get(name)}/${RUNS}] ${name}`);
  }
  if (c.judge) {
    console.log(`  [${judgePass}/${RUNS}] JUDGE (rubric)`);
    judgeNotes.forEach((n) => console.log(`         ${n}`));
  }
}
console.log("\ndone");
