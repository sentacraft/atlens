import { deepseek } from "@ai-sdk/deepseek";
import type { LanguageModel } from "ai";

// Single source of truth for the Copilot's language model. Route handlers import
// from here and never name a provider, so swapping provider or model id is a
// one-line change confined to this file (the AI SDK keeps call sites
// provider-agnostic). The provider reads its own API key from the environment
// (DeepSeek → DEEPSEEK_API_KEY).
//
// `deepseek-v4-flash` is the forward model id: the legacy `deepseek-chat` /
// `deepseek-reasoner` aliases are retired after 2026-07-24 and already route to
// v4-flash.
export const copilotModel: LanguageModel = deepseek("deepseek-v4-flash");

// v4-flash is dual-mode and defaults to *thinking* (it emits reasoning tokens
// before answering). We disable it: the copilot's tool-driven recall wants fast,
// cheap turns, and non-thinking already chains tools reliably. The interesting
// §7 knob is `adaptive` (think only when the query warrants it) — revisit once
// query-splitting and perf metrics exist.
export const copilotProviderOptions = {
  deepseek: { thinking: { type: "disabled" } },
} as const;
