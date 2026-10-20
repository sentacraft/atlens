import { deepseek } from "@ai-sdk/deepseek";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import {
  DEFAULT_AGENT_MODEL_PRESET,
  type AgentModelPreset,
  type AgentReasoning,
} from "@/lib/ai/model-presets";

// Production runs the first preset. AGENT_MODEL ("provider:modelId") is an optional local
// override and is unset in production; a Test Hook preset, development only, wins over both
// for one turn. Qwen goes through Alibaba's own endpoint, not a gateway: the promotional
// rate and free allowance exist only on first-party billing.

export interface AgentModelChoice {
  provider: string;
  modelId: string;
  reasoning: AgentReasoning;
}

export interface AgentModelInfo {
  provider: string;
  modelId: string;
  temperature: number | undefined;
  overridden: boolean;
}

export function agentModelInfo(): AgentModelInfo {
  const choice = activeAgentModel();
  return {
    provider: choice.provider,
    modelId: choice.modelId,
    temperature: agentTemperature(choice),
    overridden: Boolean(process.env.AGENT_MODEL),
  };
}

export function activeAgentModel(preset?: AgentModelPreset): AgentModelChoice {
  if (preset) {
    return preset;
  }
  const override = process.env.AGENT_MODEL;
  if (!override) {
    return DEFAULT_AGENT_MODEL_PRESET;
  }
  const sep = override.indexOf(":");
  const provider = override.slice(0, sep);
  // DeepSeek keeps reasoning on: without it, v4-flash stopped following the tool and format rules.
  return { provider, modelId: override.slice(sep + 1), reasoning: provider === "deepseek" ? "on" : "off" };
}

const OPENAI_EFFORT = { off: "none", low: "low", on: "medium" } as const;

/** The model plus the per-call settings `streamText` needs for it. */
export function agentCallSettings(choice: AgentModelChoice) {
  return {
    model: getAgentModel(choice),
    temperature: agentTemperature(choice),
    providerOptions: {
      openai: { reasoningEffort: OPENAI_EFFORT[choice.reasoning] },
      deepseek: { thinking: { type: choice.reasoning === "off" ? "disabled" : "enabled" } },
    },
  } as const;
}

// Reasoning modes reject or ignore a temperature, so it is sent only without reasoning.
function agentTemperature(choice: AgentModelChoice): number | undefined {
  return choice.reasoning === "off" ? AGENT_TEMPERATURE : undefined;
}

function openRouterReasoning(reasoning: AgentReasoning) {
  if (reasoning === "off") {
    return { enabled: false };
  }
  return reasoning === "low" ? { effort: "low" } : { enabled: true };
}

function dashscopeThinking(reasoning: AgentReasoning) {
  if (reasoning === "off") {
    return { enable_thinking: false };
  }
  return reasoning === "low" ? { enable_thinking: true, thinking_budget: 1024 } : { enable_thinking: true };
}

export function getAgentModel({ provider, modelId, reasoning }: AgentModelChoice): LanguageModel {
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
        transformRequestBody: (args) => ({ ...args, ...dashscopeThinking(reasoning) }),
      }).chatModel(modelId);
    case "openrouter":
      // OpenRouter ignores vendor reasoning flags such as `thinking`; only its own field works.
      return createOpenAICompatible({
        name: "openrouter",
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
        transformRequestBody: (args) => ({ ...args, reasoning: openRouterReasoning(reasoning) }),
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

export function missingAgentModelKey(choice: AgentModelChoice): string | null {
  const keyVar = KEY_VAR[choice.provider];
  return keyVar && !process.env[keyVar] ? keyVar : null;
}

// https://api-docs.deepseek.com/quick_start/parameter_settings/
export const AGENT_TEMPERATURE = 0;

