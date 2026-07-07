import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type ModelMessage,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAgentModel, agentProviderOptions } from "@/lib/ai/model";
import { buildLensTools } from "@/lib/ai/tools";
import { clientIp, isBypassed, checkRateLimit, recordTokens } from "@/lib/ai/rate-limit";
import { MOUNTS } from "@/lib/mount";
import { routing } from "@/i18n/routing";
import type { Mount } from "@/lib/types";

// The AskIris streaming endpoint. mount + locale are supplied by the client (both
// fixed by the page's route), so the agent is scoped to one mount and answers in
// one language. Runs on the Cloudflare workerd runtime via OpenNext — validate
// streaming with `npm run preview`, not just `next dev`.

const MOUNT_LABEL: Record<Mount, string> = {
  X: "Fujifilm X mount (APS-C)",
  G: "Fujifilm G mount (medium format)",
};

function systemPrompt(mount: Mount, locale: string): string {
  const language = locale === "zh" ? "Chinese" : "English";
  return [
    `You help users find lenses for ${MOUNT_LABEL[mount]}. You recall and compare`,
    `candidates by their specs — you never tell the user which one to buy, and you`,
    `never state a spec that isn't in a tool result. If a request isn't about`,
    `choosing or comparing lenses, say plainly that your knowledge only covers lens`,
    `questions and don't attempt it.`,
    ``,
    `Speak as a warm, concise advisor.`,
    ``,
    `Turn the user's needs into tool calls. The mount and the user's region are`,
    `fixed by context — don't ask about them.`,
    ``,
    `Most requests have one spec that looks like the whole answer, but it rarely`,
    `is: it trades against the others the user also cares about (price, size, focus`,
    `type, reach). Sorting by that one axis and featuring its top few buries the`,
    `lens that wins on another; hardening a mere preference into a filter drops`,
    `otherwise-fitting lenses. Weigh the trade across axes when you choose what to`,
    `feature, and when you pass on a lens that looked an obvious fit, say why in a line.`,
    ``,
    `When a request is underspecified, assume a sensible reading and recall on it,`,
    `but name the assumption and invite a correction — the focal you read a`,
    `"portrait" as, or, when no budget / speed / size priority is stated, the one`,
    `you let drive the picks — never presenting it as the only reading.`,
    ``,
    `When your picks land clear of a stated budget or limit — all well under the`,
    `budget, say — point that out and re-orient (the budget isn't the constraint;`,
    `ask what should drive the pick) instead of quietly spending to it.`,
    ``,
    `Each price carries its sample date and source — a rough marker, not a live quote. Don't`,
    `quote an exact price gap between lenses; for a current figure, point to a lens's page.`,
    ``,
    `Once you've narrowed to your picks, present them by calling recommendLenses`,
    `with 3–6 lens ids — this renders a grid of cards. You may call it more than`,
    `once to group picks around different priorities. For a specific-lens lookup or`,
    `a quick factual answer, reply in prose without cards.`,
    ``,
    `Each card carries its own reason, so a lens's case belongs there: one to three`,
    `natural sentences on what it's good for and its main trade-off. Keep the prose`,
    `around the cards to a short synthesis — frame your assumption, a brief lead-in`,
    `per group, a short close. Don't restate each lens's case in the prose or write`,
    `a separate pros-and-cons section; the cards hold that.`,
    ``,
    `Always refer to a lens by its exact "name" field from the tool result; never`,
    `reassemble a name from parts or abbreviate it, so every mention is identical.`,
    `Structure prose with short headings.`,
    ``,
    `Reply in ${language}; if the user writes in another language, match theirs.`,
  ].join("\n");
}

// Wire contract for POST /api/chat. mount/locale draw their allowed values from
// the same sources the rest of the app does (MOUNTS, routing.locales), so adding
// a mount or locale can't drift this route out of sync. messages is the SDK's own
// shape — validated as an array, its elements trusted to the transport.
const chatRequestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
  mount: z.enum(MOUNTS),
  locale: z.enum(routing.locales),
});

// Max agentic steps per turn (one step = one model generation, possibly with tool
// calls). Bounds worst-case cost/latency; shared by stopWhen and the budget-hit log.
const STEP_BUDGET = 8;

export async function POST(req: Request) {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error("[askiris] DEEPSEEK_API_KEY is not set");
    return Response.json({ error: "Service temporarily unavailable", kind: "unavailable" }, { status: 500 });
  }

  const parsed = chatRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    // Keep the validator detail server-side; the client only ever sends this shape, so
    // a failure is a bug or abuse — surface a generic message, not the schema output.
    console.warn("[askiris] invalid request", z.prettifyError(parsed.error));
    return Response.json({ error: "Invalid request", kind: "unavailable" }, { status: 400 });
  }
  const { messages, mount, locale } = parsed.data;
  const tAskIris = await getTranslations({ locale, namespace: "AskIris" });

  // Abuse guard for this public, no-login endpoint. Fail-open by design: with no KV
  // binding (e.g. `next dev`) or on any KV hiccup we proceed unlimited rather than
  // break the chat. See src/lib/ai/rate-limit.ts for the burst + daily-token design.
  const ip = clientIp(req);
  let rateKv: KVNamespace | undefined;
  let waitUntil: ((p: Promise<unknown>) => void) | undefined;
  try {
    const { env, ctx } = getCloudflareContext();
    rateKv = (env as CloudflareEnv).RATE_KV;
    waitUntil = ctx.waitUntil.bind(ctx);
    if (rateKv && ip && !isBypassed(req, process.env.RATE_LIMIT_BYPASS)) {
      const verdict = await checkRateLimit(rateKv, ip);
      if (!verdict.ok) {
        return Response.json({ error: tAskIris("rateLimited"), kind: "rate_limit" }, { status: 429 });
      }
    }
  } catch {
    // Never let a missing binding or KV error break chat.
  }

  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  const tools = buildLensTools(mount, locale, tBrand);

  // Convert up front so a malformed history fails as a clean 400, not an uncaught
  // throw. The same `tools` must reach convertToModelMessages and streamText:
  // recommendLenses.toModelOutput runs during conversion to trim its model output.
  let modelMessages: ModelMessage[];
  try {
    modelMessages = await convertToModelMessages(messages, { tools });
  } catch (error) {
    console.error("[askiris] failed to convert messages", error);
    return Response.json({ error: "Invalid request", kind: "unavailable" }, { status: 400 });
  }

  const result = streamText({
    model: getAgentModel(),
    providerOptions: agentProviderOptions,
    system: systemPrompt(mount, locale),
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(STEP_BUDGET),
    // Reserve the last allowed step for a text answer: forcing toolChoice "none" means a
    // turn that reaches the budget ends with a synthesis, not a frozen dangling tool call.
    prepareStep: ({ stepNumber }) =>
      stepNumber >= STEP_BUDGET - 1 ? { toolChoice: "none" } : undefined,
    // Fold the finished turn's real token usage (summed across all steps) into the
    // daily budgets. waitUntil keeps the write alive past the streamed response.
    onEnd: ({ usage, stepNumber }) => {
      // The last allowed step is forced to a text answer (prepareStep), so a turn that
      // spends its whole budget ends on that wrap-up step. Detect the budget biting by
      // the final step index reaching the cap — the model was still calling tools and
      // got cut off. (finishReason can't reveal this: the forced step ends on "stop".)
      if (stepNumber >= STEP_BUDGET - 1) {
        console.warn(`[askiris] step budget (${STEP_BUDGET}) reached — turn forced to wrap up at final step`);
      }
      const tokens = usage.totalTokens;
      if (rateKv && ip && waitUntil && typeof tokens === "number") {
        waitUntil(
          recordTokens(rateKv, ip, tokens).catch((error) =>
            console.error("[askiris] failed to record tokens", error),
          ),
        );
      }
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      // Log the real provider error server-side (Workers Logs) but surface only a
      // generic, localized message — this is a public endpoint, so the raw error
      // (provider internals, quota/config hints) must not reach the client.
      onError: (error) => {
        console.error("[askiris] stream error", error);
        return tAskIris("streamError");
      },
    }),
  });
}
