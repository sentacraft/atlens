"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";

export type ThreadItem =
  | { kind: "seg"; messages: UIMessage[] }
  | { kind: "divider"; label: string };

/**
 * A chat thread cut into segments. Only the live segment is ever sent to the
 * model; closed-off ones stay on screen above a labelled divider, read-only.
 *
 * `segmentId` rides on each turn's request body so the server can group turns
 * into sessions, and is re-minted at every boundary.
 */
export function useConversationSegments({
  messages,
  stop,
  setMessages,
}: {
  messages: UIMessage[];
  stop: () => void;
  setMessages: (messages: UIMessage[]) => void;
}) {
  const [archived, setArchived] = useState<ThreadItem[]>([]);
  const [segmentId, setSegmentId] = useState(() => crypto.randomUUID());

  // Lets startNewSegment read the live thread without re-running on every streamed
  // message. Not a useEffectEvent: that would forbid the call from the composer's
  // button, which is one of the two callers.
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const startNewSegment = useCallback(
    (label: string) => {
      // So the remaining deltas of an in-flight stream don't leak past the reset.
      stop();
      // Snapshot (copy) the segment so it's detached from useChat's array.
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
          next.push({ kind: "seg", messages: live });
        }
        next.push({ kind: "divider", label });
        return next;
      });
      setMessages([]);
      setSegmentId(crypto.randomUUID());
    },
    [stop, setMessages],
  );

  return { archived, segmentId, startNewSegment };
}
