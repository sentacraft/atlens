"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";

// Bare hello-world chat against /api/chat. No domain logic yet — this exists to
// de-risk the stack (AI SDK + DeepSeek + workerd streaming) before the lens
// tools and system prompt land. useChat's default transport POSTs to /api/chat.
export default function CopilotChat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();

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
        <h1 className="text-lg font-semibold">Copilot</h1>
        <p className="text-muted-foreground text-sm">
          Experimental — streaming hello world.
        </p>
      </header>

      <div className="flex-1 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="whitespace-pre-wrap text-sm">
            <span className="text-muted-foreground mr-2 font-medium">
              {message.role === "user" ? "You" : "AI"}
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
          placeholder="Say something…"
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
