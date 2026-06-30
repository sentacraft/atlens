import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { copilotModel, copilotProviderOptions } from "@/lib/ai/model";

// First AI streaming endpoint in the app, backing the experimental Copilot
// surface (src/app/[locale]/copilot). Deliberately minimal — a bare,
// provider-agnostic stream — until the runtime plan (tools, system prompt,
// query splitting) lands. Runs on the Cloudflare workerd runtime via OpenNext,
// so streaming must be validated with `npm run preview`, not just `next dev`.
export async function POST(req: Request) {
  // A global secret has exactly one source of truth; a missing key is a config
  // bug, so fail loudly here instead of letting the stream error opaquely.
  if (!process.env.DEEPSEEK_API_KEY) {
    return Response.json({ error: "DEEPSEEK_API_KEY is not set" }, { status: 500 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: copilotModel,
    providerOptions: copilotProviderOptions,
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      // Forward the real provider error during bring-up; the SDK otherwise
      // masks it as an opaque "An error occurred". Tighten before public ship.
      onError: (error) =>
        error instanceof Error ? error.message : String(error),
    }),
  });
}
