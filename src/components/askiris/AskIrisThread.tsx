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
import AiTag from "@/components/iris/AiTag";
import { IRIS_NAV } from "@/config/iris-config";
import Markdown from "@/components/askiris/Markdown";
import { CitationsProvider, SourceList } from "@/components/askiris/ReviewSources";
import RecommendationDeck from "@/components/askiris/RecommendationDeck";
import LensTable from "@/components/askiris/LensTable";
import ResponseFeedback from "@/components/askiris/ResponseFeedback";
import GearRequestCard from "@/components/askiris/GearRequestCard";
import { SignInGate } from "@/components/askiris/SignInCard";
import { signInGate } from "@/lib/ai/sign-in-gate";
import { ASK_FOR_GEAR, type GearRequestInput, type GearRequestOutput } from "@/lib/ai/gear-request";
import type { LensSummary } from "@/lib/lens/data";
import type { LensTableColumn, Recommendation, ResolvedLens } from "@/lib/ai/recall";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";
import { messageCitations } from "@/lib/askiris/review-citations";

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

/** What the thread needs to show the cards a turn pauses on and hand the user's answers back to the chat. */
export interface ChatCardBinding {
  lenses: LensSummary[];
  answerGear: (toolCallId: string, output: GearRequestOutput) => void;
  answerSignIn: (approvalId: string, approved: boolean) => void;
  /** Where a sign-in that leaves the page returns, reopening this conversation. */
  signInReturnTo: () => string;
}

/** A call the turn is paused on until the user answers its card. */
function isAwaitingUser(part: ToolUIPart | DynamicToolUIPart): boolean {
  return (
    (getToolName(part) === ASK_FOR_GEAR && part.state === "input-available") ||
    (part.state === "approval-requested" && !part.approval.isAutomatic)
  );
}

function ToolPart({
  part,
  debug,
  cards,
  latest,
  onExpand,
}: {
  part: ToolUIPart | DynamicToolUIPart;
  debug: boolean;
  cards?: ChatCardBinding;
  /** The part belongs to the newest message and no reply is streaming. */
  latest: boolean;
  onExpand?: () => void;
}) {
  if (getToolName(part) === ASK_FOR_GEAR && cards && (part.state === "input-available" || part.state === "output-available")) {
    return (
      <div className="w-full px-1">
        <GearRequestCard
          input={(part.input ?? {}) as GearRequestInput}
          output={part.state === "output-available" ? (part.output as GearRequestOutput) : undefined}
          active={latest}
          lenses={cards.lenses}
          signInReturnTo={cards.signInReturnTo}
          onAnswer={(output) => cards.answerGear(part.toolCallId, output)}
        />
      </div>
    );
  }
  const gate = signInGate(getToolName(part));
  if (gate && cards && "approval" in part && part.approval && !part.approval.isAutomatic) {
    const { id } = part.approval;
    return (
      <div className="w-full px-1">
        <SignInGate
          reason={gate}
          answered={part.state === "approval-requested" ? undefined : part.approval.approved}
          active={latest}
          returnTo={cards.signInReturnTo}
          onAnswer={(approved) => cards.answerSignIn(id, approved)}
        />
      </div>
    );
  }
  if (part.state === "output-available") {
    switch (getToolName(part)) {
      case "recommendLenses": {
        const { recommendations } = part.output as { recommendations: Recommendation[] };
        return (
          <div className="mb-4 w-full">
            <RecommendationDeck recommendations={recommendations} />
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
            <LensTable lenses={lenses} columns={columns} caption={caption} onExpand={onExpand} />
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
  lensReviews: "gathering",
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

const NO_CITATIONS = { byKey: new Map(), list: [] };

export default function AskIrisThread({
  messages,
  debug = false,
  busy = false,
  cards,
  onExpand,
}: {
  messages: AskIrisUIMessage[];
  debug?: boolean;
  busy?: boolean;
  cards?: ChatCardBinding;
  /** Widens the chat for content that does not fit; absent where the chat cannot widen. */
  onExpand?: () => void;
}) {
  const t = useTranslations("AskIris");
  const activeKey = activityKey(messages, busy, debug);
  const activity = activeKey ? t(activeKey) : null;

  return (
    <>
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        const citations = isUser ? null : messageCitations(messages, index);
        const turnId = isUser ? null : (message.metadata?.turnId ?? null);
        const isLatest = message.id === messages[messages.length - 1]?.id;
        const isStreamingResponse = busy && isLatest;
        const awaitingUser = message.parts.some((part) => isToolUIPart(part) && isAwaitingUser(part));
        return (
          <div
            key={message.id}
            className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
          >
            <CitationsProvider citations={citations ?? NO_CITATIONS}>
            {isUser ? null : (
              <div className="flex items-center gap-1.5 px-1">
                <span className="border-border bg-background inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border">
                  <Iris config={IRIS_NAV} uid={`iris-${message.id}`} size={14} />
                </span>
                <span className="text-xs font-medium">Iris</span>
                <AiTag />
                {message.metadata?.model ? (
                  <span className="font-mono text-[10px] text-zinc-400">{message.metadata.model}</span>
                ) : null}
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
                  <ToolPart key={key} part={part} debug={debug} cards={cards} latest={isLatest && !busy} onExpand={onExpand} />
                );
              }
              return null;
            })}
            </CitationsProvider>
            {citations && !isStreamingResponse ? <SourceList list={citations.list} /> : null}
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
