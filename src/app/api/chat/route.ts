import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { copilotModel, copilotProviderOptions } from "@/lib/ai/model";
import { buildLensTools } from "@/lib/ai/tools";
import { routing } from "@/i18n/routing";
import type { Mount } from "@/lib/types";

// The Copilot ("AskIris") streaming endpoint. mount + locale are supplied by the
// client (both fixed by the page's route), so the agent is scoped to one mount
// and answers in one language. Runs on the Cloudflare workerd runtime via
// OpenNext — validate streaming with `npm run preview`, not just `next dev`.

const MOUNT_LABEL: Record<Mount, string> = {
  X: "Fujifilm X-mount (APS-C, 1.5× crop factor)",
  G: "Fujifilm GFX / G-mount (medium format)",
};

function systemPrompt(mount: Mount, locale: string): string {
  const language = locale === "zh" ? "Chinese" : "English";
  return [
    `You help users find lenses for ${MOUNT_LABEL[mount]}. You recall and compare`,
    `candidates by their specs — you never tell the user which one to buy, and you`,
    `never state a spec that isn't in a tool result.`,
    ``,
    `Turn the user's needs into tool calls. The mount and the user's region are`,
    `fixed by context — don't ask about them.`,
    ``,
    `Reply in ${language}; if the user writes in another language, match theirs.`,
  ].join("\n");
}

export async function POST(req: Request) {
  if (!process.env.DEEPSEEK_API_KEY) {
    return Response.json({ error: "DEEPSEEK_API_KEY is not set" }, { status: 500 });
  }

  const {
    messages,
    mount,
    locale,
  }: { messages: UIMessage[]; mount: Mount; locale: string } = await req.json();

  if (mount !== "X" && mount !== "G") {
    return Response.json({ error: "invalid 'mount' (expected 'X' or 'G')" }, { status: 400 });
  }
  if (!(routing.locales as readonly string[]).includes(locale)) {
    return Response.json({ error: "invalid 'locale'" }, { status: 400 });
  }

  const result = streamText({
    model: copilotModel,
    providerOptions: copilotProviderOptions,
    system: systemPrompt(mount, locale),
    messages: await convertToModelMessages(messages),
    tools: buildLensTools(mount, locale),
    // Multi-step ReAct: the model may clarify, call tools, and answer across
    // several steps. Capped to prevent a runaway loop.
    stopWhen: stepCountIs(8),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      // Forward the real provider error during bring-up; the SDK otherwise
      // masks it as an opaque "An error occurred". Tighten before public ship.
      onError: (error) => (error instanceof Error ? error.message : String(error)),
    }),
  });
}
