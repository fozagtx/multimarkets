"use client";

import React from "react";
import { cn } from "@heroui/react";
import { Icon } from "@iconify/react";
import type { AgentStatus, RoomSession } from "@/lib/agent-api";
import StatusBadge from "@/components/status-badge";

const statusIcon: Record<string, string> = {
  ready: "solar:check-circle-bold",
  speaking: "solar:chat-round-dots-bold",
  thinking: "solar:cpu-bolt-bold",
  idle: "solar:pause-circle-bold",
  down: "solar:close-circle-bold",
  failed: "solar:close-circle-bold",
  restarting: "solar:refresh-circle-bold",
  online: "solar:check-circle-bold",
  degraded: "solar:danger-triangle-bold",
  starting: "solar:refresh-circle-bold",
};

export type ArenaControlsProps = {
  room: RoomSession;
  className?: string;
};

/** Compact match rail — only shows live, actionable room information. */
export default function ArenaControls({ room, className }: ArenaControlsProps) {
  const [copied, setCopied] = React.useState<"question" | "link" | null>(null);
  const agents: { label: string; name: string; status: AgentStatus }[] = [
    { label: "Referee", name: room.master.name, status: room.master.status },
    { label: "First", name: room.agentA.name, status: room.agentA.status },
    { label: "Second", name: room.agentB.name, status: room.agentB.status },
  ];

  const copy = async (value: string, target: "question" | "link") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(target);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-[#0a0a0b]">Match activity</p>
        <StatusBadge status={room.status} />
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#52525b]">
          In this match
        </p>
        <ul className="flex flex-col gap-1.5">
          {agents.map((a) => (
            <li
              key={a.label}
              className="flex items-center justify-between gap-2 rounded-xl bg-[#f4f4f5] px-2.5 py-2"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#71717a]">
                  {a.label}
                </p>
                <p className="truncate text-[12px] font-semibold text-[#0a0a0b]">{a.name}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold capitalize text-[#18181b] ring-1 ring-black/[0.06]">
                <Icon
                  icon={statusIcon[a.status] ?? statusIcon.ready}
                  width={12}
                  className="text-[#18181b]"
                />
                {a.status}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copy(room.marketQuestion, "question")}
          className="mm-button-secondary h-10 gap-1.5 px-3 text-[11px]"
        >
          <Icon icon={copied === "question" ? "solar:check-read-linear" : "solar:copy-linear"} width={14} />
          {copied === "question" ? "Copied" : "Copy question"}
        </button>
        <button
          type="button"
          onClick={() => void copy(window.location.href, "link")}
          className="mm-button-secondary h-10 gap-1.5 px-3 text-[11px]"
        >
          <Icon icon={copied === "link" ? "solar:check-read-linear" : "solar:share-linear"} width={14} />
          {copied === "link" ? "Copied" : "Copy link"}
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </p>
      <p className="text-[11px] font-medium text-[#71717a]">
        Turn {room.currentTurn ?? 0} · {room.agentA.name} vs {room.agentB.name}
      </p>
    </div>
  );
}
