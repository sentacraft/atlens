import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { generateText } from "ai";
import { activeAgentModel, agentCallSettings, agentModelLabel, missingAgentModelKey, getAgentModel } from "../model";
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
    expect(missingAgentModelKey(activeAgentModel())).toBe("DEEPSEEK_API_KEY");
    process.env.DEEPSEEK_API_KEY = "set";
    expect(missingAgentModelKey(activeAgentModel())).toBeNull();
  });

  it("follows the override rather than the default provider", () => {
    // The deployed provider's key is present; the overridden one's is not.
    process.env.DEEPSEEK_API_KEY = "set";
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

describe("agentModelLabel", () => {
  it("names a preset by its label and an AGENT_MODEL pick by provider and model", () => {
    expect(agentModelLabel(activeAgentModel(findAgentModelPreset("qwen3.8-flash")))).toBe("qwen3.8-flash · no reasoning");
    process.env.AGENT_MODEL = "deepseek:deepseek-flash";
    expect(agentModelLabel(activeAgentModel())).toBe("deepseek:deepseek-flash · reasoning off");
  });
});

describe("image tool results on OpenAI-compatible providers", () => {
  const IMAGE_URL = "https://images.atlens.app/lens-images/x/005.webp";

  async function sentToolContent(provider: string) {
    const requests: { url: string; body?: string }[] = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: String(input), body: typeof init?.body === "string" ? init.body : undefined });
      return new Response(JSON.stringify({
        id: "r",
        created: 0,
        model: "m",
        choices: [{ index: 0, message: { role: "assistant", content: "ok" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }), { headers: { "content-type": "application/json" } });
    });
    await generateText({
      model: getAgentModel({ provider, modelId: "m", reasoning: "off" }),
      messages: [
        { role: "user", content: "Show the chart." },
        { role: "assistant", content: [{ type: "tool-call", toolCallId: "c1", toolName: "lensDetails", input: {} }] },
        {
          role: "tool",
          content: [{
            type: "tool-result",
            toolCallId: "c1",
            toolName: "lensDetails",
            output: {
              type: "content",
              value: [
                { type: "text", text: "Image a:image-005:" },
                { type: "file", mediaType: "image/webp", data: { type: "url", url: new URL(IMAGE_URL) } },
              ],
            },
          }],
        },
      ],
    });
    const chat = requests.find(({ url }) => url.endsWith("/chat/completions"));
    const body = JSON.parse(chat?.body ?? "{}") as { messages: { role: string; content: unknown }[] };
    return { requests, content: body.messages.find(({ role }) => role === "tool")?.content };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(["dashscope", "zhipu", "openrouter"])("%s receives the chart as an image URL, not as serialized bytes", async (provider) => {
    const { requests, content } = await sentToolContent(provider);
    expect(requests.map(({ url }) => url)).not.toContain(IMAGE_URL);
    expect(content).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "image_url", image_url: expect.objectContaining({ url: IMAGE_URL }) }),
    ]));
  });
});
