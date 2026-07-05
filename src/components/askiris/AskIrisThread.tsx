import {
  getToolName,
  isToolUIPart,
  type DynamicToolUIPart,
  type ToolUIPart,
  type UIMessage,
} from "ai";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Iris from "@/components/iris/Iris";
import { IRIS_NAV } from "@/config/iris-config";
import Markdown from "@/components/askiris/Markdown";
import RecommendationDeck from "@/components/askiris/RecommendationDeck";
import type { Recommendation } from "@/lib/ai/recall";

// Presentational render of a message thread — no data fetching. AskIrisChat feeds
// it live useChat messages; the dev preview route feeds it fixtures, so the exact
// same rendering can be exercised with deterministic data (no LLM round-trip).

// One-line recap of a tool's return, so the trace stays readable without
// unfurling the full payload (which is in the collapsible below it).
function traceSummary(output: unknown): string {
  if (output && typeof output === "object") {
    const o = output as Record<string, unknown>;
    if (Array.isArray(o.matches) && Array.isArray(o.maybe)) {
      return `${o.totalMatched ?? "?"} matched · ${o.matches.length} shown · ${o.maybe.length} maybe`;
    }
    if (Array.isArray(o.results)) {
      return `${o.results.length} results`;
    }
  }
  return "—";
}

// Inline agent trace: what the model called and what came back. Gated on
// test-hook mode (?testhook=1) — it's a dev probe, not user-facing chat.
function ToolTrace({ part }: { part: ToolUIPart | DynamicToolUIPart }) {
  return (
    <div className="text-muted-foreground border-muted mt-2 rounded border border-dashed px-2 py-1 font-mono text-xs">
      <div className="font-semibold">
        🔧 {getToolName(part)} · {part.state}
      </div>
      {"input" in part && part.input != null ? (
        <pre className="mt-1 break-all whitespace-pre-wrap">in: {JSON.stringify(part.input)}</pre>
      ) : null}
      {part.state === "output-available" ? (
        <details className="mt-1">
          <summary className="cursor-pointer">out: {traceSummary(part.output)}</summary>
          <pre className="mt-1 break-all whitespace-pre-wrap">{JSON.stringify(part.output, null, 2)}</pre>
        </details>
      ) : null}
      {part.state === "output-error" ? (
        <pre className="text-destructive mt-1 break-all whitespace-pre-wrap">error: {part.errorText}</pre>
      ) : null}
    </div>
  );
}

type ActivityKey = "thinking" | "toolQuerying" | "toolSearching" | "toolRecommending" | "toolWorking";

// The label key for whatever a pending tool call is doing.
function toolLabelKey(name: string): ActivityKey {
  switch (name) {
    case "queryLenses": {
      return "toolQuerying";
    }
    case "searchLensByName": {
      return "toolSearching";
    }
    case "recommendLenses": {
      return "toolRecommending";
    }
    default: {
      return "toolWorking";
    }
  }
}

// What the live turn is doing right now, as an i18n key — or null for no indicator.
// A single signal at the growing edge, so parallel tool calls don't stack up and the
// gaps the per-part states miss (before the first token, between steps) don't read as
// frozen. Hidden while text visibly streams, since that's its own progress.
function activityKey(messages: UIMessage[], busy: boolean, debug: boolean): ActivityKey | null {
  if (debug || !busy || messages.length === 0) {
    return null;
  }
  const last = messages[messages.length - 1];
  const lastPart = last.parts[last.parts.length - 1];
  if (last.role !== "user" && lastPart?.type === "text") {
    return null;
  }
  if (lastPart && isToolUIPart(lastPart) && (lastPart.state === "input-streaming" || lastPart.state === "input-available")) {
    return toolLabelKey(getToolName(lastPart));
  }
  return "thinking";
}

export default function AskIrisThread({
  messages,
  locale,
  debug = false,
  busy = false,
}: {
  messages: UIMessage[];
  locale: string;
  debug?: boolean;
  busy?: boolean;
}) {
  const t = useTranslations("AskIris");
  const activeKey = activityKey(messages, busy, debug);
  const activity = activeKey ? t(activeKey) : null;

  return (
    <>
      {messages.map((message) => {
        const isUser = message.role === "user";
        return (
          <div
            key={message.id}
            className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
          >
            {isUser ? null : (
              <div className="flex items-center gap-1.5 px-1">
                <span className="border-border bg-background inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border">
                  <Iris config={IRIS_NAV} uid={`iris-${message.id}`} size={14} />
                </span>
                <span className="text-xs font-medium">Iris</span>
                <span className="bg-primary/10 text-primary rounded px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase">
                  Beta
                </span>
              </div>
            )}
            {message.parts.map((part, i) => {
              const key = `${message.id}-${i}`;
              if (part.type === "text") {
                // User text sits in a bubble; the assistant reply flows as one
                // continuous document (no per-part bubbles) like ChatGPT/Claude,
                // with card decks interleaved between the prose blocks.
                if (isUser) {
                  return (
                    <div
                      key={key}
                      className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap"
                    >
                      {part.text}
                    </div>
                  );
                }
                // Prose is capped to a readable measure even though the thread
                // (and the card grid) runs wider — long synthesis lines hurt
                // readability, especially in English.
                return (
                  <div key={key} className="text-foreground w-full px-1 text-sm">
                    <Markdown>{part.text}</Markdown>
                  </div>
                );
              }
              if (
                isToolUIPart(part) &&
                getToolName(part) === "recommendLenses" &&
                part.state === "output-available"
              ) {
                const { recommendations } = part.output as { recommendations: Recommendation[] };
                // Bottom margin separates the grid from whatever follows (usually
                // the next group's heading). Prose headings zero their own top
                // margin as a first-child, so without this they glue to the cards.
                return (
                  <div key={key} className="mb-4 w-full">
                    <RecommendationDeck recommendations={recommendations} locale={locale} />
                  </div>
                );
              }
              if (debug && isToolUIPart(part)) {
                return <ToolTrace key={key} part={part} />;
              }
              return null;
            })}
          </div>
        );
      })}
      {activity ? (
        <div className="text-muted-foreground flex items-center gap-2 px-1 py-1 text-sm">
          <Loader2 className="size-3.5 shrink-0 motion-safe:animate-spin" aria-hidden />
          <span>{activity}</span>
        </div>
      ) : null}
    </>
  );
}
