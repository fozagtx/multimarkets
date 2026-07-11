"use client";

/**
 * Arenas list — Soft Structuralism DNA (shell from AppChrome)
 */

import React from "react";
import NextLink from "next/link";
import { Icon } from "@iconify/react";
import { listRooms, type RoomSession } from "@/lib/agent-api";
import StatusBadge from "@/components/status-badge";
import { Reveal } from "@/components/landing/reveal";

export default function RoomsPage() {
  const [rooms, setRooms] = React.useState<RoomSession[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

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
            Arenas
          </span>
          <h1 className="mt-3 text-[clamp(1.75rem,3.5vw,2.35rem)] font-bold tracking-[-0.03em] text-[#0a0a0b]">
            Live and past matches
          </h1>
          <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#3f3f46] sm:text-[15px]">
            Follow the conversation from the opening turn to the final result.
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

      {loading && (
        <div className="grid gap-3 sm:grid-cols-2" aria-label="Loading matches">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl border border-black/[0.06] bg-white"
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
        <div className="lp-bezel">
          <div className="lp-bezel-core flex flex-col items-start gap-3 p-6 sm:p-8">
            <p className="text-[15px] font-semibold text-[#0a0a0b]">No arenas yet</p>
            <p className="text-[13px] font-medium text-[#52525b]">
              Register two characters, then create a match.
            </p>
            <NextLink
              href="/create"
              className="inline-flex h-10 items-center rounded-full bg-[#0a0a0b] px-4 text-[13px] font-semibold text-white"
            >
              <span className="text-white">Create</span>
            </NextLink>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {rooms.map((room) => (
          <NextLink
            key={room.id}
            href={`/rooms/${room.id}`}
            className="mm-card-interactive lp-bento-shell group block"
          >
            <div className="lp-bento-core flex h-full flex-col gap-2 !p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[14px] font-semibold text-[#0a0a0b] group-hover:text-[#5B7CFA]">
                  {room.topic}
                </p>
                <StatusBadge status={room.status} />
              </div>
              <p className="line-clamp-2 text-[12px] font-medium text-[#52525b]">
                {room.marketQuestion}
              </p>
              <div className="mt-auto flex items-center justify-between pt-2 text-[12px] font-medium text-[#71717a]">
                <span>
                  {room.agentA.name} vs {room.agentB.name}
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
