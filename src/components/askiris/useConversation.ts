"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";
import {
  fetchConversationList,
  fetchConversationMessages,
  readConversationParam,
  writeConversationParam,
  type ConversationSummary,
} from "@/lib/askiris/conversation-client";

export type ConversationNotice = "unavailable" | "loadFailed";
export type ConversationListState = "idle" | "loading" | "ready" | "error";

/**
 * Owns which persisted conversation the chat shows and keeps it in step with the
 * `?conversation=` URL param and the signed-in user's conversation list.
 *
 * Every switch (select, new chat, Back/Forward) bumps one request token; a load that
 * resolves under a stale token is dropped, so a slow response can never overwrite the
 * conversation the user moved to since.
 */
export function useConversation({
  initialConversationId,
  authenticated,
  busy,
  stop,
  setMessages,
  clearError,
}: {
  initialConversationId?: string;
  authenticated: boolean;
  busy: boolean;
  stop: () => void;
  setMessages: (messages: AskIrisUIMessage[]) => void;
  clearError: () => void;
}) {
  // The id only changes once its messages are on screen: sending a turn under an id
  // whose history never loaded would write new messages over its stored sequence.
  const [conversationId, setConversationId] = useState(() => crypto.randomUUID());
  // Starts true for a linked conversation, so neither the server render nor the first
  // client render flashes the empty-state hero before the thread loads.
  const [loading, setLoading] = useState(() => Boolean(initialConversationId));
  const [notice, setNotice] = useState<ConversationNotice | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [listState, setListState] = useState<ConversationListState>("idle");

  const requestRef = useRef(0);
  const conversationIdRef = useRef(conversationId);
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const resetToNew = useCallback(() => {
    stop();
    clearError();
    setMessages([]);
    setConversationId(crypto.randomUUID());
    setLoading(false);
  }, [clearError, setMessages, stop]);

  const load = useCallback(
    async (targetId: string, history: "push" | "none") => {
      const token = ++requestRef.current;
      stop();
      clearError();
      setNotice(null);
      setLoading(true);
      try {
        const result = await fetchConversationMessages(targetId);
        if (token !== requestRef.current) {
          return;
        }
        if (result === "unavailable") {
          resetToNew();
          writeConversationParam(null, "replace");
          setNotice("unavailable");
          return;
        }
        setMessages(result);
        setConversationId(targetId);
        if (history === "push") {
          writeConversationParam(targetId, "push");
        }
      } catch {
        if (token !== requestRef.current) {
          return;
        }
        // Keep showing what was there, and stop the URL from naming the failed target.
        if (readConversationParam() === targetId) {
          writeConversationParam(null, "replace");
        }
        setNotice("loadFailed");
      } finally {
        if (token === requestRef.current) {
          setLoading(false);
        }
      }
    },
    [clearError, resetToNew, setMessages, stop],
  );

  const selectConversation = useCallback(
    (targetId: string) => {
      if (busy || targetId === conversationIdRef.current) {
        return;
      }
      void load(targetId, "push");
    },
    [busy, load],
  );

  const startNewConversation = useCallback(() => {
    if (busy) {
      return;
    }
    requestRef.current += 1;
    resetToNew();
    setNotice(null);
    writeConversationParam(null, "push");
  }, [busy, resetToNew]);

  const refreshConversations = useCallback(
    async ({ background }: { background: boolean }) => {
      if (!authenticated) {
        setConversations([]);
        setListState("idle");
        return;
      }
      if (!background) {
        setListState("loading");
      }
      try {
        const list = await fetchConversationList();
        setConversations(list);
        setListState("ready");
        // Name the shown conversation in the URL once the server has it, so a reload
        // reopens it; earlier, a reload would find nothing to open.
        if (list.some((item) => item.id === conversationIdRef.current)) {
          writeConversationParam(conversationIdRef.current, "replace");
        }
      } catch {
        // A failed background refresh keeps the list it already has.
        if (!background) {
          setListState("error");
        }
      }
    },
    [authenticated],
  );

  useEffect(() => {
    void refreshConversations({ background: false });
  }, [refreshConversations]);

  // Loaded without waiting for the session: the endpoint answers a signed-out visitor
  // with 401, which shows the same "unavailable" notice as a missing conversation.
  const initialHandledRef = useRef(false);
  useEffect(() => {
    if (initialHandledRef.current || !initialConversationId) {
      return;
    }
    initialHandledRef.current = true;
    void load(initialConversationId, "none");
  }, [initialConversationId, load]);

  // Back/Forward cannot be blocked, so a reply still streaming is stopped by load().
  useEffect(() => {
    function onPopState() {
      const target = readConversationParam();
      if (target === conversationIdRef.current) {
        return;
      }
      if (target) {
        void load(target, "none");
      } else {
        requestRef.current += 1;
        resetToNew();
        setNotice(null);
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [load, resetToNew]);

  // A finished turn moves its conversation to the top of the list (or adds it).
  const wasBusyRef = useRef(busy);
  useEffect(() => {
    if (wasBusyRef.current && !busy) {
      void refreshConversations({ background: true });
    }
    wasBusyRef.current = busy;
  }, [busy, refreshConversations]);

  return {
    conversationId,
    loading,
    notice,
    dismissNotice: () => setNotice(null),
    conversations,
    listState,
    selectConversation,
    startNewConversation,
  };
}
