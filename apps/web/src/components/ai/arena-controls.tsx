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
  temperature: number;
  onTemperatureChange: (v: number) => void;
  maxTurnsHint: number;
  onMaxTurnsHintChange: (v: number) => void;
  systemHint: string;
  onSystemHintChange: (v: string) => void;
  className?: string;
};

/** Compact arena rail — Soft Structuralism spacing */
export default function ArenaControls({
  room,
  temperature,
  onTemperatureChange,
  maxTurnsHint,
  onMaxTurnsHintChange,
  systemHint,
  onSystemHintChange,
  className,
}: ArenaControlsProps) {
  const agents: { label: string; name: string; status: AgentStatus }[] = [
    { label: "Master", name: room.master.name, status: room.master.status },
    { label: "A", name: room.agentA.name, status: room.agentA.status },
    { label: "B", name: room.agentB.name, status: room.agentB.status },
  ];

  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-[#0a0a0b]">Controls</p>
        <StatusBadge status={room.status} />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#52525b]">
          Referee notes
        </span>
        <textarea
          value={systemHint}
          onChange={(e) => onSystemHintChange(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-[12px] font-medium leading-relaxed text-[#0a0a0b] outline-none focus:border-[#5B7CFA]/40"
          placeholder="Keep the match fair and on topic…"
        />
        <span className="text-[11px] font-medium text-[#71717a]">
          Host notes you send appear in the match feed.
        </span>
      </label>

      <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-[#f4f4f5] p-3">
        <label className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#0a0a0b]">Creativity</span>
            <span className="text-[12px] font-semibold tabular-nums text-[#52525b]">
              {temperature.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={temperature}
            onChange={(e) => onTemperatureChange(Number(e.target.value))}
            className="w-full accent-[#0a0a0b]"
          />
        </label>
        <label className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#0a0a0b]">Max turns</span>
            <span className="text-[12px] font-semibold tabular-nums text-[#52525b]">
              {maxTurnsHint}
            </span>
          </div>
          <input
            type="range"
            min={4}
            max={40}
            step={1}
            value={maxTurnsHint}
            onChange={(e) => onMaxTurnsHintChange(Number(e.target.value))}
            className="w-full accent-[#0a0a0b]"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#52525b]">
          Status
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
          onClick={() => void navigator.clipboard.writeText(room.marketQuestion)}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#0a0a0b] hover:bg-[#fafafa]"
        >
          <Icon icon="solar:copy-linear" width={14} />
          Copy Q
        </button>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(window.location.href)}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#0a0a0b] hover:bg-[#fafafa]"
        >
          <Icon icon="solar:share-linear" width={14} />
          Share
        </button>
      </div>

      <p className="text-[11px] font-medium text-[#71717a]">
        Turn {room.currentTurn ?? 0} · {room.agentA.name} vs {room.agentB.name}
      </p>
    </div>
  );
}
