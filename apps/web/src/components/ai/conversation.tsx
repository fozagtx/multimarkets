"use client";

import React from "react";
import MessageCard from "./message-card";
import type { RoomMessage } from "@/lib/agent-api";

export type ConversationProps = {
  messages: RoomMessage[];
  emptyLabel?: string;
};

/** Compact conversation list */
export default function Conversation({
  messages,
  emptyLabel = "No messages yet. Start the debate to see the match unfold.",
}: ConversationProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1 py-10 text-center">
        <p className="text-[13px] font-medium text-[#71717a]">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {messages.map((m) => (
        <MessageCard
          key={m.id}
          agentName={m.agentName}
          role={m.role}
          message={m.content}
          showFeedback={m.role === "persona" || m.role === "master"}
          attempts={1}
          messageClassName={
            m.role === "system"
              ? "bg-[#f4f4f5] text-[#52525b] italic"
              : m.role === "master"
                ? "bg-[#eff2ff] text-[#0a0a0b] border border-[#5B7CFA]/20"
                : "bg-[#f4f4f5] text-[#0a0a0b]"
          }
          timestamp={
            typeof m.createdAt === "number"
              ? new Date(m.createdAt).toISOString()
              : String(m.createdAt)
          }
        />
      ))}
    </div>
  );
}
