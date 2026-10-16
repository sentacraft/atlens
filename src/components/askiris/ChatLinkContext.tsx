"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ChatLinkTargets } from "@/lib/askiris/inline-links";

// Passed from the server: importing the catalogue in a client component would ship 477KB to
// build a 13KB map.
const ChatLinkContext = createContext<ChatLinkTargets | undefined>(undefined);

export function ChatLinkProvider({ targets, children }: { targets: ChatLinkTargets; children: ReactNode }) {
  return <ChatLinkContext.Provider value={targets}>{children}</ChatLinkContext.Provider>;
}

export function useChatLinkTargets(): ChatLinkTargets | undefined {
  return useContext(ChatLinkContext);
}
