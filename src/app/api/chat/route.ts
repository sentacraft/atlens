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
import {
  getAgentModel,
  agentProviderOptions,
  missingAgentModelKey,
  AGENT_TEMPERATURE,
} from "@/lib/ai/model";
import { systemPrompt } from "@/lib/ai/system-prompt";
import { buildLensTools } from "@/lib/ai/tools";
import { clientIp, isBypassed, checkRateLimit, recordTokens } from "@/lib/ai/rate-limit";
import { chatErrorResponse } from "@/lib/ai/chat-errors";
import { askirisTurnDataPoint } from "@/lib/analytics/events";
import { parseSid, parseInternal } from "@/lib/analytics/session";
import { MOUNTS } from "@/lib/mount";
import { routing } from "@/i18n/routing";

// The AskIris streaming endpoint. mount + locale are supplied by the client (both
// fixed by the page's route), so the agent is scoped to one mount and answers in
// one language. Runs on the Cloudflare workerd runtime via OpenNext — validate
// streaming with `npm run preview`, not just `next dev`.

// Wire contract for POST /api/chat. mount/locale draw their allowed values from
// the same sources the rest of the app does (MOUNTS, routing.locales), so adding
// a mount or locale can't drift this route out of sync. messages is the SDK's own
// shape — validated as an array, its elements trusted to the transport.
const chatRequestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
  mount: z.enum(MOUNTS),
  locale: z.enum(routing.locales),
  // Client-minted conversation-segment id (a fresh one per mount switch / "new
  // chat"). Optional so a handoff or older client that omits it still succeeds.
  segmentId: z.string().max(64).optional(),
});

// Max agentic steps per turn (one step = one model generation, possibly with tool
// calls). Bounds worst-case cost/latency; shared by stopWhen and the budget-hit log.
const STEP_BUDGET = 8;

// Hard ceiling on one turn's streaming, so a stuck provider connection can't hang the
// request indefinitely. Generous — a legit multi-step turn on a slow provider runs
// tens of seconds; this only bites a true hang.
const STREAM_TIMEOUT_MS = 120_000;

export async function POST(req: Request) {
  // Whichever provider AGENT_MODEL selects, not a hardcoded one.
  const missingKey = missingAgentModelKey();
  if (missingKey) {
    console.error(`[askiris] ${missingKey} is not set`);
    return chatErrorResponse("unavailable", 500);
  }

  const parsed = chatRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    // Keep the validator detail server-side; the client only ever sends this shape, so
    // a failure is a bug or abuse — surface a generic message, not the schema output.
    console.warn("[askiris] invalid request", z.prettifyError(parsed.error));
    return chatErrorResponse("unavailable", 400);
  }
  const { messages, mount, locale, segmentId } = parsed.data;

  // Abuse guard for this public, no-login endpoint. Fail-open by design: with no KV
  // binding (e.g. `next dev`) or on any KV hiccup we proceed unlimited rather than
  // break the chat. See src/lib/ai/rate-limit.ts for the burst + daily-token design.
  const ip = clientIp(req);
  const cookieHeader = req.headers.get("cookie");
  // Read the anonymous visit id set by /api/track; "" for a turn before its first
  // call. We only read it here — /api/track owns minting and refreshing the cookie.
  const sid = parseSid(cookieHeader) ?? "";
  // Secret-gated bypass: skips the rate limiter AND (as internal traffic) drops the
  // turn from the dashboard. xg_internal can also mark a turn internal, but must not
  // grant the bypass — so the limiter checks `bypassed` only, not `internal`.
  const bypassed = isBypassed(req, process.env.RATE_LIMIT_BYPASS);
  const internal = parseInternal(cookieHeader) || bypassed;
  let rateKv: KVNamespace | undefined;
  let ae: AnalyticsEngineDataset | undefined;
  let ctx: ExecutionContext | undefined;
  try {
    const cf = getCloudflareContext();
    rateKv = cf.env.RATE_KV;
    ae = cf.env.ANALYTICS;
    ctx = cf.ctx;
    if (rateKv && ip && !bypassed) {
      const verdict = await checkRateLimit(rateKv, ip);
      if (!verdict.ok) {
        return chatErrorResponse("rate_limit", 429);
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
    return chatErrorResponse("unavailable", 400);
  }

  const result = streamText({
    model: getAgentModel(),
    providerOptions: agentProviderOptions,
    temperature: AGENT_TEMPERATURE,
    system: systemPrompt(mount, locale),
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(STEP_BUDGET),
    // Cap total streaming time so a stuck provider connection can't hang the request.
    abortSignal: AbortSignal.timeout(STREAM_TIMEOUT_MS),
    // Reserve the last allowed step for a text answer: forcing toolChoice "none" means a
    // turn that reaches the budget ends with a synthesis, not a frozen dangling tool call.
    prepareStep: ({ stepNumber }) =>
      stepNumber >= STEP_BUDGET - 1 ? { toolChoice: "none" } : undefined,
    // On turn end: emit one metrics row to AE and fold the token usage into the daily
    // budgets. waitUntil keeps the KV write alive past the streamed response.
    onEnd: ({ usage, stepNumber }) => {
      // Record the finished turn as one AE row (server-only — the client can't see
      // token usage). The last allowed step is forced to a text answer, so a turn that
      // spent its whole budget ends on that wrap-up step; the final step index reaching
      // the cap is how the budget biting is detected (finishReason can't — it's "stop").
      if (ae) {
        try {
          ae.writeDataPoint(
            askirisTurnDataPoint({
              mount,
              locale,
              sid,
              segmentId: segmentId ?? "",
              internal,
              totalTokens: usage.totalTokens ?? 0,
              inputTokens: usage.inputTokens ?? 0,
              outputTokens: usage.outputTokens ?? 0,
              cacheReadTokens: usage.inputTokenDetails?.cacheReadTokens ?? 0,
              stepCount: stepNumber + 1,
              budgetHit: stepNumber >= STEP_BUDGET - 1,
            }),
          );
        } catch (error) {
          console.error("[askiris] failed to write turn metrics", error);
        }
      }
      // Dev-only spend readout. The AE row is the durable record, but it is not legible
      // while a candidate is being swept, and cost on this workload is decided by one
      // number the row hides in aggregate: how much of the input the provider served
      // from its cache, which is billed at a fraction of the rest.
      if (process.env.NODE_ENV !== "production") {
        const input = usage.inputTokens ?? 0;
        const cached = usage.inputTokenDetails?.cacheReadTokens ?? 0;
        const hit = input ? Math.round((cached / input) * 100) : 0;
        console.log(
          `[askiris] in ${input} (cached ${cached} = ${hit}%) · out ${usage.outputTokens ?? 0} · ${stepNumber + 1} steps`,
        );
      }
      const tokens = usage.totalTokens;
      if (rateKv && ip && ctx && typeof tokens === "number") {
        ctx.waitUntil(
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
      // Log the real provider error server-side (Workers Logs); this is a public
      // endpoint, so the raw error (provider internals, quota/config hints) must not
      // reach the client. The returned string only masks it in the stream — the
      // client classifies a stream error as transient and shows its own copy — so a
      // bare constant is enough, not prose.
      onError: (error) => {
        console.error("[askiris] stream error", error);
        return "Stream error";
      },
    }),
  });
}
