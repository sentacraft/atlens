"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";
import {
  conversationListQueryKey,
  fetchConversationList,
  fetchConversationMessages,
} from "@/lib/askiris/conversation-client";
import { readConversationParam, writeConversationParam } from "@/lib/url/askiris";

export type ConversationNotice = "unavailable" | "loadFailed";
export type ConversationListState = "idle" | "loading" | "ready" | "error";

// Every switch bumps one request token; a load resolving under a stale token is dropped.
export function useConversation({
  initialConversationId,
  userId,
  busy,
  turnFailed,
  historyChanged,
  stop,
  setMessages,
  clearError,
  onNotice,
}: {
  initialConversationId?: string;
  userId: string | undefined;
  busy: boolean;
  // Describe the turn that just ended: whether it errored, and whether the server
  // reported a history this client had not seen.
  turnFailed: boolean;
  historyChanged: boolean;
  stop: () => void;
  setMessages: (messages: AskIrisUIMessage[]) => void;
  clearError: () => void;
  onNotice: (notice: ConversationNotice) => void;
}) {
  // Changes only once its messages are on screen: a turn sent under an id whose history never
  // loaded would overwrite its stored sequence.
  const [conversationId, setConversationId] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(() => Boolean(initialConversationId));

  const requestRef = useRef(0);
  const onNoticeRef = useRef(onNotice);
  useEffect(() => {
    onNoticeRef.current = onNotice;
  }, [onNotice]);
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
      setLoading(true);
      try {
        const result = await fetchConversationMessages(targetId);
        if (token !== requestRef.current) {
          return;
        }
        if (result === "unavailable") {
          resetToNew();
          writeConversationParam(null, "replace");
          onNoticeRef.current("unavailable");
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
        if (readConversationParam() === targetId) {
          writeConversationParam(null, "replace");
        }
        onNoticeRef.current("loadFailed");
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
    writeConversationParam(null, "push");
  }, [busy, resetToNew]);

  const queryClient = useQueryClient();
  const listQuery = useQuery({
    queryKey: conversationListQueryKey(userId ?? ""),
    queryFn: fetchConversationList,
    enabled: Boolean(userId),
  });
  const conversations = userId ? (listQuery.data ?? []) : [];
  const listState: ConversationListState = !userId
    ? "idle"
    : listQuery.data
      ? "ready"
      : listQuery.isError
        ? "error"
        : "loading";

  const initialHandledRef = useRef(false);
  useEffect(() => {
    if (initialHandledRef.current || !initialConversationId) {
      return;
    }
    initialHandledRef.current = true;
    void load(initialConversationId, "none");
  }, [initialConversationId, load]);

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
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [load, resetToNew]);

  const resync = useCallback(async () => {
    const token = ++requestRef.current;
    try {
      const result = await fetchConversationMessages(conversationIdRef.current);
      if (token === requestRef.current && result !== "unavailable") {
        setMessages(result);
      }
    } catch {
      // The thread on screen stays usable; the next turn reports the difference again.
    }
  }, [setMessages]);

  // The server saves a turn before its stream closes, so a finished turn can be
  // reopened from the URL and reloaded at once.
  const wasBusyRef = useRef(busy);
  useEffect(() => {
    const turnEnded = wasBusyRef.current && !busy;
    wasBusyRef.current = busy;
    if (!turnEnded) {
      return;
    }
    if (!turnFailed && readConversationParam() !== conversationIdRef.current) {
      writeConversationParam(conversationIdRef.current, "replace");
    }
    if (historyChanged) {
      void resync();
    }
    if (userId) {
      void queryClient.invalidateQueries({ queryKey: conversationListQueryKey(userId) });
    }
  }, [busy, turnFailed, historyChanged, resync, queryClient, userId]);

  return {
    conversationId,
    loading,
    conversations,
    listState,
    selectConversation,
    startNewConversation,
  };
}
