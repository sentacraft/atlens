"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  type DynamicToolUIPart,
  type ToolUIPart,
} from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { useTestHookEnabled } from "@/context/TestHookProvider";
import Iris from "@/components/iris/Iris";
import { IRIS_NAV } from "@/config/iris-config";
import Markdown from "@/components/askiris/Markdown";

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

// Experimental AskIris chat. Mount comes from the effective-mount preference
// (URL has none here) and locale from the route; both go through the transport
// body so the server scopes the agent to one mount and replies in one language.
// Only text parts are rendered today; tool results (structured lens data) fuel
// the model's prose and become cards in a later frontend pass.
export default function AskIrisChat({ locale }: { locale: string }) {
  const mount = useEffectiveMount();
  const debug = useTestHookEnabled();
  const [input, setInput] = useState("");
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { mount, locale } }),
    [mount, locale],
  );
  const { messages, sendMessage, status } = useChat({ transport });

  const isBusy = status === "submitted" || status === "streaming";

  // Follow the newest content as it streams, but only while the user is pinned to
  // the bottom — scrolling up to read mid-stream must not get yanked back down.
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  useEffect(() => {
    if (pinnedRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [messages]);

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isBusy) {
      return;
    }
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="mx-auto flex h-[calc(100svh-var(--nav-height)-var(--safe-inset-bottom))] w-full max-w-2xl flex-col px-4">
      <header className="shrink-0 py-4">
        <h1 className="text-lg font-semibold">AskIris</h1>
        <p className="text-muted-foreground text-sm">
          Experimental — describe what you shoot and I&apos;ll recall lenses.
        </p>
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4"
      >
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
                if (part.type === "text") {
                  return (
                    <div
                      key={`${message.id}-${i}`}
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        isUser
                          ? "bg-primary text-primary-foreground max-w-[85%] whitespace-pre-wrap"
                          : "bg-muted text-foreground max-w-full"
                      }`}
                    >
                      {isUser ? part.text : <Markdown>{part.text}</Markdown>}
                    </div>
                  );
                }
                if (debug && isToolUIPart(part)) {
                  return <ToolTrace key={`${message.id}-${i}`} part={part} />;
                }
                return null;
              })}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 flex gap-2 py-4">
        <input
          className="border-input flex-1 rounded-md border px-3 py-2 text-sm"
          value={input}
          placeholder="e.g. a light lens for travel…"
          onChange={(event) => setInput(event.currentTarget.value)}
          disabled={isBusy}
        />
        <button
          type="submit"
          disabled={isBusy || !input.trim()}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
