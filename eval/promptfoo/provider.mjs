import { readFileSync } from "node:fs";
import { DefaultChatTransport, readUIMessageStream } from "ai";
// The real implementation: a copy of the hash would drift silently.
import { lensRef, LENS_LINK_PREFIX, normalizeRefListLinks } from "../../src/lib/ai/lens-ref.ts";
import { MODEL_PRESET_HEADER } from "../../src/lib/ai/model-presets.ts";
import { askIrisChatRequestBody } from "../../src/lib/askiris/chat-request.ts";

const ORIGIN = "http://localhost:3000";
const ENDPOINT = `${ORIGIN}/api/chat`;

const LENS_LINK_RE = new RegExp(`\\]\\(${LENS_LINK_PREFIX}([^)\\s]+)\\)`, "g");

// Judges see rendered links: shown raw, they fail replies for leaking refs.
const LENS_LINK_DISPLAY_RE = new RegExp(`\\[([^\\]]+)\\]\\(${LENS_LINK_PREFIX}[^)\\s]+\\)`, "g");
const COMPARE_LINK_RE = /\[([^\]]+)\]\(compare:([^)\s]+)\)/g;
const SOURCE_LINK_RE = /\[([^\]]*)\]\(source:([^)\s]+)\)/g;
const REVIEWS_LINK_RE = /\[([^\]]+)\]\(reviews:([^)\s]+)\)/g;

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
    const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]);
    // A guest gets 3 turns a day (src/lib/ai/iris-quota.ts), far fewer than a run needs; the
    // bypass cookie exempts the run and marks its events internal. Needs the same
    // RATE_LIMIT_BYPASS in the dev server's .env.local and in this process's environment.
    if (process.env.RATE_LIMIT_BYPASS) {
      cookies.push(`rate_bypass=${process.env.RATE_LIMIT_BYPASS}`);
    }
    return cookies.join("; ");
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
    body: { mount, locale },
    headers: profileHeaders(vars),
  });
  let msg = null;
  for await (const m of readUIMessageStream({ stream, message: continuing, onError: () => {} })) {
    msg = m;
  }
  return msg;
}

// The gear card, sign-in card, and choice card can stop a turn until the user answers. The eval
// answers as a guest who carries on without signing in (or as the case's `gearCardAnswer` /
// `choiceCardAnswer`) and lets Iris go on, so the rest of the reply is still graded. A case with
// `stopAtGearCard` grades only whether the gear card showed, and cases without `choiceCardAnswer`
// stop at `askChoices` rather than paying for a resumed turn.
function formatChoiceOutput(questions, choiceAnswer) {
  if (choiceAnswer === "skipped") {
    return { output: { outcome: "skipped" }, summary: "(skipped)" };
  }
  const picks = Array.isArray(choiceAnswer)
    ? choiceAnswer
    : Array.isArray(choiceAnswer?.picks)
      ? choiceAnswer.picks
      : null;
  const answers = questions.map((q, i) => {
    const pick = picks ? (picks[i] ?? q.options?.[0]) : q.options?.[0];
    return {
      question: q.question,
      picked: pick ? [pick] : [],
    };
  });
  const summary = answers
    .map((a) => `${a.question}: ${a.picked.join(", ") || "(none)"}`)
    .join(" | ");
  return { output: { outcome: "answered", answers }, summary };
}

function answerCards(message, { gearOutcome, choiceAnswer }) {
  const shown = { gear: false, signIn: false, choice: false };
  let choiceSummary = "";
  const parts = message.parts.map((part) => {
    if (part.type === "tool-askForGear" && part.state === "input-available") {
      shown.gear = true;
      return { ...part, state: "output-available", output: { outcome: gearOutcome } };
    }
    if (part.type === "tool-askChoices" && part.state === "input-available" && choiceAnswer) {
      shown.choice = true;
      const formatted = formatChoiceOutput(part.input?.questions ?? [], choiceAnswer);
      choiceSummary = formatted.summary;
      return { ...part, state: "output-available", output: formatted.output };
    }
    if (part.state === "approval-requested" && !part.approval?.isAutomatic) {
      shown.signIn = true;
      return { ...part, state: "approval-responded", approval: { ...part.approval, approved: false } };
    }
    return part;
  });
  return shown.gear || shown.signIn || shown.choice
    ? { message: { ...message, parts }, shown, choiceSummary }
    : null;
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
  const imageRequests = [];
  const images = [];
  const imageResults = [];
  const mtfGroups = [];
  const reviews = [];
  const recalledRefs = new Set();
  const toolsCalled = [];
  const feedbackDrafts = [];
  const specGuideInputs = [];
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
    if (name === "prepareFeedback") {
      feedbackDrafts.push({ input: part.input, output: part.output });
      transcript.push(`[feedback draft, not submitted]\n${part.output?.description ?? ""}`);
    }
    if (name === "readSpecGuide") {
      specGuideInputs.push(part.input);
    }
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
      details.push(...(part.input?.lenses ?? []).map(({ ref }) => ref));
    }
    if (name === "showLensImages") {
      for (const lens of part.input?.lenses ?? []) {
        imageRequests.push(...(lens.images ?? []).map((request) => ({ ...request, lensId: REF_TO_ID.get(lens.ref) ?? lens.ref })));
      }
      for (const lens of part.output?.lenses ?? []) {
        imageResults.push(...(lens.imageResults ?? []).map((result) => ({ ...result, lensId: REF_TO_ID.get(lens.ref) ?? lens.ref })));
      }
      if (part.output?.mtfGroups) {
        mtfGroups.push({ groups: part.output.mtfGroups.map((g) => ({ ...g, lenses: g.lenses.map((l) => ({ ...l, lensId: REF_TO_ID.get(l.lens) ?? l.lens })) })), between: part.output.betweenGroups ?? null });
      }
      // Every displayed image reaches the model, so `read` is always true.
      const shown = (part.output?.displayImages ?? []).map((image) => ({
        lensId: image.lensId,
        lensName: image.lensName,
        imageRef: image.imageRef,
        role: image.image?.role ?? null,
        read: true,
        galleryCount: image.gallery?.length ?? 1,
        figure: image.figureLabel ?? null,
        id: image.image?.id ?? null,
        spatialFrequency: image.image?.spatialFrequency ?? null,
        focalLengthMm: image.image?.focalLengthMm ?? null,
        apertureFNumbers: image.image?.apertureFNumbers ?? null,
      }));
      images.push(...shown);
      // The judge cannot see pixels; this line tells it what was on screen and read.
      if (shown.length) {
        transcript.push(`[images]\n${shown.map((image) => `- ${image.figure ? `${image.figure}: ` : ""}${image.lensName} ${image.role}${image.id ? ` image ${image.id}` : ""}${image.focalLengthMm ? ` ${image.focalLengthMm}mm` : ""}${image.spatialFrequency ? ` ${image.spatialFrequency.values.join("/")} ${image.spatialFrequency.unit}` : ""}${image.apertureFNumbers ? ` f/${image.apertureFNumbers.join(", f/")}` : ""}${image.galleryCount > 1 ? ` (gallery of ${image.galleryCount})` : ""}, read`).join("\n")}`);
      }
    }
    if (name === "lensReviews") {
      for (const lens of part.output?.lenses ?? []) {
        reviews.push({
          ref: lens.ref,
          aspects: part.input?.aspects ?? null,
          sourceIds: (lens.sources ?? []).map((source) => source.id),
          claims: (lens.claims ?? []).map((claim) => ({
            aspect: claim.aspect,
            agreement: claim.agreement,
            sourceIds: [...claim.sources, ...(claim.details ?? []).map((detail) => detail.id)],
            otherMount: Boolean(claim.otherMount),
            stale: (claim.staleness ?? []).map((entry) => entry.reason),
          })),
        });
      }
    }
    if (name === "searchLensByName") {
      for (const group of part.output?.results ?? []) {
        searches.push({ query: group.query ?? null, refs: refsFromOutput({ matches: group.matches }) });
      }
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
    if (name === "askChoices" && Array.isArray(part.input?.questions)) {
      transcript.push(
        `[question card]\n${part.input.questions.map((q) => `${q.question.replace(/[？?]/g, "")} (${q.options.join(" / ")})`).join("\n")}`,
      );
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
    imageRequests,
    imageResults,
    mtfGroups,
    images,
    reviews,
    recalledRefs: [...recalledRefs],
    steps,
    preToolText,
    toolsCalled,
    feedbackDrafts,
    specGuideInputs,
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
    const reviewsEver = [];
    const allPicks = [];
    const allPickGroups = [];
    const allQueries = [];
    const allSearches = [];
    const allToolsCalled = [];
    let maxSteps = 0;
    let gearCardShown = false;
    let signInCardShown = false;
    let choiceCardShown = false;
    let choiceCardCount = 0;
    let d = digest(null);
    for (let i = 0; i < turns.length; i++) {
      messages.push({ id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text: turns[i] }] });
      convo.push(`[User] ${turns[i]}`);
      let assistant = await postTurn(messages, mount, locale, conversationId, context?.vars);
      for (let round = 0; round < 2 && assistant; round++) {
        const answered = answerCards(assistant, {
          gearOutcome: context?.vars?.gearCardAnswer ?? "not_signed_in",
          choiceAnswer: context?.vars?.choiceCardAnswer,
        });
        if (!answered) {
          break;
        }
        gearCardShown ||= answered.shown.gear;
        signInCardShown ||= answered.shown.signIn;
        choiceCardShown ||= answered.shown.choice;
        if (answered.shown.gear && context?.vars?.stopAtGearCard) {
          break;
        }
        if (answered.shown.choice && answered.choiceSummary) {
          convo.push(`[User choice] ${answered.choiceSummary}`);
        }
        assistant = await postTurn(
          [...messages, answered.message],
          mount,
          locale,
          conversationId,
          context?.vars,
          answered.message,
        );
      }
      if (assistant) {
        messages.push(assistant);
        d = digest(assistant);
        for (const ref of d.recalledRefs) {
          recalledEver.add(ref);
        }
        reviewsEver.push(...d.reviews);
        allPicks.push(...d.picks);
        allPickGroups.push(...d.pickGroups);
        allQueries.push(...d.queries);
        allSearches.push(...d.searches);
        allToolsCalled.push(...d.toolsCalled);
        maxSteps = Math.max(maxSteps, d.steps);
        const turnChoices = d.toolsCalled.filter((t) => t === "askChoices").length;
        if (turnChoices > 0) {
          choiceCardShown = true;
          choiceCardCount += turnChoices;
        }
        convo.push(`[Iris]\n${d.output}`);
      }
      if (gearCardShown && context?.vars?.stopAtGearCard) {
        break;
      }
    }
    const transcript = normalizeRefListLinks(convo.join("\n\n")) || "(empty)";
    const linkRefs = [...transcript.matchAll(LENS_LINK_RE)].map((m) => m[1]);
    const compareLinks = [...transcript.matchAll(COMPARE_LINK_RE)].map((m) => m[2].split(","));
    const sourceLinks = [...transcript.matchAll(SOURCE_LINK_RE)].map((m) => m[2]);
    const reviewSearchLinks = [...transcript.matchAll(REVIEWS_LINK_RE)].map((m) => m[2].split(",").map((ref) => REF_TO_ID.get(ref) ?? ref));
    const fetchedSources = new Set(reviewsEver.flatMap((lens) => lens.sourceIds));
    const readable = transcript
      .replace(LENS_LINK_DISPLAY_RE, "$1")
      .replace(COMPARE_LINK_RE, "$1 (compare page link)")
      .replace(SOURCE_LINK_RE, "[source: $1]")
      .replace(REVIEWS_LINK_RE, "$1 (link to review searches on other sites)");
    // Recalled refs only: five base36 chars collide with ordinary words.
    const bareRefs = [...recalledEver].filter((ref) => new RegExp(`\\b${ref}\\b`).test(readable));
    return {
      output: readable,
      metadata: {
        bareRefs,
        linkIds: linkRefs.map((ref) => REF_TO_ID.get(ref) ?? ref),
        unknownLinkIds: [...new Set(linkRefs.filter((ref) => !REF_TO_ID.has(ref)))],
        compareLinks,
        sourceLinks,
        reviewSearchLinks,
        unknownSourceLinks: sourceLinks.filter((key) => !fetchedSources.has(key)),
        picks: d.picks,
        pickGroups: d.pickGroups,
        allPicks,
        allPickGroups,
        tables: d.tables,
        queries: d.queries,
        allQueries,
        searches: d.searches,
        allSearches,
        details: d.details,
        imageRequests: d.imageRequests,
        imageResults: d.imageResults,
        mtfGroups: d.mtfGroups,
        images: d.images,
        reviews: d.reviews,
        recalledRefs: d.recalledRefs,
        allRecalledRefs: [...recalledEver],
        steps: d.steps,
        maxSteps,
        preToolText: d.preToolText,
        toolsCalled: d.toolsCalled,
        allToolsCalled,
        feedbackDrafts: d.feedbackDrafts,
        specGuideInputs: d.specGuideInputs,
        gearCardShown,
        signInCardShown,
        choiceCardShown,
        choiceCardCount,
        turnsRun: turns.length,
      },
    };
  }
}
