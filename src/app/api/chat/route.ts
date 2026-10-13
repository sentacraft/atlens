import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
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
import {
  appendAskIrisTurn,
  ConversationOwnershipError,
  loadAskIrisTurnHistory,
} from "@/lib/askiris/conversation-repository";
import { resolveTurn } from "@/lib/askiris/turn-history";
import { createAuth } from "@/lib/auth";
import {
  askIrisMessageMetadataSchema,
  type AskIrisUIMessage,
} from "@/lib/askiris/message-metadata";
import { MOUNTS } from "@/lib/mount";
import { routing } from "@/i18n/routing";

const chatRequestSchema = z.object({
  // The rest of the message is checked by validateUIMessages, against the tools.
  message: z.looseObject({ id: z.string().min(1).max(128) }),
  previousMessageId: z.string().max(128).nullable(),
  mount: z.enum(MOUNTS),
  locale: z.enum(routing.locales),
  conversationId: z.uuid(),
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
  const { message, previousMessageId, mount, locale, conversationId } = parsed.data;
  const startedAt = Date.now();
  const traceId = crypto.randomUUID();
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
    // A missing binding (e.g. under `next dev` without one) must not block chat.
  }

  try {
    const session = await createAuth().api.getSession({ headers: req.headers });
    userId = session?.user.id;
  } catch (error) {
    console.error("[askiris] failed to resolve authenticated user", {
      errorType: error instanceof Error ? error.name : "unknown",
    });
  }
  // Every visitor has a session: the client signs in anonymously before its first turn.
  if (!userId || !appDb) {
    return chatErrorResponse("unavailable", userId ? 500 : 401);
  }

  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  const tools = buildLensTools(mount, locale, tBrand);
  const validate = (messages: unknown) =>
    safeValidateUIMessages<AskIrisUIMessage>({
      messages,
      // Only Iris's responses carry metadata.
      metadataSchema: askIrisMessageMetadataSchema.optional(),
      tools,
    });

  const incoming = await validate([message]);
  if (!incoming.success) {
    console.warn("[askiris] invalid message", incoming.error.message.slice(0, 500));
    return chatErrorResponse("unavailable", 400);
  }

  let stored: AskIrisUIMessage[];
  try {
    stored = (await loadAskIrisTurnHistory(appDb, { conversationId, userId })) as AskIrisUIMessage[];
    // validateUIMessages rejects an empty list, which a new conversation has.
    const checked = stored.length > 0 ? await validate(stored) : undefined;
    // Stored turns that no longer match the tool schemas are still replayed: dropping
    // them would erase the conversation's context.
    if (checked && !checked.success) {
      console.warn("[askiris] stored history failed validation", {
        conversationId,
        errorMessage: checked.error.message.slice(0, 500),
      });
    }
  } catch (error) {
    if (error instanceof ConversationOwnershipError) {
      return chatErrorResponse("unavailable", 404);
    }
    console.error("[askiris] failed to load conversation", error);
    return chatErrorResponse("unavailable", 500);
  }
  const turn = resolveTurn(stored, incoming.data[0], previousMessageId);
  if (turn.kind === "invalid") {
    return chatErrorResponse("unavailable", 400);
  }
  const { history, userMessage, historyChanged } = turn;
  const messageContext = traceMessageContext(history);

  const persistTrace = (completion: AskIrisTraceCompletion | undefined) => {
    if (!completion || !traceDb || !messageContext) {
      return;
    }

    const write = writeAskIrisTrace(traceDb, {
      traceId,
      turnId: messageContext.turnId,
      conversationId,
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

  // The same `tools` must reach convertToModelMessages: recommendLenses.toModelOutput runs there.
  // A stopped turn is stored with its unfinished tool calls, which the model cannot take back.
  let modelMessages: ModelMessage[];
  try {
    modelMessages = await convertToModelMessages(history, { tools, ignoreIncompleteToolCalls: true });
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
              conversationId,
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
      originalMessages: history,
      generateMessageId: () => crypto.randomUUID(),
      messageMetadata: ({ part }) => {
        if (part.type !== "start" || !messageContext) {
          return undefined;
        }
        return {
          turnId: messageContext.turnId,
          traceId,
          ...(historyChanged ? { historyChanged: true as const } : {}),
        };
      },
      onEnd: async (result) => {
        persistTrace(traceCollector.finalizeStream(result));
        // A failed turn stores nothing; its retry arrives as a new turn or a regenerate.
        if (result.outcome.status === "failed" || !appDb || !userId) {
          return;
        }
        const save = appendAskIrisTurn(appDb, {
          conversationId,
          userId,
          title: String(
            userMessage.parts.find((part) => part.type === "text")?.text ?? "New conversation",
          ).slice(0, 120),
          userMessage: turn.kind === "new" ? userMessage : undefined,
          replaceAfterMessageId: turn.kind === "regenerate" ? userMessage.id : undefined,
          responseMessage: result.responseMessage,
          context: { mount, locale },
          now: Date.now(),
        }).catch((error) =>
          console.error("[askiris] failed to persist conversation", {
            errorType: error instanceof Error ? error.name : "unknown",
            errorMessage: error instanceof Error ? error.message : String(error),
            conversationId,
          }),
        );
        // Awaited so the stream closes only after the save, letting the client reload the
        // conversation right away; waitUntil covers a stopped turn whose client is gone.
        ctx?.waitUntil(save);
        await save;
      },
      // Public endpoint: raw provider errors stay in the server log.
      onError: (error) => {
        markStreamError(error);
        return "Stream error";
      },
    }),
  });
}
