import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { agentModel, agentProviderOptions } from "@/lib/ai/model";
import { buildLensTools } from "@/lib/ai/tools";
import { MOUNTS } from "@/lib/mount";
import { routing } from "@/i18n/routing";
import type { Mount } from "@/lib/types";

// The AskIris streaming endpoint. mount + locale are supplied by the client (both
// fixed by the page's route), so the agent is scoped to one mount and answers in
// one language. Runs on the Cloudflare workerd runtime via OpenNext — validate
// streaming with `npm run preview`, not just `next dev`.

const MOUNT_LABEL: Record<Mount, string> = {
  X: "Fujifilm X mount (APS-C)",
  G: "Fujifilm G mount (medium format)",
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
    `When a request is underspecified, assume a sensible reading and recall on it`,
    `— but name the assumption and invite a correction (e.g. "I read 'portraits'`,
    `as ~85mm — want wider or longer?"), never presenting it as the only reading.`,
    ``,
    `Once you've narrowed to your picks, present them by calling recommendLenses`,
    `with 3–6 lens ids — this renders a grid of cards. You may call it more than`,
    `once to group picks around different priorities. For a specific-lens lookup or`,
    `a quick factual answer, reply in prose without cards.`,
    ``,
    `Each card carries its own reason, so a lens's case belongs there: one to three`,
    `natural sentences on what it's good for and its main trade-off. Keep the prose`,
    `around the cards to a short synthesis — frame your assumption, a brief lead-in`,
    `per group, a short close. Don't restate each lens's case in the prose or write`,
    `a separate pros-and-cons section; the cards hold that.`,
    ``,
    `If an obvious-looking candidate doesn't make your picks — one the specs alone`,
    `would seem to satisfy — name it in a line and why: a spec sheet that fits on`,
    `paper but is built for a different use, or that costs much more for no real`,
    `gain here. Give the reader the full picture of what you weighed, not only what`,
    `you chose — a brief note, not a mechanical pros-and-cons section.`,
    ``,
    `Always refer to a lens by its exact "name" field from the tool result; never`,
    `reassemble a name from parts or abbreviate it, so every mention is identical.`,
    `Structure prose with short headings.`,
    ``,
    `Reply in ${language}; if the user writes in another language, match theirs.`,
  ].join("\n");
}

// Wire contract for POST /api/chat. mount/locale draw their allowed values from
// the same sources the rest of the app does (MOUNTS, routing.locales), so adding
// a mount or locale can't drift this route out of sync. messages is the SDK's own
// shape — validated as an array, its elements trusted to the transport.
const chatRequestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
  mount: z.enum(MOUNTS),
  locale: z.enum(routing.locales),
});

export async function POST(req: Request) {
  if (!process.env.DEEPSEEK_API_KEY) {
    return Response.json({ error: "DEEPSEEK_API_KEY is not set" }, { status: 500 });
  }

  const parsed = chatRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }
  const { messages, mount, locale } = parsed.data;

  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  const tools = buildLensTools(mount, locale, tBrand);

  const result = streamText({
    model: agentModel,
    providerOptions: agentProviderOptions,
    system: systemPrompt(mount, locale),
    // Same `tools` on both calls: recommendLenses.toModelOutput runs inside
    // convertToModelMessages, so it must see the tool to trim its model-facing output.
    messages: await convertToModelMessages(messages, { tools }),
    tools,
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
