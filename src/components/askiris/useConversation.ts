"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";
import type { AskIrisConversationRecord } from "@/lib/askiris/conversation-repository";
import {
  conversationListQueryKey,
  conversationMessagesQuery,
  deleteConversation,
  fetchConversationList,
  renameConversation,
} from "@/lib/askiris/conversation-client";
import { readConversationParam, writeConversationParam } from "@/lib/url/askiris";

export type ConversationNotice = "unavailable" | "loadFailed" | "saveFailed";
export type ConversationListState = "idle" | "loading" | "ready" | "error";

interface ActiveConversation {
  id: string;
  messages: AskIrisUIMessage[];
}

function newConversation(): ActiveConversation {
  return { id: crypto.randomUUID(), messages: [] };
}

/**
 * Which conversation the chat shows. `id` and `messages` feed `useChat({ id, messages })`,
 * which starts a fresh Chat whenever the id changes, so the id moves only together with
 * the messages it was loaded with. Every switch bumps one request token; a load resolving
 * under a stale token is dropped.
 */
export function useConversation({
  initialConversationId,
  userId,
  onNotice,
}: {
  initialConversationId?: string;
  userId: string | undefined;
  onNotice: (notice: ConversationNotice) => void;
}) {
  const queryClient = useQueryClient();
  const [active, setActive] = useState(newConversation);
  const [loading, setLoading] = useState(() => Boolean(initialConversationId));

  const requestRef = useRef(0);
  const onNoticeRef = useRef(onNotice);
  useEffect(() => {
    onNoticeRef.current = onNotice;
  }, [onNotice]);
  const activeIdRef = useRef(active.id);
  useEffect(() => {
    activeIdRef.current = active.id;
  }, [active.id]);

  const resetToNew = useCallback(() => {
    requestRef.current += 1;
    setActive(newConversation());
    setLoading(false);
  }, []);

  const load = useCallback(
    async (targetId: string, history: "push" | "none") => {
      const token = ++requestRef.current;
      setLoading(true);
      try {
        const result = await queryClient.fetchQuery(conversationMessagesQuery(targetId));
        if (token !== requestRef.current) {
          return;
        }
        if (result === "unavailable") {
          resetToNew();
          writeConversationParam(null, "replace");
          onNoticeRef.current("unavailable");
          return;
        }
        setActive({ id: targetId, messages: result });
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
    [queryClient, resetToNew],
  );

  const selectConversation = useCallback(
    (targetId: string) => {
      if (targetId !== activeIdRef.current) {
        void load(targetId, "push");
      }
    },
    [load],
  );

  const startNewConversation = useCallback(() => {
    resetToNew();
    writeConversationParam(null, "push");
  }, [resetToNew]);

  const listQuery = useQuery({
    queryKey: conversationListQueryKey(userId ?? ""),
    queryFn: fetchConversationList,
    enabled: Boolean(userId),
  });
  const conversations = userId ? (listQuery.data ?? []) : [];
  const listKey = conversationListQueryKey(userId ?? "");

  // Both edits update the list at once and roll it back if the server refuses.
  function useListEdit<Input>(
    request: (input: Input) => Promise<void>,
    edit: (list: AskIrisConversationRecord[], input: Input) => AskIrisConversationRecord[],
  ) {
    return useMutation({
      mutationFn: request,
      onMutate: async (input: Input) => {
        await queryClient.cancelQueries({ queryKey: listKey });
        const previous = queryClient.getQueryData<AskIrisConversationRecord[]>(listKey);
        queryClient.setQueryData<AskIrisConversationRecord[]>(listKey, (list = []) => edit(list, input));
        return { previous };
      },
      onError: (_error, _input, context) => {
        queryClient.setQueryData(listKey, context?.previous);
        onNoticeRef.current("saveFailed");
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
    });
  }

  const rename = useListEdit(
    ({ id, title }: { id: string; title: string }) => renameConversation(id, { title }),
    (list, { id, title }) => list.map((item) => (item.id === id ? { ...item, title } : item)),
  );
  const remove = useListEdit(
    (id: string) => deleteConversation(id),
    (list, id) => list.filter((item) => item.id !== id),
  );

  function renameConversationTitle(id: string, title: string) {
    rename.mutate({ id, title });
  }

  // Deleting the open conversation leaves the user on a new, empty one.
  function deleteConversationById(id: string) {
    remove.mutate(id);
    if (id === activeIdRef.current) {
      resetToNew();
      writeConversationParam(null, "replace");
    }
  }
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
      if (target === activeIdRef.current) {
        return;
      }
      if (target) {
        void load(target, "none");
      } else {
        resetToNew();
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [load, resetToNew]);

  return {
    conversationId: active.id,
    initialMessages: active.messages,
    loading,
    conversations,
    listState,
    selectConversation,
    startNewConversation,
    renameConversation: renameConversationTitle,
    deleteConversation: deleteConversationById,
  };
}

/** Follows up a finished turn: names it in the URL, realigns a diverged history, refreshes the list. */
export function useTurnSync({
  conversationId,
  userId,
  busy,
  turnFailed,
  historyChanged,
  setMessages,
}: {
  conversationId: string;
  userId: string | undefined;
  busy: boolean;
  turnFailed: boolean;
  // The server reported a history this client had not seen.
  historyChanged: boolean;
  // Bound to the chat that ran the turn, so a reload landing after a switch changes nothing on screen.
  setMessages: (messages: AskIrisUIMessage[]) => void;
}) {
  const queryClient = useQueryClient();

  // The server saves a turn before its stream closes, so a finished turn can be
  // reopened from the URL and reloaded at once.
  const wasBusyRef = useRef(busy);
  const lastConversationIdRef = useRef(conversationId);
  useEffect(() => {
    const wasBusy = wasBusyRef.current;
    wasBusyRef.current = busy;
    if (lastConversationIdRef.current !== conversationId) {
      lastConversationIdRef.current = conversationId;
      // Switching away mid-reply stops it; the server still saves what was written.
      if (wasBusy && userId) {
        void queryClient.invalidateQueries({ queryKey: conversationListQueryKey(userId) });
      }
      return;
    }
    if (!wasBusy || busy) {
      return;
    }
    if (!turnFailed && readConversationParam() !== conversationId) {
      writeConversationParam(conversationId, "replace");
    }
    if (historyChanged) {
      queryClient
        .fetchQuery(conversationMessagesQuery(conversationId))
        .then((result) => {
          if (result !== "unavailable") {
            setMessages(result);
          }
        })
        // The thread on screen stays usable; the next turn reports the difference again.
        .catch(() => {});
    }
    if (userId) {
      void queryClient.invalidateQueries({ queryKey: conversationListQueryKey(userId) });
    }
  }, [busy, turnFailed, historyChanged, conversationId, setMessages, queryClient, userId]);
}
