import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { agentModelProblem, getAgentModel } from "../model";

// The chat route refuses a turn when the model it is about to call has no key. The
// check has to follow AGENT_MODEL rather than name one provider: with a hardcoded
// DEEPSEEK_API_KEY it passed while an override pointed at a provider whose key was
// missing, and the turn then failed mid-stream instead of at the door.

const AGENT_KEYS = [
  "AGENT_MODEL",
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

describe("agentModelProblem", () => {
  it("names the default provider's key when nothing overrides it", () => {
    expect(agentModelProblem()).toContain("DEEPSEEK_API_KEY");
    process.env.DEEPSEEK_API_KEY = "set";
    expect(agentModelProblem()).toBeNull();
  });

  it("follows the override rather than the default provider", () => {
    // The deployed provider's key is present; the overridden one's is not.
    process.env.DEEPSEEK_API_KEY = "set";
    process.env.AGENT_MODEL = "google:gemini-3.5-flash-lite";
    expect(agentModelProblem()).toContain("GOOGLE_GENERATIVE_AI_API_KEY");
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "set";
    expect(agentModelProblem()).toBeNull();
  });

  it("reports a provider the table does not know", () => {
    process.env.AGENT_MODEL = "anthropic:claude";
    expect(agentModelProblem()).toContain("unknown provider");
    expect(() => getAgentModel()).toThrow(/unknown provider/);
  });
});
