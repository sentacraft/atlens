import { readFileSync } from "node:fs";
import { DefaultChatTransport, readUIMessageStream } from "ai";
// The real implementation: a copy of the hash would drift silently.
import { lensRef, LENS_LINK_PREFIX } from "../../src/lib/ai/lens-ref.ts";
import { MODEL_PRESET_HEADER } from "../../src/lib/ai/model-presets.ts";
import { askIrisChatRequestBody } from "../../src/lib/askiris/chat-request.ts";

const ORIGIN = "http://localhost:3000";
const ENDPOINT = `${ORIGIN}/api/chat`;

const LENS_LINK_RE = new RegExp(`\\]\\(${LENS_LINK_PREFIX}([^)\\s]+)\\)`, "g");

// Judges see rendered links: shown raw, they fail replies for leaking refs.
const LENS_LINK_DISPLAY_RE = new RegExp(`\\[([^\\]]+)\\]\\(${LENS_LINK_PREFIX}[^)\\s]+\\)`, "g");
const COMPARE_LINK_RE = /\[([^\]]+)\]\(compare:([^)\s]+)\)/g;

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

// /api/chat needs a session, as the browser's first turn gets one; one anonymous user
// serves the whole run.
let sessionCookie;
async function signIn() {
  sessionCookie ??= fetch(`${ORIGIN}/api/auth/sign-in/anonymous`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json" },
    body: "{}",
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`anonymous sign-in failed: ${response.status}`);
    }
    return response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
  });
  return sessionCookie;
}

// The browser's own transport and request body, so the eval sends what the real client sends.
const transport = new DefaultChatTransport({
  api: ENDPOINT,
  headers: async () => ({ cookie: await signIn() }),
  prepareSendMessagesRequest: ({ id, messages, body }) => ({
    body: askIrisChatRequestBody({ id, messages, body }),
  }),
});

// A case's `gear` var ({ bodies, lenses } catalog ids) and `favorites` var ({ lenses } catalog ids, newest
// first) stand in for a signed-in user's profile. The dev server honors these headers; production
// builds ignore them.
const EVAL_GEAR_HEADER = "x-askiris-eval-gear";
const EVAL_FAVORITES_HEADER = "x-askiris-eval-favorites";

// ASKIRIS_MODEL names a Test Hook model preset (src/lib/ai/model-presets.ts) for the whole run;
// unset, the dev server's default model answers.
const MODEL_PRESET = process.env.ASKIRIS_MODEL;

function profileHeaders(vars) {
  const headers = MODEL_PRESET ? { [MODEL_PRESET_HEADER]: MODEL_PRESET } : {};
  if (vars?.gear) {
    headers[EVAL_GEAR_HEADER] = JSON.stringify(vars.gear);
  }
  // `{ lenses: [...] }`, an object for the same reason `dialog` is: a list var matrix-expands.
  if (vars?.favorites?.lenses) {
    headers[EVAL_FAVORITES_HEADER] = JSON.stringify(vars.favorites.lenses);
  }
  return headers;
}

async function postTurn(messages, mount, locale, conversationId, vars, continuing) {
  const stream = await transport.sendMessages({
    chatId: conversationId,
    messages,
    trigger: "submit-message",
    // A case's `page` var is the page the turn is asked from, as the Iris panel sends it.
    body: { mount, locale, ...(vars?.page ? { page: vars.page } : {}) },
    headers: profileHeaders(vars),
  });
  let msg = null;
  for await (const m of readUIMessageStream({ stream, message: continuing, onError: () => {} })) {
    msg = m;
  }
  return msg;
}

// The gear card stops a turn until the user answers it. The eval answers as a guest who
// declines (or as the case's `gearCardAnswer`) and lets Iris carry on, so the rest of the
// reply is still graded. A case with `stopAtGearCard` grades only whether the card showed,
// so it ends the dialog there instead of paying for the recommendation that follows.
function answerGearCard(message, outcome) {
  let answered = false;
  const parts = message.parts.map((part) => {
    if (part.type === "tool-askForGear" && part.state === "input-available") {
      answered = true;
      return { ...part, state: "output-available", output: { outcome } };
    }
    return part;
  });
  return answered ? { ...message, parts } : null;
}

function refsFromOutput(output) {
  const refs = [];
  if (output && typeof output === "object") {
    for (const v of Object.values(output)) {
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item && typeof item === "object" && Array.isArray(item.matches)) {
            refs.push(...refsFromOutput(item));
            continue;
          }
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
  const toolsCalled = [];
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
    toolsCalled.push(name);
    if (name === "queryLenses") {
      const inputs = Array.isArray(part.input?.queries) ? part.input.queries : [];
      inputs.forEach((input, i) => {
        const result = part.output?.results?.[i];
        const returned = Array.isArray(result?.matches) ? result.matches.length : 0;
        queries.push({
          input: input ?? {},
          totalMatched: typeof result?.totalMatched === "number" ? result.totalMatched : returned,
          returned,
        });
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
      tables.push({
        ids,
        columns,
        names: part.output.lenses.map((l) => l.name ?? null),
        rows: part.output.lenses.map((l) => ({
          id: l.id,
          fmin: Array.isArray(l.focalNativeMm) ? l.focalNativeMm[0] : null,
          fmax: Array.isArray(l.focalNativeMm) ? l.focalNativeMm[1] : null,
          weightG: l.weightG ?? null,
          price: l.price?.amount ?? null,
          af: l.af ?? null,
        })),
      });
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
    toolsCalled,
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
    const conversationId = crypto.randomUUID();
    const messages = [];
    const convo = [];
    const recalledEver = new Set();
    // Lenses shown on a card or table row in any turn: a later turn may link back to them.
    const shownEver = new Set();
    let gearCardShown = false;
    let d = digest(null);
    for (let i = 0; i < turns.length; i++) {
      messages.push({ id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text: turns[i] }] });
      convo.push(`[User] ${turns[i]}`);
      let assistant = await postTurn(messages, mount, locale, conversationId, context?.vars);
      const answered = assistant && answerGearCard(assistant, context?.vars?.gearCardAnswer ?? "not_signed_in");
      if (answered) {
        gearCardShown = true;
        if (!context?.vars?.stopAtGearCard) {
          assistant = await postTurn([...messages, answered], mount, locale, conversationId, context?.vars, answered);
        }
      }
      if (assistant) {
        messages.push(assistant);
        d = digest(assistant);
        for (const ref of d.recalledRefs) {
          recalledEver.add(ref);
        }
        for (const id of [...d.picks.map((p) => p.id), ...d.tables.flatMap((t) => t.ids)]) {
          shownEver.add(id);
        }
        convo.push(`[Iris]\n${d.output}`);
      }
      if (gearCardShown && context?.vars?.stopAtGearCard) {
        break;
      }
    }
    const transcript = convo.join("\n\n") || "(empty)";
    const linkRefs = [...transcript.matchAll(LENS_LINK_RE)].map((m) => m[1]);
    const compareLinks = [...transcript.matchAll(COMPARE_LINK_RE)].map((m) => m[2].split(","));
    const readable = transcript.replace(LENS_LINK_DISPLAY_RE, "$1").replace(COMPARE_LINK_RE, "$1 (compare page link)");
    // Recalled refs only: five base36 chars collide with ordinary words.
    const bareRefs = [...recalledEver].filter((ref) => new RegExp(`\\b${ref}\\b`).test(readable));
    return {
      output: readable,
      metadata: {
        bareRefs,
        linkIds: linkRefs.map((ref) => REF_TO_ID.get(ref) ?? ref),
        unknownLinkIds: [...new Set(linkRefs.filter((ref) => !REF_TO_ID.has(ref)))],
        compareLinks,
        shownIds: [...shownEver],
        picks: d.picks,
        pickGroups: d.pickGroups,
        tables: d.tables,
        queries: d.queries,
        searches: d.searches,
        details: d.details,
        recalledRefs: d.recalledRefs,
        steps: d.steps,
        preToolText: d.preToolText,
        toolsCalled: d.toolsCalled,
        gearCardShown,
        turnsRun: turns.length,
      },
    };
  }
}
