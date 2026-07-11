"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { toastInfo, toastSuccess, toastError } from "@/lib/toast";

export type PromptInputWithBottomActionsProps = {
  onSubmitNote?: (content: string) => Promise<void> | void;
  onStartDebate?: () => void;
  canStart?: boolean;
  isLive?: boolean;
  ideas?: { title: string; description: string; prompt?: string }[];
  disabled?: boolean;
};

const defaultIdeas = [
  {
    title: "Stay on topic",
    description: "Topic lock",
    prompt: "Master: enforce the market question. No digressions.",
  },
  {
    title: "Clear YES/NO",
    description: "Commit stance",
    prompt: "Each character must state a clear YES or NO lean before the next turn.",
  },
  {
    title: "Midpoint recap",
    description: "Summarize",
    prompt: "Master: give a 2-sentence midpoint summary of both positions.",
  },
  {
    title: "Open settlement",
    description: "Vote soon",
    prompt: "When ready, the referee should open the final vote based on the full match.",
  },
];

/** Compact host note input */
export default function PromptInputWithBottomActions({
  onSubmitNote,
  onStartDebate,
  canStart,
  isLive,
  ideas = defaultIdeas,
  disabled,
}: PromptInputWithBottomActionsProps) {
  const [prompt, setPrompt] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const send = async () => {
    const text = prompt.trim();
    if (!text || !onSubmitNote) return;
    try {
      setSending(true);
      await onSubmitNote(text);
      setPrompt("");
      toastSuccess("Note sent", "It shows up in the match feed");
    } catch (e) {
      toastError("Could not inject note", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {ideas.map(({ title, description, prompt: ideaPrompt }, index) => (
          <button
            key={index}
            type="button"
            onClick={() => {
              setPrompt(ideaPrompt ?? `${title}. ${description}`);
              toastInfo("Template loaded", title);
            }}
            className="shrink-0 rounded-full border border-black/[0.06] bg-[#f4f4f5] px-2.5 py-1 text-[11px] font-semibold text-[#0a0a0b] hover:bg-white"
          >
            {title}
          </button>
        ))}
      </div>

      <form
        className="flex items-end gap-2 rounded-xl border border-black/[0.08] bg-[#f4f4f5] p-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={disabled || sending}
          rows={2}
          maxLength={2000}
          placeholder="Add a host note for the room…"
          className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] font-medium text-[#0a0a0b] outline-none placeholder:text-[#a1a1aa]"
        />
        <div className="flex shrink-0 flex-col gap-1.5">
          {canStart && onStartDebate && (
            <button
              type="button"
              onClick={onStartDebate}
              className="inline-flex h-9 items-center gap-1 rounded-full bg-[#0a0a0b] px-3 text-[11px] font-semibold text-white hover:bg-[#18181b]"
            >
              <Icon icon="solar:play-bold" width={14} className="text-white" />
              <span className="text-white">Start</span>
            </button>
          )}
          <button
            type="submit"
            disabled={disabled || sending || !prompt.trim() || !onSubmitNote}
            className="inline-flex h-9 items-center gap-1 rounded-full bg-[#5B7CFA] px-3 text-[11px] font-semibold text-white hover:bg-[#4a6ae8] disabled:opacity-40"
          >
            <Icon icon="solar:plain-2-bold" width={14} className="text-white" />
            <span className="text-white">{sending ? "…" : "Send"}</span>
          </button>
        </div>
      </form>
      <div className="flex justify-between px-0.5 text-[10px] font-medium text-[#a1a1aa]">
        <span>{isLive ? "Live room" : "Ready"}</span>
        <span>{prompt.length}/2000</span>
      </div>
    </div>
  );
}
