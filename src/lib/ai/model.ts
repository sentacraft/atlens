import { deepseek } from "@ai-sdk/deepseek";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

// Iris's production model — the single source of truth. Qwen3.7-plus goes through
// Alibaba's own endpoint rather than a gateway: the list price is the same either way,
// but first-party billing is where the promotional rate and the free allowance live,
// and a gateway's dollar price is pegged to a fixed exchange rate that drifts against
// the yuan one. Swapping it is a one-line change confined here.
//
// AGENT_MODEL is an OPTIONAL local override ("provider:modelId", e.g.
// "google:gemini-3.5-flash-lite") for A/B-ing providers or sweeping the eval harness
// across candidates without a code edit. Unset — the normal case, including all of
// production — means "use the model below", so prod needs no extra env var and no
// provider but the one above enters the deployed path. This is the sanctioned
// optional-override case, not a config fallback: an unset value is normal, not a bug.
// Which model production serves is decided here in code, never inferred from whether
// some other provider's key happens to be present.

// The deployed model, named once so nothing below can drift from it.
const DEFAULT_MODEL = { provider: "dashscope", modelId: "qwen3.7-plus" } as const;

export interface AgentModelInfo {
  provider: string;
  modelId: string;
  temperature: number;
  // False when AGENT_MODEL is unset, i.e. this is what production would serve.
  overridden: boolean;
}

// What the test-hook panel shows. Assembled here because the panel is a client
// component and AGENT_MODEL is read server-side.
export function agentModelInfo(): AgentModelInfo {
  return {
    ...activeAgentModel(),
    temperature: AGENT_TEMPERATURE,
    overridden: Boolean(process.env.AGENT_MODEL),
  };
}

// The one reader of AGENT_MODEL. Everything that needs to know what will answer —
// which client to build, which key to check, what to show in the test-hook panel —
// asks here rather than splitting the string again.
export function activeAgentModel(): { provider: string; modelId: string } {
  const override = process.env.AGENT_MODEL;
  if (!override) {
    return DEFAULT_MODEL;
  }
  const sep = override.indexOf(":");
  return { provider: override.slice(0, sep), modelId: override.slice(sep + 1) };
}

export function getAgentModel(): LanguageModel {
  const { provider, modelId } = activeAgentModel();
  switch (provider) {
    case "deepseek":
      return deepseek(modelId);
    case "openai":
      return openai(modelId);
    case "google":
      // Google's own provider rather than an OpenAI-compatible shim: Gemini 3 requires
      // its thought signatures to be echoed back on later requests for tool calling to
      // stay reliable, and a translation layer in between is where they get dropped.
      return google(modelId);
    case "zhipu":
      // Zhipu's endpoint speaks the OpenAI wire format but is not OpenAI, so it goes
      // through the openai-compatible provider — which is also where a body field the
      // OpenAI schema has no slot for is allowed to live. The base URL stops at /v4 with
      // no trailing slash: the SDK appends /chat/completions, and a client that adds a
      // /v1 of its own 404s here.
      //
      // GLM reasons before answering unless told not to, and omitting the field is not
      // neutral — it means enabled. Measured on glm-5-turbo with an 8k-token prompt, the
      // first token takes 14.8s left alone and 0.8s with it off, and the agent pays that
      // on every step. It is off for every Zhipu model rather than per call, so it belongs
      // on the provider, not in the caller's providerOptions.
      return createOpenAICompatible({
        name: "zhipu",
        baseURL: "https://open.bigmodel.cn/api/paas/v4",
        apiKey: process.env.ZHIPU_API_KEY,
        transformRequestBody: (args) => ({ ...args, thinking: { type: "disabled" } }),
      }).chatModel(modelId);
    case "dashscope":
      // Qwen's first-party endpoint, OpenAI-compatible. Reasoning defaults to on and
      // costs ~10s of first-token latency per step, so it is switched off in the body.
      return createOpenAICompatible({
        name: "dashscope",
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        apiKey: process.env.DASHSCOPE_API_KEY,
        transformRequestBody: (args) => ({ ...args, enable_thinking: false }),
      }).chatModel(modelId);
    case "openrouter":
      // OpenRouter speaks the OpenAI wire format behind a different base URL, so one
      // gateway key reaches every vendor's model — which is what makes a candidate sweep
      // cheap. It normalises reasoning across vendors under its own field and drops the
      // upstream one: measured on glm-4.7, `thinking: disabled` sent through here still
      // came back with reasoning and a 40s first token, while `reasoning: { enabled:
      // false }` took it to 1.5s. A sweep that leaves it on measures reasoning latency
      // rather than the candidate.
      return createOpenAICompatible({
        name: "openrouter",
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
        transformRequestBody: (args) => ({ ...args, reasoning: { enabled: false } }),
      }).chatModel(modelId);
    default:
      throw new Error(
        `AGENT_MODEL has an unknown provider "${provider}" (expected ${Object.keys(KEY_VAR).join("|")})`,
      );
  }
}

// The env var each provider's SDK reads. A provider constructor does NOT throw when its
// key is missing — the error surfaces on the first request, by which point the response
// has started streaming and can no longer become a clean 500. Hence the name here, so
// the route can check before it opens the stream.
const KEY_VAR: Record<string, string> = {
  deepseek: "DEEPSEEK_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  zhipu: "ZHIPU_API_KEY",
  dashscope: "DASHSCOPE_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

// The env var the active model needs but does not have, or null when it is set.
export function missingAgentModelKey(): string | null {
  const keyVar = KEY_VAR[activeAgentModel().provider];
  return keyVar && !process.env[keyVar] ? keyVar : null;
}

// Iris follows format rules and picks tools off a decision axis, so she wants the
// deterministic end of the sampler, not the conversational one. DeepSeek's own
// per-task guidance puts that work near its coding/math setting; leaving this unset
// would hand the choice to the provider default (1.0) instead of making it here.
// https://api-docs.deepseek.com/quick_start/parameter_settings/
export const AGENT_TEMPERATURE = 0;

// Provider-specific knobs passed to streamText; the SDK reads only the block that
// matches the active provider, so this is inert unless an override selects DeepSeek.
// v4-flash emits reasoning tokens before answering — it costs tokens and latency, and
// it is what buys the instruction adherence the tool and format rules depend on. The
// deployed model needs no entry: reasoning is switched off in its own provider branch,
// where a body field the OpenAI schema has no slot for is the only place it can go.
export const agentProviderOptions = {
  deepseek: { thinking: { type: "enabled" } },
} as const;
