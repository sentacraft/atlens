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
// production — means "use DEFAULT_MODEL", so prod needs no extra env var and no
// provider but DeepSeek enters the deployed path. This is the sanctioned
// optional-override case, not a config fallback: an unset value is normal, not a bug.
// Which model production serves is decided here in code, never inferred from whether
// some other provider's key happens to be present.

// Each provider paired with the env var whose absence makes it uncallable — the same
// name its SDK reads, so the route can report which key to set without knowing which
// provider is active. One table, so adding a provider cannot leave the readiness check
// behind: a new entry has to name its key to compile.
const PROVIDERS = {
  deepseek: { keyVar: "DEEPSEEK_API_KEY", model: (id: string) => deepseek(id) },
  openai: { keyVar: "OPENAI_API_KEY", model: (id: string) => openai(id) },
  // Google's own provider rather than an OpenAI-compatible shim: Gemini 3 requires its
  // thought signatures to be echoed back on later requests for tool calling to stay
  // reliable, and a translation layer in between is where they get dropped.
  google: { keyVar: "GOOGLE_GENERATIVE_AI_API_KEY", model: (id: string) => google(id) },
  // OpenRouter speaks the OpenAI wire format, so the same provider talks to it with a
  // different base URL — one gateway key reaches every vendor's model, which is what
  // makes a candidate sweep cheap.
  openrouter: {
    keyVar: "OPENROUTER_API_KEY",
    model: (id: string) =>
      createOpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
      }).chat(id),
  },
} as const satisfies Record<string, { keyVar: string; model: (id: string) => LanguageModel }>;

type ProviderName = keyof typeof PROVIDERS;

const DEFAULT_MODEL = { provider: "deepseek", modelId: "deepseek-v4-flash" } as const;

// The model this process will call, resolved from the override or the default. Returns
// the raw provider string when it names nothing we have, so the caller can say so.
function activeModel(): { provider: ProviderName | string; modelId: string } {
  const override = process.env.AGENT_MODEL;
  if (!override) {
    return DEFAULT_MODEL;
  }
  const sep = override.indexOf(":");
  return { provider: override.slice(0, sep), modelId: override.slice(sep + 1) };
}

function isKnown(provider: string): provider is ProviderName {
  return provider in PROVIDERS;
}

export function getAgentModel(): LanguageModel {
  const { provider, modelId } = activeModel();
  if (!isKnown(provider)) {
    throw new Error(
      `AGENT_MODEL has an unknown provider "${provider}" (expected ${Object.keys(PROVIDERS).join("|")})`,
    );
  }
  return PROVIDERS[provider].model(modelId);
}

// Why the active model can't be called, or null when it can be. Only a config check —
// a key that is present but wrong still fails at request time, which is the provider's
// error to report, not something worth a preflight round trip on every turn.
export function agentModelProblem(): string | null {
  const { provider } = activeModel();
  if (!isKnown(provider)) {
    return `AGENT_MODEL names an unknown provider "${provider}"`;
  }
  const { keyVar } = PROVIDERS[provider];
  return process.env[keyVar] ? null : `${keyVar} is not set (required by provider "${provider}")`;
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
