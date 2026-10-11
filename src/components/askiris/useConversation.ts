"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";

export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

function updateConversationUrl(conversationId: string | null) {
  const url = new URL(window.location.href);
  if (conversationId) {
    url.searchParams.set("conversation", conversationId);
  } else {
    url.searchParams.delete("conversation");
  }
  window.history.pushState(null, "", url.toString());
}

export function useConversation({
  initialConversationId,
  loadInitialConversation = true,
  authenticated,
  messages,
  stop,
  setMessages,
}: {
  initialConversationId?: string;
  loadInitialConversation?: boolean;
  authenticated: boolean;
  messages: AskIrisUIMessage[];
  stop: () => void;
  setMessages: (messages: AskIrisUIMessage[]) => void;
}) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState(
    () => initialConversationId || crypto.randomUUID(),
  );
  const [loadingList, setLoadingList] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [listError, setListError] = useState(false);
  const loadedConversationRef = useRef<string | null>(null);
  const selectionRequestRef = useRef(0);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const refreshConversations = useCallback(async () => {
    if (!authenticated) {
      setConversations([]);
      return;
    }

    setLoadingList(true);
    setListError(false);
    try {
      const response = await fetch("/api/askiris/conversations", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("conversation_list_failed");
      }
      const data = (await response.json()) as { conversations: ConversationSummary[] };
      setConversations(data.conversations);
    } catch {
      setListError(true);
    } finally {
      setLoadingList(false);
    }
  }, [authenticated]);

  const selectConversation = useCallback(
    async (nextConversationId: string) => {
      if (nextConversationId === conversationId && messagesRef.current.length > 0) {
        return;
      }
      stop();
      const requestId = selectionRequestRef.current + 1;
      selectionRequestRef.current = requestId;
      setLoadingConversation(true);
      try {
        const response = await fetch(
          `/api/askiris/conversations/${encodeURIComponent(nextConversationId)}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          throw new Error("conversation_load_failed");
        }
        const data = (await response.json()) as {
          conversationId: string;
          messages: Array<{ message: AskIrisUIMessage }>;
        };
        if (selectionRequestRef.current !== requestId) {
          return;
        }
        setMessages(data.messages.map((item) => item.message));
        setConversationId(data.conversationId);
        updateConversationUrl(data.conversationId);
        loadedConversationRef.current = data.conversationId;
      } finally {
        if (selectionRequestRef.current === requestId) {
          setLoadingConversation(false);
        }
      }
    },
    [conversationId, setMessages, stop],
  );

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    if (
      !authenticated ||
      !loadInitialConversation ||
      !initialConversationId ||
      loadedConversationRef.current
    ) {
      return;
    }
    loadedConversationRef.current = initialConversationId;
    void selectConversation(initialConversationId).catch(() => {
      loadedConversationRef.current = null;
      setMessages([]);
    });
  }, [
    authenticated,
    initialConversationId,
    loadInitialConversation,
    selectConversation,
    setMessages,
  ]);

  const startNewConversation = useCallback(() => {
    stop();
    setMessages([]);
    const nextConversationId = crypto.randomUUID();
    setConversationId(nextConversationId);
    loadedConversationRef.current = null;
    updateConversationUrl(null);
  }, [setMessages, stop]);

  const syncConversationUrl = useCallback(() => {
    updateConversationUrl(conversationId);
  }, [conversationId]);

  return {
    conversations,
    conversationId,
    loadingList,
    loadingConversation,
    listError,
    refreshConversations,
    selectConversation,
    syncConversationUrl,
    startNewConversation,
  };
}
