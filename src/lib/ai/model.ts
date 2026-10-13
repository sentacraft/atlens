import { deepseek } from "@ai-sdk/deepseek";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

// Production model. AGENT_MODEL ("provider:modelId") is an optional local override and is
// unset in production. Qwen goes through Alibaba's own endpoint, not a gateway: the
// promotional rate and free allowance exist only on first-party billing.
const DEFAULT_MODEL = { provider: "dashscope", modelId: "qwen3.7-plus" } as const;

export interface AgentModelInfo {
  provider: string;
  modelId: string;
  temperature: number;
  overridden: boolean;
}

export function agentModelInfo(): AgentModelInfo {
  return {
    ...activeAgentModel(),
    temperature: AGENT_TEMPERATURE,
    overridden: Boolean(process.env.AGENT_MODEL),
  };
}

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
      // Not an OpenAI-compatible shim: it drops Gemini 3's thought signatures, which tool
      // calling needs echoed back.
      return google(modelId);
    case "zhipu":
      // Reasoning is on unless disabled: 14.8s to first token instead of 0.8s, on every step.
      return createOpenAICompatible({
        name: "zhipu",
        baseURL: "https://open.bigmodel.cn/api/paas/v4",
        apiKey: process.env.ZHIPU_API_KEY,
        transformRequestBody: (args) => ({ ...args, thinking: { type: "disabled" } }),
      }).chatModel(modelId);
    case "dashscope":
      // Reasoning is on unless disabled, adding ~10s to first token on every step.
      return createOpenAICompatible({
        name: "dashscope",
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        apiKey: process.env.DASHSCOPE_API_KEY,
        transformRequestBody: (args) => ({ ...args, enable_thinking: false }),
      }).chatModel(modelId);
    case "openrouter":
      // OpenRouter ignores vendor reasoning flags such as `thinking`; only its own field works.
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

// Provider constructors do not throw on a missing key; the error would surface mid-stream,
// too late for a clean 500, so the route checks these first.
const KEY_VAR: Record<string, string> = {
  deepseek: "DEEPSEEK_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  zhipu: "ZHIPU_API_KEY",
  dashscope: "DASHSCOPE_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

export function missingAgentModelKey(): string | null {
  const keyVar = KEY_VAR[activeAgentModel().provider];
  return keyVar && !process.env[keyVar] ? keyVar : null;
}

// https://api-docs.deepseek.com/quick_start/parameter_settings/
export const AGENT_TEMPERATURE = 0;

// DeepSeek keeps reasoning on: without it, v4-flash stops following the tool and format rules.
export const agentProviderOptions = {
  deepseek: { thinking: { type: "enabled" } },
} as const;
