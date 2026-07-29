import { deepseek } from "@ai-sdk/deepseek";
import { google } from "@ai-sdk/google";
import { openai, createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

// Iris's production model — the single source of truth. DeepSeek v4-flash is cheap
// and chains tools reliably; swapping it is a one-line change confined here.
//
// AGENT_MODEL is an OPTIONAL local override ("provider:modelId", e.g.
// "google:gemini-3.5-flash-lite") for A/B-ing providers or sweeping the eval harness
// across candidates without a code edit. Unset — the normal case, including all of
// production — means "use the model below", so prod needs no extra env var and no
// provider but DeepSeek enters the deployed path. This is the sanctioned
// optional-override case, not a config fallback: an unset value is normal, not a bug.
// Which model production serves is decided here in code, never inferred from whether
// some other provider's key happens to be present.

function activeProvider(): string {
  const override = process.env.AGENT_MODEL;
  return override ? override.slice(0, override.indexOf(":")) : "deepseek";
}

export function getAgentModel(): LanguageModel {
  const override = process.env.AGENT_MODEL;
  if (!override) {
    return deepseek("deepseek-v4-flash");
  }
  const modelId = override.slice(override.indexOf(":") + 1);
  switch (activeProvider()) {
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
      // Zhipu's own endpoint speaks the OpenAI wire format. The base URL stops at /v4 with
      // no trailing slash: the SDK appends /chat/completions to it, and a client that adds
      // a /v1 of its own 404s here.
      //
      // GLM reasons before answering unless told not to, and omitting the field is not
      // neutral — it means enabled. Measured on glm-5-turbo with an 8k-token prompt, the
      // first token takes 14.8s left alone and 0.8s with it off, and the agent pays that
      // once per step. `thinking` is Zhipu's own field, not OpenAI's, so the SDK has no
      // slot for it and it goes on the wire here.
      return createOpenAI({
        baseURL: "https://open.bigmodel.cn/api/paas/v4",
        apiKey: process.env.ZHIPU_API_KEY,
        fetch: (input, init) => {
          const body = init?.body;
          if (typeof body !== "string") {
            return fetch(input, init);
          }
          const merged = { ...JSON.parse(body), thinking: { type: "disabled" } };
          return fetch(input, { ...init, body: JSON.stringify(merged) });
        },
      }).chat(modelId);
    case "openrouter":
      // OpenRouter speaks the OpenAI wire format, so the same provider talks to it with
      // a different base URL — one gateway key reaches every vendor's model, which is
      // what makes a candidate sweep cheap.
      return createOpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
      }).chat(modelId);
    default:
      throw new Error(
        `AGENT_MODEL has an unknown provider "${activeProvider()}" (expected deepseek|openai|google|zhipu|openrouter)`,
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
  openrouter: "OPENROUTER_API_KEY",
};

// The env var the active model needs but does not have, or null when it is set.
export function missingAgentModelKey(): string | null {
  const keyVar = KEY_VAR[activeProvider()];
  return keyVar && !process.env[keyVar] ? keyVar : null;
}

// Iris follows format rules and picks tools off a decision axis, so she wants the
// deterministic end of the sampler, not the conversational one. DeepSeek's own
// per-task guidance puts that work near its coding/math setting; leaving this unset
// would hand the choice to the provider default (1.0) instead of making it here.
// https://api-docs.deepseek.com/quick_start/parameter_settings/
export const AGENT_TEMPERATURE = 0;

// Provider-specific knobs passed to streamText; the SDK reads only the block that
// matches the active provider, so this is inert under any override. v4-flash emits
// reasoning tokens before answering — it costs tokens and latency, and it is what
// buys the instruction adherence the tool and format rules depend on.
export const agentProviderOptions = {
  deepseek: { thinking: { type: "enabled" } },
} as const;
