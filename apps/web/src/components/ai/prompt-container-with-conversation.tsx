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

/** Compact chat column — fixed-height feed, scrolls inside the box */
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

  const feedRef = React.useRef<HTMLDivElement>(null);
  const shouldFollowRef = React.useRef(true);
  const [hasUnseenMessages, setHasUnseenMessages] = React.useState(false);

  React.useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    if (shouldFollowRef.current) {
      el.scrollTop = el.scrollHeight;
      setHasUnseenMessages(false);
    } else {
      setHasUnseenMessages(true);
    }
  }, [filtered.length]);

  const updateFollowState = () => {
    const el = feedRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    shouldFollowRef.current = atBottom;
    if (atBottom) setHasUnseenMessages(false);
  };

  const jumpToLatest = () => {
    const el = feedRef.current;
    if (!el) return;
    shouldFollowRef.current = true;
    el.scrollTop = el.scrollHeight;
    setHasUnseenMessages(false);
  };

  return (
    <div
      className={cn(
        "relative flex h-[min(70vh,640px)] w-full max-w-full flex-col gap-3 overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-3 shadow-[0_12px_40px_-16px_rgba(20,20,43,0.12)] sm:p-4",
        className,
      )}
    >
      <div className="flex shrink-0 flex-col gap-2 border-b border-black/[0.06] pb-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="line-clamp-2 text-[14px] font-semibold tracking-tight text-[#0a0a0b]">
          {title}
        </p>
        <div role="tablist" aria-label="Conversation view" className="flex shrink-0 rounded-full bg-[#f4f4f5] p-0.5">
          {modes.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => onModeChange(m.key)}
              role="tab"
              aria-selected={mode === m.key}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B7CFA]/50 focus-visible:ring-offset-2",
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
        ref={feedRef}
        onScroll={updateFollowState}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1",
          scrollShadowClassname,
        )}
      >
        <Conversation messages={filtered} />
        <div ref={bottomRef} />
      </div>

      {hasUnseenMessages && (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-28 left-1/2 inline-flex h-9 -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#0a0a0b] px-3 text-[11px] font-semibold text-white shadow-lg transition-transform duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B7CFA]/50 focus-visible:ring-offset-2"
        >
          <span className="text-white">New messages</span>
        </button>
      )}

      <div className="flex shrink-0 flex-col gap-1.5 border-t border-black/[0.06] pt-3">
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
