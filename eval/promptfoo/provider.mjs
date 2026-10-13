import { readFileSync } from "node:fs";
import { DefaultChatTransport, readUIMessageStream } from "ai";
// The real implementation: a copy of the hash would drift silently.
import { lensRef, LENS_LINK_PREFIX } from "../../src/lib/ai/lens-ref.ts";

const ENDPOINT = "http://localhost:3000/api/chat";

const LENS_LINK_RE = new RegExp(`\\]\\(${LENS_LINK_PREFIX}([^)\\s]+)\\)`, "g");

// Judges see rendered links: shown raw, they fail replies for leaking refs.
const LENS_LINK_DISPLAY_RE = new RegExp(`\\[([^\\]]+)\\]\\(${LENS_LINK_PREFIX}[^)\\s]+\\)`, "g");

const REF_TO_ID = new Map(
  ["lenses.json", "lenses-gfx.json"]
    .flatMap((file) =>
      JSON.parse(readFileSync(new URL(`../../src/data/${file}`, import.meta.url), "utf8")),
    )
    .map((lens) => [lensRef(lens.id), lens.id]),
);

// A field belongs here only if some rubric grades it.
function formatCard(rec) {
  const reason = rec.reason?.trim() ? `\n    ${rec.reason.trim()}` : "";
  return `- ${rec.name}${reason}`;
}

// The browser's own transport, so the eval sends the request the real client builds.
const transport = new DefaultChatTransport({ api: ENDPOINT });

async function postTurn(messages, mount, locale) {
  const stream = await transport.sendMessages({
    chatId: "eval",
    messages,
    trigger: "submit-message",
    body: { mount, locale },
  });
  let msg = null;
  for await (const m of readUIMessageStream({ stream, onError: () => {} })) {
    msg = m;
  }
  return msg;
}

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

function digest(msg) {
  const transcript = [];
  const picks = [];
  const pickGroups = [];
  const tables = [];
  const queries = [];
  const searches = [];
  const details = [];
  const recalledRefs = new Set();
  let steps = 0;
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
        picks.push({
          id: rec.id,
          ref: lensRef(rec.id),
          name: rec.name ?? null,
          mount: rec.mount ?? null,
          reason: rec.reason ?? null,
          fmin: Array.isArray(f) ? f[0] : null,
          fmax: Array.isArray(f) ? f[1] : null,
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
      // Mirrors LensTable.tsx: the caption is prose the rubrics grade; cell values are not.
      const caption = part.output.caption?.trim() ? `\n${part.output.caption.trim()}` : "";
      transcript.push(
        `[table: ${columns.join(", ")}]${caption}\n${part.output.lenses
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
    // An object var: a top-level list var would matrix-expand into one test per element.
    const turns = Array.isArray(context?.vars?.dialog?.turns) ? context.vars.dialog.turns : [prompt];
    const messages = [];
    const convo = [];
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
        convo.push(`[Iris]\n${d.output}`);
      }
    }
    const transcript = convo.join("\n\n") || "(empty)";
    const linkRefs = [...transcript.matchAll(LENS_LINK_RE)].map((m) => m[1]);
    const readable = transcript.replace(LENS_LINK_DISPLAY_RE, "$1");
    // Recalled refs only: five base36 chars collide with ordinary words.
    const bareRefs = [...recalledEver].filter((ref) => new RegExp(`\\b${ref}\\b`).test(readable));
    return {
      output: readable,
      metadata: {
        bareRefs,
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
