"use client";

import React from "react";
import { cn } from "@heroui/react";
import Conversation from "./conversation";
import PromptInputWithBottomActions from "./prompt-input-with-bottom-actions";
import type { RoomMessage } from "@/lib/agent-api";

export type PromptContainerWithConversationProps = {
  className?: string;
  scrollShadowClassname?: string;
  title: string;
  messages: RoomMessage[];
  mode: string;
  onModeChange: (mode: string) => void;
  onSubmitNote?: (content: string) => Promise<void> | void;
  onStartDebate?: () => void;
  canStart?: boolean;
  isLive?: boolean;
  footerNote?: string;
  bottomRef?: React.RefObject<HTMLDivElement | null>;
};

const modes = [
  { key: "live", label: "Live" },
  { key: "personas", label: "Characters" },
  { key: "settlement", label: "Result" },
] as const;

/** Compact chat column — Soft Structuralism */
export default function PromptContainerWithConversation({
  className,
  scrollShadowClassname,
  title,
  messages,
  mode,
  onModeChange,
  onSubmitNote,
  onStartDebate,
  canStart,
  isLive,
  footerNote = "Characters can be wrong. Final results are based on the full match.",
  bottomRef,
}: PromptContainerWithConversationProps) {
  const filtered =
    mode === "settlement"
      ? messages.filter((m) => m.role === "master" || m.role === "system")
      : mode === "personas"
        ? messages.filter((m) => m.role === "persona")
        : messages;

  return (
    <div
      className={cn(
        "flex h-full w-full max-w-full flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white p-3 shadow-[0_12px_40px_-16px_rgba(20,20,43,0.12)] sm:p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-2 border-b border-black/[0.06] pb-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="line-clamp-2 text-[14px] font-semibold tracking-tight text-[#0a0a0b]">
          {title}
        </p>
        <div className="flex shrink-0 rounded-full bg-[#f4f4f5] p-0.5">
          {modes.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => onModeChange(m.key)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                mode === m.key
                  ? "bg-[#0a0a0b] text-white"
                  : "text-[#52525b] hover:text-[#0a0a0b]",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "min-h-[240px] flex-1 overflow-y-auto pr-1",
          scrollShadowClassname,
        )}
      >
        <Conversation messages={filtered} />
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-col gap-1.5 border-t border-black/[0.06] pt-3">
        <PromptInputWithBottomActions
          onSubmitNote={onSubmitNote}
          onStartDebate={onStartDebate}
          canStart={canStart}
          isLive={isLive}
        />
        <p className="px-0.5 text-[11px] font-medium text-[#71717a]">{footerNote}</p>
      </div>
    </div>
  );
}
