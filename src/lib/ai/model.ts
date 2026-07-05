import { deepseek } from "@ai-sdk/deepseek";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

// Iris's production model — the single source of truth. DeepSeek v4-flash is cheap
// and chains tools reliably; swapping it is a one-line change confined here.
//
// AGENT_MODEL is an OPTIONAL local override ("provider:modelId", e.g.
// "openai:gpt-4.1-mini") for A/B-ing providers or sweeping the eval harness across
// candidates without a code edit. Unset — the normal case, including all of
// production — means "use the model below", so prod needs no extra env var and
// OpenAI never enters the deployed path. This is the sanctioned optional-override
// case, not a config fallback: an unset value is normal, not a bug.
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
    default:
      throw new Error(`AGENT_MODEL has an unknown provider "${provider}" (expected deepseek|openai)`);
  }
}

// Provider-specific knobs passed to streamText; the SDK reads only the block that
// matches the active provider, so this is inert under an OpenAI override. DeepSeek
// v4-flash defaults to *thinking* (it emits reasoning tokens before answering); we
// disable it for fast, cheap, tool-driven turns.
export const agentProviderOptions = {
  deepseek: { thinking: { type: "disabled" } },
} as const;
