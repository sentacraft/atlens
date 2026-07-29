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
export function getAgentModel(): LanguageModel {
  const override = process.env.AGENT_MODEL;
  if (!override) {
    return deepseek("deepseek-v4-flash");
  }
  const sep = override.indexOf(":");
  const provider = override.slice(0, sep);
  const modelId = override.slice(sep + 1);
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
        `AGENT_MODEL has an unknown provider "${provider}" (expected deepseek|openai|google|openrouter)`,
      );
  }
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
