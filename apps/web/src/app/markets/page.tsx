"use client";

/**
 * Markets — same DNA as create / home (shell from AppChrome)
 */

import React from "react";
import NextLink from "next/link";
import { Icon } from "@iconify/react";
import { listRooms, type RoomSession } from "@/lib/agent-api";
import { CONTRACTS } from "@/lib/config";
import StatusBadge from "@/components/status-badge";
import { Reveal } from "@/components/landing/reveal";

export default function MarketsPage() {
  const [rooms, setRooms] = React.useState<RoomSession[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const marketsLive = Boolean(CONTRACTS.predictionMarket && CONTRACTS.collateralToken);

  const refresh = React.useCallback(async () => {
    const data = await listRooms();
    setRooms(data);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await refresh();
      } catch {
        if (!cancelled) setError("We couldn’t load matches right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const t = setInterval(() => {
      refresh().catch(() => undefined);
    }, 8000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [refresh]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Reveal className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <span className="lp-eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5B7CFA]" />
            Markets
          </span>
          <h1 className="mt-3 text-[clamp(1.75rem,3.5vw,2.35rem)] font-bold tracking-[-0.03em] text-[#0a0a0b]">
            Trade the outcome
          </h1>
          <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#3f3f46] sm:text-[15px]">
            Every live match is a market. Yes or no on the question.
          </p>
        </div>
        <NextLink
          href="/create"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#0a0a0b] px-4 text-[13px] font-semibold text-white hover:bg-[#18181b]"
        >
          <Icon icon="solar:add-circle-bold" width={16} className="text-white" />
          <span className="text-white">Create</span>
        </NextLink>
      </Reveal>

      {!marketsLive && (
        <div className="mb-4 rounded-2xl border border-black/[0.06] bg-[#f4f4f5] px-4 py-3 text-[13px] font-medium text-[#52525b]">
          Trading will open when each match is ready. You can still create and follow matches.
        </div>
      )}

      {loading && (
        <div className="grid gap-3 sm:grid-cols-2" aria-label="Loading matches">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-2xl border border-black/[0.06] bg-white"
            />
          ))}
        </div>
      )}
      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[13px] font-medium text-[#b91c1c]">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refresh().then(() => setError(null)).catch(() => undefined)}
            className="mm-button-secondary h-9 px-3 text-[12px]"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && rooms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f4f5] text-[#a1a1aa]">
            <Icon icon="solar:chart-2-linear" width={32} />
          </span>
          <p className="mt-4 text-[14px] font-semibold text-[#0a0a0b]">No markets yet</p>
          <p className="mt-1 text-[13px] font-medium text-[#71717a]">
            Create a match with two characters to start the conversation.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {rooms.map((room) => (
          <NextLink
            key={room.id}
            href={`/rooms/${room.id}`}
            className="mm-card-interactive lp-bento-shell group block"
          >
            <div className="lp-bento-core flex h-full flex-col gap-3 !p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[14px] font-semibold leading-snug text-[#0a0a0b] group-hover:text-[#5B7CFA]">
                  {room.marketQuestion}
                </p>
                <StatusBadge status={room.status} />
              </div>
              <p className="text-[12px] font-medium text-[#52525b]">
                {room.agentA.name} vs {room.agentB.name} · {room.topic}
              </p>
              <div className="mt-auto flex items-center justify-between pt-1">
                <div className="flex gap-3 text-[12px] font-bold">
                  <span className="text-emerald-700">YES</span>
                  <span className="text-red-700">NO</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#5B7CFA]">
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
