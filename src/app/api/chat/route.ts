import type { NextRequest } from "next/server";
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
  agentCallSettings,
  missingAgentModelKey,
} from "@/lib/ai/model";
import { gearPrompt, pagePrompt, systemPrompt } from "@/lib/ai/system-prompt";
import { pageLensRefs, resolvePageContext } from "@/lib/ai/page-context";
import { pagePathSchema } from "@/lib/askiris/page-path";
import { findAgentModelPreset, MODEL_PRESET_HEADER } from "@/lib/ai/model-presets";
import { describeGear, EVAL_GEAR_HEADER, evalGear, type GearStatus } from "@/lib/ai/gear-context";
import { EVAL_FAVORITES_HEADER, evalFavorites } from "@/lib/ai/favorites";
import { listUserFavorites } from "@/lib/me/favorites-repository";
import { ASK_FOR_GEAR, gearRequestDeclined } from "@/lib/ai/gear-request";
import { listUserGear } from "@/lib/me/gear-repository";
import { buildLensTools, seedRecalledRefs } from "@/lib/ai/tools";
import { hasRepeatedToolFailure, withRepeatedFailureNotice } from "@/lib/ai/repeated-tool-failure";
import { isOverTokenBudget, recordTokens } from "@/lib/ai/token-budget";
import { clientIp, isBypassed, isRateLimited } from "@/lib/rate-limit";
import { chatErrorResponse } from "@/lib/ai/chat-errors";
import { anonymizeId } from "@/lib/analytics/anonymize";
import { ASKIRIS_TURN_EVENT, type AskIrisTurnProps } from "@/lib/analytics/events";
import { isInternalBrowser, readVid } from "@/lib/analytics/session";
import { insertEvent } from "@/lib/analytics/store";
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
import { MAX_CONVERSATION_TITLE_LENGTH } from "@/lib/askiris/conversation-contract";
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
  id: z.uuid(),
  page: pagePathSchema.optional(),
});

const STEP_BUDGET = 8;

const STREAM_TIMEOUT_MS = 120_000;

/** Runs one Ask Iris turn and streams the reply, saving it to the conversation. Any session, guests included; 401 without one, 429 when over the rate limit or token budget. */
export async function POST(req: NextRequest) {
  const model = activeAgentModel(
    process.env.NODE_ENV === "production" ? undefined : findAgentModelPreset(req.headers.get(MODEL_PRESET_HEADER)),
  );
  const missingKey = missingAgentModelKey(model);
  if (missingKey) {
    console.error(`[askiris] ${missingKey} is not set`);
    return chatErrorResponse("unavailable", 500);
  }

  const parsed = chatRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    console.warn("[askiris] invalid request", z.prettifyError(parsed.error));
    return chatErrorResponse("unavailable", 400);
  }
  const { message, previousMessageId, mount, locale, id: conversationId, page } = parsed.data;
  const startedAt = Date.now();
  const traceId = crypto.randomUUID();
  const traceCollector = new AskIrisTraceCollector(startedAt);

  const ip = clientIp(req);
  const vid = readVid(req.cookies);
  // atlens_internal marks a turn internal but must never grant the rate-limit bypass.
  const bypassed = isBypassed(req);
  const internal = isInternalBrowser(req.cookies) || bypassed;
  let rateKv: KVNamespace | undefined;
  let analyticsDb: D1Database | undefined;
  let traceDb: D1Database | undefined;
  let appDb: D1Database | undefined;
  let releaseId: string | undefined;
  let ctx: ExecutionContext | undefined;
  let userId: string | undefined;
  let isAccount = false;
  try {
    const cf = getCloudflareContext();
    rateKv = cf.env.RATE_KV;
    analyticsDb = cf.env.ANALYTICS_DB;
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
    isAccount = Boolean(session?.user && !session.user.isAnonymous);
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
  const brandName = (slug: string) => (tBrand.has(slug) ? tBrand(slug) : slug);
  const pageContext = page
    ? resolvePageContext(page, locale, {
        brand: brandName,
        list: await getTranslations({ locale, namespace: "LensList" }),
        badge: await getTranslations({ locale, namespace: "SpecialtyBadge" }),
      })
    : null;
  const gearStatus = await loadGearStatus(req, appDb, userId, isAccount);
  // Filled once the history is resolved below; validate needs the tools before that.
  const recalledRefs = new Set<string>();
  const tools = withRepeatedFailureNotice(
    buildLensTools(
      mount,
      locale,
      tBrand,
      () => loadFavorites(req, appDb, userId, isAccount),
      recalledRefs,
    ),
  );
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
  const turn = resolveTurn(stored, incoming.data[0], previousMessageId, [ASK_FOR_GEAR]);
  if (turn.kind === "invalid") {
    return chatErrorResponse("unavailable", 400);
  }
  const { history, userMessage, historyChanged } = turn;
  seedRecalledRefs(recalledRefs, history);
  for (const ref of pageLensRefs(pageContext)) {
    recalledRefs.add(ref);
  }
  const offerGearCard =
    !(gearStatus.kind === "account" && gearStatus.gear.length > 0) && !gearRequestDeclined(history);
  const messageContext = traceMessageContext(history);
  const analyticsConversationId = await anonymizeId(
    conversationId,
    process.env.ANALYTICS_ID_SECRET,
  );

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
      modelName: model.reasoning === "off" ? model.modelId : `${model.modelId}:reasoning-${model.reasoning}`,
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
    ...agentCallSettings(model),
    // The gear note is its own message after the fixed prompt, so that prompt stays identical
    // across users for prompt caching.
    instructions: [
      { role: "system", content: systemPrompt(mount, locale) },
      {
        role: "system",
        content: gearPrompt(describeGear(gearStatus, brandName), { cardAvailable: offerGearCard }),
      },
      ...(pageContext ? [{ role: "system" as const, content: pagePrompt(pageContext) }] : []),
    ],
    messages: modelMessages,
    tools,
    activeTools: offerGearCard ? undefined : toolNamesWithout(tools, ASK_FOR_GEAR),
    stopWhen: stepCountIs(STEP_BUDGET),
    // req.signal only fires on Workers with the enable_request_signal compatibility flag.
    abortSignal: AbortSignal.any([req.signal, AbortSignal.timeout(STREAM_TIMEOUT_MS)]),
    prepareStep: ({ stepNumber, steps }) =>
      stepNumber >= STEP_BUDGET - 1 || hasRepeatedToolFailure(steps)
        ? { toolChoice: "none" }
        : undefined,
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
      if (analyticsDb) {
        const write = insertEvent(analyticsDb, {
          event: ASKIRIS_TURN_EVENT,
          ts: Date.now(),
          vid,
          locale,
          path: null,
          signedIn: isAccount,
          internal,
          props: {
            mount,
            conversation_id: analyticsConversationId,
            total_tokens: usage.totalTokens ?? 0,
            input_tokens: usage.inputTokens ?? 0,
            output_tokens: usage.outputTokens ?? 0,
            cache_read_tokens: usage.inputTokenDetails?.cacheReadTokens ?? 0,
            step_count: stepNumber + 1,
            budget_hit: stepNumber >= STEP_BUDGET - 1,
            max_context_tokens: maxContextTokens,
          } satisfies AskIrisTurnProps,
        }).catch((error: unknown) => console.error("[askiris] failed to write turn metrics", error));
        ctx?.waitUntil(write);
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
        if (result.outcome.status === "failed") {
          markStreamError(result.outcome.error);
        }
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
          ).slice(0, MAX_CONVERSATION_TITLE_LENGTH),
          userMessage: turn.kind === "new" ? userMessage : undefined,
          replaceAfterMessageId: turn.kind === "new" ? undefined : userMessage.id,
          responseMessage: result.responseMessage,
          context: { mount, locale, ...(page ? { page } : {}) },
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
      // Public endpoint: raw provider errors stay in the server log. Tool errors also pass
      // through here; the model sees them and usually recovers, so they must not fail the turn.
      onError: () => "Stream error",
    }),
  });
}

async function loadGearStatus(
  req: Request,
  appDb: D1Database,
  userId: string,
  isAccount: boolean,
): Promise<GearStatus> {
  const testGear = process.env.NODE_ENV === "production" ? undefined : evalGear(req.headers.get(EVAL_GEAR_HEADER));
  if (testGear) {
    return { kind: "account", gear: testGear };
  }
  if (!isAccount) {
    return { kind: "guest" };
  }
  try {
    return { kind: "account", gear: await listUserGear(appDb, userId) };
  } catch (error) {
    console.error("[askiris] failed to load gear", error);
    return { kind: "unavailable" };
  }
}

async function loadFavorites(
  req: Request,
  appDb: D1Database,
  userId: string,
  isAccount: boolean,
): Promise<string[] | null> {
  const testFavorites =
    process.env.NODE_ENV === "production" ? undefined : evalFavorites(req.headers.get(EVAL_FAVORITES_HEADER));
  if (testFavorites) {
    return testFavorites;
  }
  if (!isAccount) {
    return null;
  }
  return (await listUserFavorites(appDb, userId)).map((favorite) => favorite.lensId);
}

function toolNamesWithout<TOOLS extends Record<string, unknown>>(tools: TOOLS, excluded: string): Array<keyof TOOLS & string> {
  return (Object.keys(tools) as Array<keyof TOOLS & string>).filter((name) => name !== excluded);
}
