"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";

export type ThreadItem =
  | { kind: "conversation"; messages: AskIrisUIMessage[] }
  | { kind: "divider"; label: string };

/**
 * Keeps the current conversation in the client while a future conversation list
 * loads and switches persisted conversations. Archived items remain a temporary
 * presentation detail until the persisted list UI replaces them.
 */
export function useConversation({
  messages,
  stop,
  setMessages,
}: {
  messages: AskIrisUIMessage[];
  stop: () => void;
  setMessages: (messages: AskIrisUIMessage[]) => void;
}) {
  const [archived, setArchived] = useState<ThreadItem[]>([]);
  const [conversationId, setConversationId] = useState(() => crypto.randomUUID());

  // Lets startNewConversation read the live thread without re-running on every streamed
  // message. Not a useEffectEvent: that would forbid the call from the composer's
  // button, which is one of the two callers.
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const startNewConversation = useCallback(
    (label: string) => {
      // So the remaining deltas of an in-flight stream don't leak past the reset.
      stop();
      // Snapshot (copy) the messages so they are detached from useChat's array.
      const live = [...messagesRef.current];
      setArchived((prev) => {
        if (live.length === 0 && prev.length === 0) {
          return prev;
        }
        // Asked again without chatting — retarget the trailing divider rather than
        // stack an empty one.
        if (live.length === 0 && prev[prev.length - 1]?.kind === "divider") {
          return [...prev.slice(0, -1), { kind: "divider", label }];
        }
        const next = [...prev];
        if (live.length > 0) {
          next.push({ kind: "conversation", messages: live });
        }
        next.push({ kind: "divider", label });
        return next;
      });
      setMessages([]);
      setConversationId(crypto.randomUUID());
    },
    [stop, setMessages],
  );

  return { archived, conversationId, startNewConversation };
}
