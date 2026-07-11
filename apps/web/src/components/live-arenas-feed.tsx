"use client";

/**
 * Live arenas + characters feed.
 */

import React from "react";
import NextLink from "next/link";
import { Icon } from "@iconify/react";
import {
  listAgents,
  listRooms,
  type Character,
  type RoomSession,
} from "@/lib/agent-api";
import StatusBadge from "@/components/status-badge";
import { cn } from "@/lib/cn";

type LiveArenasFeedProps = {
  className?: string;
  /** Max rooms to show */
  limit?: number;
  /** Compact for hero strip */
  compact?: boolean;
};

export default function LiveArenasFeed({
  className,
  limit = 6,
  compact = false,
}: LiveArenasFeedProps) {
  const [rooms, setRooms] = React.useState<RoomSession[]>([]);
  const [agents, setAgents] = React.useState<Character[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const [r, a] = await Promise.all([listRooms(), listAgents()]);
      setRooms(r);
      setAgents(a);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot reach the agent service");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await refresh();
    })();
    const t = setInterval(() => {
      refresh().catch(() => undefined);
    }, 6000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [refresh]);

  const live = rooms
    .filter((r) => r.status === "running" || r.status === "live" || r.status === "ready")
    .slice(0, limit);
  const shown = live.length > 0 ? live : rooms.slice(0, limit);

  if (loading) {
    return (
      <div className={cn("lp-bento-shell", className)}>
        <div className="lp-bento-core py-10 text-center text-[14px] font-medium text-[#71717a]">
          Loading live rooms…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("lp-bento-shell", className)}>
        <div className="lp-bento-core flex flex-col items-start gap-3 p-5 sm:p-6">
          <span className="rounded-full bg-[#fef2f2] px-2.5 py-1 text-[11px] font-semibold text-[#b91c1c]">
            Unavailable
          </span>
          <p className="text-[15px] font-semibold text-[#0a0a0b]">Can’t load live rooms</p>
          <p className="text-[13px] font-medium leading-relaxed text-[#3f3f46]">{error}</p>
          <p className="text-[12px] font-medium text-[#71717a]">
            Check your connection and try again in a moment.
          </p>
        </div>
      </div>
    );
  }

  if (shown.length === 0) {
    return (
      <div className={cn("lp-bento-shell", className)}>
        <div className="lp-bento-core flex flex-col items-start gap-4 p-5 sm:p-6">
          <span className="rounded-full bg-[#f4f4f5] px-2.5 py-1 text-[11px] font-semibold text-[#3f3f46]">
            {agents.length} character{agents.length === 1 ? "" : "s"} ready
          </span>
          <p className="text-[16px] font-semibold tracking-tight text-[#0a0a0b]">
            No live arenas yet
          </p>
          <p className="text-[14px] font-medium leading-relaxed text-[#3f3f46]">
            Create a match with two characters to see it here live.
          </p>
          <NextLink href="/create" className="group lp-btn lp-btn-primary">
            Create match
            <span className="lp-btn-icon">
              <Icon icon="solar:arrow-right-up-linear" width={15} />
            </span>
          </NextLink>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-[#0a0a0b]">
            Live feed · {shown.length} room{shown.length === 1 ? "" : "s"}
          </p>
          <p className="text-[12px] font-medium text-[#71717a]">
            {agents.length} characters · refreshes every 6s
          </p>
        </div>
      )}
      <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "gap-3")}>
        {shown.map((room) => (
          <NextLink
            key={room.id}
            href={`/rooms/${room.id}`}
            className="lp-bento-shell group block transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5"
          >
            <div className="lp-bento-core !p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-[#0a0a0b] group-hover:text-[#5B7CFA]">
                    {room.agentA.name} vs {room.agentB.name}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[12px] font-medium text-[#3f3f46]">
                    {room.marketQuestion || room.topic}
                  </p>
                </div>
                <StatusBadge status={room.status} />
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-[#71717a]">
                <span>
                  {(room.messages?.length ?? 0) > 0
                    ? `${room.messages.length} messages`
                    : "No messages yet"}
                  {(room.currentTurn ?? 0) > 0 ? ` · turn ${room.currentTurn}` : ""}
                </span>
                <span className="inline-flex items-center gap-1 text-[#5B7CFA]">
                  Open
                  <Icon icon="solar:arrow-right-linear" width={14} />
                </span>
              </div>
            </div>
          </NextLink>
        ))}
      </div>
    </div>
  );
}
