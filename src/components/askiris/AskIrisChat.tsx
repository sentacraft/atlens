"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useState } from "react";
import type { Mount } from "@/lib/types";

// Experimental AskIris chat. mount + locale are fixed by the route and passed
// through the transport body so the server scopes the agent to one mount and
// replies in one language. Only text parts are rendered today; tool results
// (structured lens data) fuel the model's prose and become cards in a later
// frontend pass — see the runtime plan's decoupling section.
export default function AskIrisChat({ mount, locale }: { mount: Mount; locale: string }) {
  const [input, setInput] = useState("");
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { mount, locale } }),
    [mount, locale],
  );
  const { messages, sendMessage, status } = useChat({ transport });

  const isBusy = status === "submitted" || status === "streaming";

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
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-8">
      <header className="mb-6">
        <h1 className="text-lg font-semibold">AskIris</h1>
        <p className="text-muted-foreground text-sm">
          Experimental — describe what you shoot and I&apos;ll recall lenses.
        </p>
      </header>

      <div className="flex-1 space-y-4">
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

      <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
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
