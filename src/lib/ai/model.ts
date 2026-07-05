import { deepseek } from "@ai-sdk/deepseek";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

// Iris's language model, selected by the AGENT_MODEL env value in "provider:modelId"
// form — e.g. "deepseek:deepseek-v4-flash" or "openai:gpt-4.1-mini". Keeping the
// choice in config (not a hard-coded constant) lets us A/B providers — and sweep
// the eval harness across candidates — without a code edit. Required and fail-loud
// per the no-fallback rule: an unset value is a deploy bug, not a reason to silently
// pick a default. Set it in .env.local (dev) and the Cloudflare env (prod).
//
// Resolved lazily (per request, not at import) so a missing value fails at call
// time rather than breaking the build.
export function getAgentModel(): LanguageModel {
  const spec = process.env.AGENT_MODEL;
  if (!spec) {
    throw new Error("AGENT_MODEL is not set (expected e.g. 'deepseek:deepseek-v4-flash')");
  }
  const sep = spec.indexOf(":");
  const provider = spec.slice(0, sep);
  const modelId = spec.slice(sep + 1);
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
// matches the active provider, so this is inert when the agent runs on OpenAI.
// DeepSeek v4-flash defaults to *thinking* (it emits reasoning tokens before
// answering); we disable it for fast, cheap, tool-driven turns.
export const agentProviderOptions = {
  deepseek: { thinking: { type: "disabled" } },
} as const;
