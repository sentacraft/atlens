import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type ModelMessage,
} from "ai";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  activeAgentModel,
  getAgentModel,
  agentProviderOptions,
  missingAgentModelKey,
  AGENT_TEMPERATURE,
} from "@/lib/ai/model";
import { systemPrompt } from "@/lib/ai/system-prompt";
import { buildLensTools } from "@/lib/ai/tools";
import { isOverTokenBudget, recordTokens } from "@/lib/ai/token-budget";
import { clientIp, isBypassed, isRateLimited } from "@/lib/rate-limit";
import { chatErrorResponse } from "@/lib/ai/chat-errors";
import { askirisTurnDataPoint } from "@/lib/analytics/events";
import { parseSid, parseInternal } from "@/lib/analytics/session";
import {
  AskIrisTraceCollector,
  traceMessageContext,
  type AskIrisTraceCompletion,
} from "@/lib/askiris/trace-capture";
import { workerReleaseId, writeAskIrisTrace } from "@/lib/askiris/trace-repository";
import { saveAskIrisConversationTurn } from "@/lib/askiris/conversation-repository";
import { createAuth } from "@/lib/auth";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";
import { MOUNTS } from "@/lib/mount";
import { routing } from "@/i18n/routing";

const chatRequestSchema = z.object({
  messages: z.array(z.custom<AskIrisUIMessage>()),
  mount: z.enum(MOUNTS),
  locale: z.enum(routing.locales),
  conversationId: z.string().max(64).optional(),
});

const STEP_BUDGET = 8;

const STREAM_TIMEOUT_MS = 120_000;

export async function POST(req: Request) {
  const missingKey = missingAgentModelKey();
  if (missingKey) {
    console.error(`[askiris] ${missingKey} is not set`);
    return chatErrorResponse("unavailable", 500);
  }

  const parsed = chatRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    console.warn("[askiris] invalid request", z.prettifyError(parsed.error));
    return chatErrorResponse("unavailable", 400);
  }
  const { messages, mount, locale, conversationId } = parsed.data;
  const startedAt = Date.now();
  const traceId = crypto.randomUUID();
  const messageContext = traceMessageContext(messages);
  const model = activeAgentModel();
  const traceCollector = new AskIrisTraceCollector(startedAt);

  const ip = clientIp(req);
  const cookieHeader = req.headers.get("cookie");
  const sid = parseSid(cookieHeader) ?? "";
  // xg_internal marks a turn internal but must never grant the rate-limit bypass.
  const bypassed = isBypassed(req);
  const internal = parseInternal(cookieHeader) || bypassed;
  let rateKv: KVNamespace | undefined;
  let ae: AnalyticsEngineDataset | undefined;
  let traceDb: D1Database | undefined;
  let appDb: D1Database | undefined;
  let releaseId: string | undefined;
  let ctx: ExecutionContext | undefined;
  let userId: string | undefined;
  try {
    const cf = getCloudflareContext();
    rateKv = cf.env.RATE_KV;
    ae = cf.env.ANALYTICS;
    traceDb = cf.env.ASKIRIS_DB;
    appDb = cf.env.APP_DB;
    releaseId = workerReleaseId(cf.env.CF_VERSION_METADATA);
    ctx = cf.ctx;
    if (
      (await isRateLimited(req, "chat")) ||
      (rateKv && ip && !bypassed && (await isOverTokenBudget(rateKv, ip)))
    ) {
      return chatErrorResponse("rate_limit", 429);
    }
  } catch {
  }

  try {
    const session = await createAuth().api.getSession({ headers: req.headers });
    userId = session?.user.id;
  } catch (error) {
    console.error("[askiris] failed to resolve authenticated user", {
      errorType: error instanceof Error ? error.name : "unknown",
    });
  }

  const persistTrace = (completion: AskIrisTraceCompletion | undefined) => {
    if (!completion || !traceDb || !messageContext) {
      return;
    }

    const write = writeAskIrisTrace(traceDb, {
      traceId,
      turnId: messageContext.turnId,
      conversationId: conversationId ?? "",
      mount,
      locale,
      userMessage: messageContext.userMessage,
      contextMessageIds: messageContext.contextMessageIds,
      ...completion,
      responseMessageId: completion.responseMessage?.id,
      modelProvider: model.provider,
      modelName: model.modelId,
      releaseId,
      startedAt,
      finishedAt: Date.now(),
      internal,
    }).catch((error) => console.error("[askiris] failed to persist trace", error));

    if (ctx) {
      ctx.waitUntil(write);
    } else {
      void write;
    }
  };

  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  const tools = buildLensTools(mount, locale, tBrand);

  // The same `tools` must reach convertToModelMessages: recommendLenses.toModelOutput runs there.
  let modelMessages: ModelMessage[];
  try {
    modelMessages = await convertToModelMessages(messages, { tools });
  } catch (error) {
    console.error("[askiris] failed to convert messages", error);
    persistTrace(traceCollector.finalizeError("message_conversion_failed"));
    return chatErrorResponse("unavailable", 400);
  }

  const markStreamError = (error: unknown) => {
    if (traceCollector.recordError()) {
      console.error("[askiris] stream error", error);
    }
  };

  const result = streamText({
    model: getAgentModel(),
    providerOptions: agentProviderOptions,
    temperature: AGENT_TEMPERATURE,
    system: systemPrompt(mount, locale),
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(STEP_BUDGET),
    // req.signal only fires on Workers with the enable_request_signal compatibility flag.
    abortSignal: AbortSignal.any([req.signal, AbortSignal.timeout(STREAM_TIMEOUT_MS)]),
    prepareStep: ({ stepNumber }) =>
      stepNumber >= STEP_BUDGET - 1 ? { toolChoice: "none" } : undefined,
    onChunk: ({ chunk }) => traceCollector.recordChunk(chunk),
    onError: ({ error }) => markStreamError(error),
    onStepEnd: (step) => traceCollector.recordStep(step),
    onAbort: () => traceCollector.recordAbort(),
    onEnd: (result) => {
      traceCollector.recordGenerationEnd(result);
      const { usage, stepNumber } = result;
      const maxContextTokens = result.steps.reduce(
        (maximum, step) => Math.max(maximum, step.usage.inputTokens ?? 0),
        0,
      );
      // The last step is forced to text, so finishReason is "stop" even when the budget ran out.
      if (ae) {
        try {
          ae.writeDataPoint(
            askirisTurnDataPoint({
              mount,
              locale,
              sid,
              conversationId: conversationId ?? "",
              internal,
              totalTokens: usage.totalTokens ?? 0,
              inputTokens: usage.inputTokens ?? 0,
              outputTokens: usage.outputTokens ?? 0,
              cacheReadTokens: usage.inputTokenDetails?.cacheReadTokens ?? 0,
              stepCount: stepNumber + 1,
              budgetHit: stepNumber >= STEP_BUDGET - 1,
              maxContextTokens,
            }),
          );
        } catch (error) {
          console.error("[askiris] failed to write turn metrics", error);
        }
      }
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
      originalMessages: messages,
      generateMessageId: () => crypto.randomUUID(),
      messageMetadata: ({ part }) => {
        if (part.type !== "start" || !messageContext) {
          return undefined;
        }
        return {
          turnId: messageContext.turnId,
          traceId,
        };
      },
      onEnd: async (result) => {
        persistTrace(traceCollector.finalizeStream(result));
        if (!userId || !conversationId || result.isAborted || !messageContext) {
          return;
        }

        const currentUserMessage = result.messages.findLast(
          (message) => message.id === messageContext.turnId,
        );
        if (!currentUserMessage) {
          return;
        }

        if (!appDb) {
          return;
        }

        try {
          await saveAskIrisConversationTurn(appDb, {
            conversationId,
            userId,
            title: String(
              currentUserMessage.parts.find((part) => part.type === "text")?.text ??
                "New conversation",
            ).slice(0, 120),
            messages: result.messages,
            currentTurnId: messageContext.turnId,
            responseMessageId: result.responseMessage.id,
            context: { mount, locale },
            now: Date.now(),
          });
        } catch (error) {
          console.error("[askiris] failed to persist conversation", {
            errorType: error instanceof Error ? error.name : "unknown",
            conversationId,
          });
        }
      },
      // Public endpoint: raw provider errors stay in the server log.
      onError: (error) => {
        markStreamError(error);
        return "Stream error";
      },
    }),
  });
}
