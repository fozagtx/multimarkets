import React from "react";
import { cn } from "@/lib/cn";
import { roomStatusLabel } from "@/lib/agent-api";

/** Solid tint + dark label — never white-on-white like HeroUI flat chips in dark mode */
const STATUS_STYLES: Record<string, string> = {
  live: "bg-[#d1fae5] text-[#065f46]",
  running: "bg-[#d1fae5] text-[#065f46]",
  ready: "bg-[#dbeafe] text-[#1e3a8a]",
  created: "bg-[#dbeafe] text-[#1e3a8a]",
  paused: "bg-[#fef3c7] text-[#92400e]",
  settling: "bg-[#fef3c7] text-[#92400e]",
  failed: "bg-[#fee2e2] text-[#991b1b]",
  ended: "bg-[#f4f4f5] text-[#27272a]",
  settled: "bg-[#f4f4f5] text-[#27272a]",
  debate_ended: "bg-[#f4f4f5] text-[#27272a]",
};

const DEFAULT_STYLE = "bg-[#f4f4f5] text-[#18181b]";

export function statusBadgeClass(status: string): string {
  return STATUS_STYLES[status] ?? DEFAULT_STYLE;
}

type StatusBadgeProps = {
  status: string;
  label?: string;
  className?: string;
};

export default function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-tight",
        statusBadgeClass(status),
        className,
      )}
    >
      {label ?? roomStatusLabel(status)}
    </span>
  );
}
