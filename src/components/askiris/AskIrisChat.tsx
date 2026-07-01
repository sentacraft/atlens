"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { useEffectiveMount } from "@/hooks/useMountParam";

// Experimental AskIris chat. Mount comes from the effective-mount preference
// (URL has none here) and locale from the route; both go through the transport
// body so the server scopes the agent to one mount and replies in one language.
// Only text parts are rendered today; tool results (structured lens data) fuel
// the model's prose and become cards in a later frontend pass.
export default function AskIrisChat({ locale }: { locale: string }) {
  const mount = useEffectiveMount();
  const [input, setInput] = useState("");
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { mount, locale } }),
    [mount, locale],
  );
  const { messages, sendMessage, status } = useChat({ transport });

  const isBusy = status === "submitted" || status === "streaming";

  // Keep the newest message in view as it streams.
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  function handleSubmit(event: React.FormEvent) {
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

      <div ref={logRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.map((message) => (
          <div key={message.id} className="whitespace-pre-wrap text-sm">
            <span className="text-muted-foreground mr-2 font-medium">
              {message.role === "user" ? "You" : "Iris"}
            </span>
            {message.parts.map((part, i) =>
              part.type === "text" ? (
                <span key={`${message.id}-${i}`}>{part.text}</span>
              ) : null,
            )}
          </div>
        ))}
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
