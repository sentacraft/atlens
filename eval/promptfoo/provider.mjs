// promptfoo custom provider: POST each turn to /api/chat, rebuild the assistant
// message with readUIMessageStream, return the transcript + tool-call trace for
// the assertions. See README.md.
import { readFileSync } from "node:fs";
import { readUIMessageStream } from "ai";
// The real implementation, not a copy of it: a second version of the hash would drift
// silently and the eval would just measure the wrong thing. Node strips the types.
import { lensRef, LENS_LINK_PREFIX } from "../../src/lib/ai/lens-ref.ts";

const ENDPOINT = "http://localhost:3000/api/chat";

// Every real lens ref. A `lens:<ref>` link is legitimate exactly when the renderer can
// resolve it, and the renderer checks the catalogue — not what this turn recalled, since
// a link back to a lens from an earlier turn still resolves and still clicks through.
// Read straight off the catalogue files rather than through src/lib/lens/data.ts: that
// module's imports are `@/` aliases, which only TypeScript and the bundler resolve, and
// teaching plain Node to follow them costs more than it saves for a manual harness.
// Both mounts — a G-mount case would otherwise find no refs at all.
// Matches the scheme the renderer parses, built from the same prefix.
const LENS_LINK_RE = new RegExp(`\\]\\(${LENS_LINK_PREFIX}([^)\\s]+)\\)`, "g");

// The same links, whole, so the judge can be handed what a reader actually sees. The
// renderer turns `[name](lens:ref)` into a clickable name; a judge shown the raw form
// reads the ref as leaked internals and fails the reply for doing what the prompt asks.
const LENS_LINK_DISPLAY_RE = new RegExp(`\\[([^\\]]+)\\]\\(${LENS_LINK_PREFIX}[^)\\s]+\\)`, "g");

const REF_TO_ID = new Map(
  ["lenses.json", "lenses-gfx.json"]
    .flatMap((file) =>
      JSON.parse(readFileSync(new URL(`../../src/data/${file}`, import.meta.url), "utf8")),
    )
    .map((lens) => [lensRef(lens.id), lens.id]),
);

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

// Lens refs from any tool output, for the "picks were recalled" check. Recall results
// carry `ref` directly (the id never reaches the model); the render tools echo full
// records, so an id there is converted. Either may sit on the item or under `.lens`.
function refsFromOutput(output) {
  const refs = [];
  if (output && typeof output === "object") {
    for (const v of Object.values(output)) {
      if (Array.isArray(v)) {
        for (const item of v) {
          const lens = item && typeof item === "object" && "lens" in item ? item.lens : item;
          if (lens && typeof lens === "object") {
            if (typeof lens.ref === "string") {
              refs.push(lens.ref);
            } else if (typeof lens.id === "string") {
              refs.push(lensRef(lens.id));
            }
          }
        }
      }
    }
  }
  return refs;
}

// Fold the final turn's message into { output: transcript, ...trace } for the asserts.
// The trace exposes two full-fidelity sources so a new check never needs a new field:
// `picks` is the complete lens projection per recommended lens, and `queries` carries
// each queryLenses call's raw input. Everything else (a sort used, a focus filter, an
// over-match, the cine catalogue) is derived off those in the assertion itself.
function digest(msg) {
  const transcript = [];
  const picks = [];
  const pickGroups = [];
  const tables = [];
  const queries = [];
  const searches = [];
  // Refs the model inspected in full via lensDetails this turn.
  const details = [];
  const recalledRefs = new Set();
  // Third source alongside picks/queries: the agent loop's own state. The route caps a
  // turn at STEP_BUDGET steps and forces the last one to text-only, so a turn that spends
  // its budget recalling can end in prose with nothing rendered — indistinguishable from
  // a deliberate prose answer unless the step count is visible.
  let steps = 0;
  // Text emitted while the turn still had tool calls ahead of it. This is a shape
  // signal, not a violation: opening with the need restated or a focal equivalence
  // worked out is content for the user, and only announcing one's own actions is
  // barred. Counted off part order: non-empty text parts before the final tool part.
  const parts = msg?.parts ?? [];
  const lastToolIndex = parts.findLastIndex(
    (p) => p.type === "dynamic-tool" || (typeof p.type === "string" && p.type.startsWith("tool-")),
  );
  const preToolText = parts.filter(
    (p, i) => p.type === "text" && p.text?.trim() && i < lastToolIndex,
  ).length;
  for (const part of parts) {
    if (part.type === "step-start") {
      steps++;
      continue;
    }
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
      // Raw input (any filter/sort is checkable off it) + result-size counts:
      // returned < totalMatched is the over-match guard's trigger.
      const returned = Array.isArray(part.output?.matches) ? part.output.matches.length : 0;
      queries.push({
        input: part.input ?? {},
        totalMatched: typeof part.output?.totalMatched === "number" ? part.output.totalMatched : returned,
        returned,
      });
    }
    if (name === "lensDetails") {
      details.push(...(part.input?.refs ?? []));
    }
    if (name === "searchLensByName") {
      searches.push({ query: part.input?.query ?? null, refs: refsFromOutput(part.output) });
    }
    for (const ref of refsFromOutput(part.output)) {
      recalledRefs.add(ref);
    }
    if (name === "recommendLenses" && Array.isArray(part.output?.recommendations)) {
      const group = [];
      for (const rec of part.output.recommendations) {
        const f = rec.focalNativeMm;
        const a = rec.maxAperture;
        // Full flat projection of the recommended lens — every spec an assertion might
        // check. No `brand` (ResolvedLens hides it); a non-first-party test uses the id.
        picks.push({
          id: rec.id,
          // The handle the model actually passed; the id beside it is for readable
          // assertion failures, since a ref names nothing on its own.
          ref: lensRef(rec.id),
          name: rec.name ?? null,
          mount: rec.mount ?? null,
          reason: rec.reason ?? null,
          fmin: Array.isArray(f) ? f[0] : null,
          fmax: Array.isArray(f) ? f[1] : null,
          // Wide-open f-number (the wide end for a zoom) — smaller is faster.
          aperture: Array.isArray(a) ? a[0] : (a ?? null),
          weightG: rec.weightG ?? null,
          price: rec.price?.amount ?? null,
          af: rec.af ?? null,
          ois: rec.ois ?? null,
          oisStops: rec.oisStops ?? null,
          magnification: rec.magnification ?? null,
          minFocusDistance: rec.minFocusDistance ?? null,
          opticalTraits: rec.opticalTraits ?? [],
          isCine: rec.isCine ?? null,
          wr: rec.wr ?? null,
          apertureRing: rec.apertureRing ?? null,
          releaseYear: rec.releaseYear ?? null,
        });
        group.push(rec.id);
      }
      pickGroups.push(group);
      transcript.push(`[cards]\n${part.output.recommendations.map(formatCard).join("\n")}`);
    }
    if (name === "listLenses" && Array.isArray(part.output?.lenses)) {
      const ids = part.output.lenses.map((l) => l.id);
      const columns = Array.isArray(part.output.columns) ? part.output.columns : [];
      tables.push({ ids, columns, names: part.output.lenses.map((l) => l.name ?? null) });
      transcript.push(
        `[table: ${columns.join(", ")}]\n${part.output.lenses
          .map((l) => `- ${l.name}`)
          .join("\n")}`,
      );
    }
  }
  return {
    output: transcript.join("\n\n") || "(empty)",
    picks,
    pickGroups,
    tables,
    queries,
    searches,
    details,
    recalledRefs: [...recalledRefs],
    steps,
    preToolText,
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
    // The judge grades the WHOLE conversation (a multi-turn arc is where quality lives),
    // so assemble the full transcript across turns with the latest reply marked. metadata
    // stays the FINAL turn's tool trace — the last rendering is what the JS checks grade.
    const convo = [];
    // Refs recalled by any turn — a ref pasted in turn one's prose is still on the page
    // when a later turn is graded.
    const recalledEver = new Set();
    let d = digest(null);
    for (let i = 0; i < turns.length; i++) {
      messages.push({ id: `u${i + 1}`, role: "user", parts: [{ type: "text", text: turns[i] }] });
      convo.push(`[User] ${turns[i]}`);
      const assistant = await postTurn(messages, mount, locale);
      if (assistant) {
        messages.push(assistant);
        d = digest(assistant);
        for (const ref of d.recalledRefs) {
          recalledEver.add(ref);
        }
        // Every turn is labeled the same — the whole conversation is graded, and the last
        // Iris turn is identifiable by position, so no turn is singled out.
        convo.push(`[Iris]\n${d.output}`);
      }
    }
    const transcript = convo.join("\n\n") || "(empty)";
    // Refs come off the raw text; the graders get the rendered form.
    const linkRefs = [...transcript.matchAll(LENS_LINK_RE)].map((m) => m[1]);
    const readable = transcript.replace(LENS_LINK_DISPLAY_RE, "$1");
    // Recalled refs sitting in the prose outside a link. Matched against recalled refs
    // only — five base36 chars collide with ordinary words if the whole catalogue counts.
    const bareRefs = [...recalledEver].filter((ref) => new RegExp(`\\b${ref}\\b`).test(readable));
    return {
      output: readable,
      metadata: {
        bareRefs,
        // Inline lens references, resolved back to ids so a failing assertion names a
        // lens rather than an opaque handle, plus the ones no catalogue entry backs —
        // those render as dead plain text, which is the defect worth gating on.
        linkIds: linkRefs.map((ref) => REF_TO_ID.get(ref) ?? ref),
        unknownLinkIds: [...new Set(linkRefs.filter((ref) => !REF_TO_ID.has(ref)))],
        picks: d.picks,
        pickGroups: d.pickGroups,
        tables: d.tables,
        queries: d.queries,
        searches: d.searches,
        details: d.details,
        recalledRefs: d.recalledRefs,
        steps: d.steps,
        preToolText: d.preToolText,
        turnsRun: turns.length,
      },
    };
  }
}
