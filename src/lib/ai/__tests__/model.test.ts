import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { activeAgentModel, agentCallSettings, missingAgentModelKey, getAgentModel } from "../model";
import { findAgentModelPreset } from "../model-presets";

// The chat route refuses a turn when the model it is about to call has no key. The
// check has to follow AGENT_MODEL rather than name one provider: with a hardcoded
// DEEPSEEK_API_KEY it passed while an override pointed at a provider whose key was
// missing, and the turn then failed mid-stream instead of at the door.

const AGENT_KEYS = [
  "AGENT_MODEL",
  "DASHSCOPE_API_KEY",
  "DEEPSEEK_API_KEY",
  "OPENAI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "OPENROUTER_API_KEY",
] as const;

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of AGENT_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of AGENT_KEYS) {
    if (saved[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = saved[key];
    }
  }
});

describe("missingAgentModelKey", () => {
  it("names the default provider's key when nothing overrides it", () => {
    expect(missingAgentModelKey(activeAgentModel())).toBe("DASHSCOPE_API_KEY");
    process.env.DASHSCOPE_API_KEY = "set";
    expect(missingAgentModelKey(activeAgentModel())).toBeNull();
  });

  it("follows the override rather than the default provider", () => {
    // The deployed provider's key is present; the overridden one's is not.
    process.env.DASHSCOPE_API_KEY = "set";
    process.env.AGENT_MODEL = "google:gemini-3.5-flash-lite";
    expect(missingAgentModelKey(activeAgentModel())).toBe("GOOGLE_GENERATIVE_AI_API_KEY");
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "set";
    expect(missingAgentModelKey(activeAgentModel())).toBeNull();
  });

  it("has nothing to check for a provider it does not know, which getAgentModel rejects", () => {
    process.env.AGENT_MODEL = "anthropic:claude";
    expect(missingAgentModelKey(activeAgentModel())).toBeNull();
    expect(() => getAgentModel(activeAgentModel())).toThrow(/unknown provider/);
  });
});

describe("activeAgentModel", () => {
  it("lets a Test Hook preset win over AGENT_MODEL", () => {
    process.env.AGENT_MODEL = "google:gemini-3.5-flash-lite";
    expect(activeAgentModel(findAgentModelPreset("gpt-6-luna-low"))).toMatchObject({
      provider: "openai",
      modelId: "gpt-6-luna",
      reasoning: "low",
    });
  });

  it("keeps DeepSeek reasoning on when AGENT_MODEL picks it", () => {
    process.env.AGENT_MODEL = "deepseek:deepseek-flash";
    expect(activeAgentModel().reasoning).toBe("on");
  });
});

describe("agentCallSettings", () => {
  it("sends a temperature only when reasoning is off", () => {
    process.env.OPENAI_API_KEY = "set";
    expect(agentCallSettings(activeAgentModel(findAgentModelPreset("gpt-6-luna")))).toMatchObject({
      temperature: 0,
      providerOptions: { openai: { reasoningEffort: "none" } },
    });
    const low = agentCallSettings(activeAgentModel(findAgentModelPreset("gpt-6-luna-low")));
    expect(low.temperature).toBeUndefined();
    expect(low.providerOptions.openai.reasoningEffort).toBe("low");
  });

  it("turns DeepSeek reasoning off and on with its own flag", () => {
    process.env.DEEPSEEK_API_KEY = "set";
    expect(agentCallSettings(activeAgentModel(findAgentModelPreset("deepseek-flash"))).providerOptions.deepseek).toEqual({
      thinking: { type: "disabled" },
    });
    expect(agentCallSettings(activeAgentModel(findAgentModelPreset("deepseek-flash-on"))).providerOptions.deepseek).toEqual({
      thinking: { type: "enabled" },
    });
  });
});
