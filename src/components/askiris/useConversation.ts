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

export type ConversationNotice = "notFound" | "loadFailed";
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
  sessionPending,
  authenticated,
  busy,
  stop,
  setMessages,
  clearError,
}: {
  initialConversationId?: string;
  sessionPending: boolean;
  authenticated: boolean;
  busy: boolean;
  stop: () => void;
  setMessages: (messages: AskIrisUIMessage[]) => void;
  clearError: () => void;
}) {
  // The id only changes once its messages are on screen: sending a turn under an id
  // whose history never loaded would write new messages over its stored sequence.
  const [conversationId, setConversationId] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(false);
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
        if (result === "not_found") {
          resetToNew();
          writeConversationParam(null, "replace");
          setNotice("notFound");
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

  // Called when a turn is sent, so a reload or a shared link reopens this conversation.
  // Replace rather than push: sending is not navigation.
  const commitConversationUrl = useCallback(() => {
    if (authenticated) {
      writeConversationParam(conversationIdRef.current, "replace");
    }
  }, [authenticated]);

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
        setConversations(await fetchConversationList());
        setListState("ready");
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

  // The URL can only be resolved once the session is known: signed in, load it;
  // signed out, it cannot be loaded, so drop it from the URL.
  const initialHandledRef = useRef(false);
  useEffect(() => {
    if (sessionPending || initialHandledRef.current || !initialConversationId) {
      return;
    }
    initialHandledRef.current = true;
    if (authenticated) {
      void load(initialConversationId, "none");
    } else {
      writeConversationParam(null, "replace");
    }
  }, [authenticated, initialConversationId, load, sessionPending]);

  // Back/Forward cannot be blocked, so a reply still streaming is stopped by load().
  useEffect(() => {
    function onPopState() {
      const target = readConversationParam();
      if (target === conversationIdRef.current) {
        return;
      }
      if (target && authenticated) {
        void load(target, "none");
      } else {
        requestRef.current += 1;
        resetToNew();
        setNotice(null);
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [authenticated, load, resetToNew]);

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
    commitConversationUrl,
  };
}
