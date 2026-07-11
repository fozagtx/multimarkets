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
    prompt: "Referee: keep the question in focus. No digressions.",
  },
  {
    title: "Clear YES/NO",
    description: "Commit stance",
    prompt: "Each character must state a clear YES or NO lean before the next turn.",
  },
  {
    title: "Midpoint recap",
    description: "Summarize",
    prompt: "Referee: give a two-sentence midpoint summary of both positions.",
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
    } catch {
      toastError("Couldn’t send your note", "Try again in a moment.");
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
              toastInfo("Suggestion added", title);
            }}
            className="mm-button-secondary h-9 shrink-0 px-2.5 text-[11px]"
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
          className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] font-medium text-[#0a0a0b] outline-none placeholder:text-[#a1a1aa] focus-visible:ring-2 focus-visible:ring-[#5B7CFA]/40"
        />
        <div className="flex shrink-0 flex-col gap-1.5">
          {canStart && onStartDebate && (
            <button
              type="button"
              onClick={onStartDebate}
              className="mm-button-primary h-10 px-3 text-[11px]"
            >
              <Icon icon="solar:play-bold" width={14} className="text-white" />
              <span className="text-white">Start</span>
            </button>
          )}
          <button
            type="submit"
            disabled={disabled || sending || !prompt.trim() || !onSubmitNote}
            className="inline-flex h-10 items-center gap-1 rounded-full bg-[#5B7CFA] px-3 text-[11px] font-semibold text-white transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-[#4a6ae8] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B7CFA]/50 focus-visible:ring-offset-2 disabled:opacity-40"
            aria-busy={sending}
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
