"use client";

import {
  getToolName,
  isToolUIPart,
  type DynamicToolUIPart,
  type ToolUIPart,
} from "ai";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Iris from "@/components/iris/Iris";
import { IRIS_NAV } from "@/config/iris-config";
import Markdown from "@/components/askiris/Markdown";
import RecommendationDeck from "@/components/askiris/RecommendationDeck";
import LensTable from "@/components/askiris/LensTable";
import ResponseFeedback from "@/components/askiris/ResponseFeedback";
import GearRequestCard from "@/components/askiris/GearRequestCard";
import { ASK_FOR_GEAR, type GearRequestInput, type GearRequestOutput } from "@/lib/ai/gear-request";
import type { LensSummary } from "@/lib/lens/data";
import type { LensTableColumn, RecommendationGroup, ResolvedLens } from "@/lib/ai/recall";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";

function traceSummary(output: unknown): string {
  if (output && typeof output === "object") {
    const o = output as Record<string, unknown>;
    if (Array.isArray(o.matches) && Array.isArray(o.maybe)) {
      return `${o.totalMatched ?? "?"} matched · ${o.matches.length} shown · ${o.maybe.length} maybe`;
    }
    if (Array.isArray(o.results)) {
      return `${o.results.length} results`;
    }
    if (Array.isArray(o.lenses)) {
      return `${o.lenses.length} tabled`;
    }
  }
  return "—";
}

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

/** What the thread needs to show the gear card and hand its answer back to the chat. */
export interface GearCardBinding {
  lenses: LensSummary[];
  onAnswer: (toolCallId: string, output: GearRequestOutput) => void;
}

function ToolPart({
  part,
  debug,
  gearCard,
  latest,
}: {
  part: ToolUIPart | DynamicToolUIPart;
  debug: boolean;
  gearCard?: GearCardBinding;
  /** The part belongs to the newest message and no reply is streaming. */
  latest: boolean;
}) {
  if (getToolName(part) === ASK_FOR_GEAR && gearCard && (part.state === "input-available" || part.state === "output-available")) {
    return (
      <div className="mb-2 w-full px-1">
        <GearRequestCard
          input={(part.input ?? {}) as GearRequestInput}
          output={part.state === "output-available" ? (part.output as GearRequestOutput) : undefined}
          active={latest}
          lenses={gearCard.lenses}
          onAnswer={(output) => gearCard.onAnswer(part.toolCallId, output)}
        />
      </div>
    );
  }
  if (part.state === "output-available") {
    switch (getToolName(part)) {
      case "recommendLenses": {
        const { groups } = part.output as { groups: RecommendationGroup[] };
        return (
          <div className="mb-4 w-full">
            <RecommendationDeck groups={groups} />
          </div>
        );
      }
      case "listLenses": {
        const { lenses, columns, caption } = part.output as {
          lenses: ResolvedLens[];
          columns: LensTableColumn[];
          caption: string | null;
        };
        return (
          <div className="mb-4 w-full">
            <LensTable lenses={lenses} columns={columns} caption={caption} />
          </div>
        );
      }
    }
  }
  return debug ? <ToolTrace part={part} /> : null;
}

type ActivityKey = "thinking" | "gathering" | "composing";

const TOOL_ACTIVITY: Record<string, ActivityKey> = {
  queryLenses: "gathering",
  searchLensByName: "gathering",
  lensDetails: "gathering",
  recommendLenses: "composing",
  listLenses: "composing",
};

function toolLabelKey(name: string): ActivityKey {
  return TOOL_ACTIVITY[name] ?? "thinking";
}

function activityKey(messages: AskIrisUIMessage[], busy: boolean, debug: boolean): ActivityKey | null {
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
  debug = false,
  busy = false,
  gearCard,
}: {
  messages: AskIrisUIMessage[];
  debug?: boolean;
  busy?: boolean;
  gearCard?: GearCardBinding;
}) {
  const t = useTranslations("AskIris");
  const activeKey = activityKey(messages, busy, debug);
  const activity = activeKey ? t(activeKey) : null;

  return (
    <>
      {messages.map((message) => {
        const isUser = message.role === "user";
        const turnId = isUser ? null : (message.metadata?.turnId ?? null);
        const isLatest = message.id === messages[messages.length - 1]?.id;
        const isStreamingResponse = busy && isLatest;
        const awaitingUser = message.parts.some(
          (part) => isToolUIPart(part) && getToolName(part) === ASK_FOR_GEAR && part.state === "input-available",
        );
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
                return isUser ? (
                  <div
                    key={key}
                    className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap"
                  >
                    {part.text}
                  </div>
                ) : (
                  <div key={key} className="text-foreground w-full px-1 text-sm">
                    <Markdown>{part.text}</Markdown>
                  </div>
                );
              }
              if (isToolUIPart(part)) {
                return (
                  <ToolPart key={key} part={part} debug={debug} gearCard={gearCard} latest={isLatest && !busy} />
                );
              }
              return null;
            })}
            {!isUser && turnId && !isStreamingResponse && !awaitingUser ? (
              <ResponseFeedback responseMessageId={message.id} />
            ) : null}
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
