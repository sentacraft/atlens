// Plain data, so the Test Hook panel can list the presets without pulling in provider SDKs.

/** How much reasoning a preset asks for; model.ts turns it into each provider's own setting. */
export type AgentReasoning = "off" | "low" | "on";

export interface AgentModelPreset {
  id: string;
  label: string;
  provider: string;
  modelId: string;
  reasoning: AgentReasoning;
}

/** Models a developer can switch Iris to from the Test Hook panel; the first is production's. */
export const AGENT_MODEL_PRESETS = [
  { id: "qwen3.7-plus", label: "qwen3.7-plus · no reasoning", provider: "dashscope", modelId: "qwen3.7-plus", reasoning: "off" },
  { id: "qwen3.8-flash", label: "qwen3.8-flash · no reasoning", provider: "dashscope", modelId: "qwen3.8-flash", reasoning: "off" },
  { id: "qwen3.8-flash-low", label: "qwen3.8-flash · 1k reasoning budget", provider: "dashscope", modelId: "qwen3.8-flash", reasoning: "low" },
  { id: "gpt-6-luna", label: "GPT-6 Luna · effort none", provider: "openai", modelId: "gpt-6-luna", reasoning: "off" },
  { id: "gpt-6-luna-low", label: "GPT-6 Luna · effort low", provider: "openai", modelId: "gpt-6-luna", reasoning: "low" },
  { id: "gpt-6-luna-or", label: "GPT-6 Luna via OpenRouter · effort none", provider: "openrouter", modelId: "openai/gpt-6-luna", reasoning: "off" },
  { id: "gpt-6-luna-or-low", label: "GPT-6 Luna via OpenRouter · effort low", provider: "openrouter", modelId: "openai/gpt-6-luna", reasoning: "low" },
  { id: "deepseek-flash", label: "DeepSeek V4.1 Flash · no reasoning", provider: "deepseek", modelId: "deepseek-flash", reasoning: "off" },
  { id: "deepseek-flash-on", label: "DeepSeek V4.1 Flash · reasoning", provider: "deepseek", modelId: "deepseek-flash", reasoning: "on" },
] as const satisfies readonly AgentModelPreset[];

export type AgentModelPresetId = (typeof AGENT_MODEL_PRESETS)[number]["id"];

export const DEFAULT_AGENT_MODEL_PRESET: AgentModelPreset = AGENT_MODEL_PRESETS[0];

/** Development-only request header that switches one turn to a preset. */
export const MODEL_PRESET_HEADER = "x-askiris-model";

export function findAgentModelPreset(id: string | null | undefined): AgentModelPreset | undefined {
  return AGENT_MODEL_PRESETS.find((preset) => preset.id === id);
}
