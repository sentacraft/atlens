// promptfoo custom provider: POST each turn to /api/chat, rebuild the assistant
// message with readUIMessageStream, return the transcript + tool-call trace for
// the assertions. See README.md.
import { readUIMessageStream } from "ai";

const ENDPOINT = "http://localhost:3000/api/chat";

function formatCard(rec) {
  const f = rec.focalNativeMm;
  const focal = Array.isArray(f) ? (f[0] === f[1] ? `${f[0]}mm` : `${f[0]}-${f[1]}mm`) : "?";
  const a = rec.maxAperture;
  const ap = Array.isArray(a) ? `F${a[0]}-${a[1]}` : `F${a}`;
  const p = rec.price;
  const price = p ? `${p.currency === "CNY" ? "¥" : "$"}${p.amount}` : "no price";
  // The reason is the card's real payload (what it's good for + its trade-off), so
  // a judge grading card quality or honest trade-offs must see it, not just specs.
  const reason = rec.reason?.trim() ? `\n    ${rec.reason.trim()}` : "";
  return `- ${rec.name} · ${focal} · ${ap} · ${rec.weightG ?? "?"}g · ${price}${reason}`;
}

// POST one turn's running history, rebuild the assistant UIMessage via the SDK.
async function postTurn(messages, mount, locale) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, mount, locale }),
  });
  const body = await res.text();
  const chunks = [];
  for (const line of body.split("\n")) {
    if (line.startsWith("data: ")) {
      try {
        chunks.push(JSON.parse(line.slice(6)));
      } catch {
        // keep-alive / non-JSON — skip
      }
    }
  }
  const stream = new ReadableStream({
    start(c) {
      for (const x of chunks) {
        c.enqueue(x);
      }
      c.close();
    },
  });
  let msg = null;
  for await (const m of readUIMessageStream({ stream, onError: () => {} })) {
    msg = m;
  }
  return msg;
}

// Lens ids from any tool output (queryLenses matches/maybe, searchLensByName
// results) for the "picks were recalled" check — id may sit on the item or nested
// under `.lens`.
function idsFromOutput(output) {
  const ids = [];
  if (output && typeof output === "object") {
    for (const v of Object.values(output)) {
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item && typeof item === "object") {
            if (typeof item.id === "string") {
              ids.push(item.id);
            } else if (typeof item.lens?.id === "string") {
              ids.push(item.lens.id);
            }
          }
        }
      }
    }
  }
  return ids;
}

// Fold the final turn's message into { output: transcript, ...trace } for the asserts.
function digest(msg) {
  const transcript = [];
  const picks = [];
  const pickGroups = [];
  const sortBys = [];
  const recalledIds = new Set();
  let openedCine = false;
  let overMatched = false;
  for (const part of msg?.parts ?? []) {
    if (part.type === "text") {
      if (part.text?.trim()) {
        transcript.push(part.text.trim());
      }
      continue;
    }
    const name =
      part.type === "dynamic-tool"
        ? part.toolName
        : typeof part.type === "string" && part.type.startsWith("tool-")
          ? part.type.slice(5)
          : null;
    if (!name) {
      continue;
    }
    if (name === "queryLenses") {
      if (part.input?.sortBy) {
        sortBys.push(part.input.sortBy);
      }
      if (part.input?.usage === "cine") {
        openedCine = true;
      }
      // totalMatched is the full match count beyond the capped result set — more matched
      // than were returned means the recall truncated (the over-match guard's trigger).
      const returned = Array.isArray(part.output?.matches) ? part.output.matches.length : 0;
      if (typeof part.output?.totalMatched === "number" && part.output.totalMatched > returned) {
        overMatched = true;
      }
    }
    for (const id of idsFromOutput(part.output)) {
      recalledIds.add(id);
    }
    if (name === "recommendLenses" && Array.isArray(part.output?.recommendations)) {
      const group = [];
      for (const rec of part.output.recommendations) {
        const f = rec.focalNativeMm;
        picks.push({
          id: rec.id,
          name: rec.name ?? null,
          mount: rec.mount ?? null,
          reason: rec.reason ?? null,
          fmin: Array.isArray(f) ? f[0] : null,
          fmax: Array.isArray(f) ? f[1] : null,
          price: rec.price?.amount ?? null,
        });
        group.push(rec.id);
      }
      pickGroups.push(group);
      transcript.push(`[cards]\n${part.output.recommendations.map(formatCard).join("\n")}`);
    }
  }
  return {
    output: transcript.join("\n\n") || "(empty)",
    picks,
    pickGroups,
    sortBys,
    openedCine,
    overMatched,
    recalledIds: [...recalledIds],
  };
}

// promptfoo instantiates with `new Default(options)`, then calls .id()/.callApi().
export default class AskIrisProvider {
  constructor(options) {
    this.providerId = options?.id ?? "askiris:/api/chat";
  }

  id() {
    return this.providerId;
  }

  async callApi(prompt, context) {
    const mount = context?.vars?.mount ?? "X";
    const locale = context?.vars?.locale ?? "zh";
    // Multi-turn via the object var `dialog.turns` (a top-level list var would
    // matrix-expand into one test per element); else the single rendered prompt.
    const turns = Array.isArray(context?.vars?.dialog?.turns) ? context.vars.dialog.turns : [prompt];
    const messages = [];
    let final = null;
    for (let i = 0; i < turns.length; i++) {
      messages.push({ id: `u${i + 1}`, role: "user", parts: [{ type: "text", text: turns[i] }] });
      const assistant = await postTurn(messages, mount, locale);
      if (assistant) {
        messages.push(assistant);
      }
      final = assistant;
    }
    const d = digest(final);
    return {
      output: d.output,
      metadata: {
        picks: d.picks,
        pickGroups: d.pickGroups,
        sortBys: d.sortBys,
        openedCine: d.openedCine,
        overMatched: d.overMatched,
        recalledIds: d.recalledIds,
        turnsRun: turns.length,
      },
    };
  }
}
