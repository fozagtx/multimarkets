"use client";

/**
 * Arena detail — Soft Structuralism, tight spacing (shell from AppChrome)
 */

import React from "react";
import NextLink from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import {
  getRoom,
  injectHostNote,
  roomStreamUrl,
  startRoom,
  type RoomMessage,
  type RoomSession,
} from "@/lib/agent-api";
import PromptContainerWithConversation from "@/components/ai/prompt-container-with-conversation";
import ArenaControls from "@/components/ai/arena-controls";
import MarketTradePanel from "@/components/market-trade-panel";
import StatusBadge from "@/components/status-badge";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";

export default function RoomDetailPage() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const [room, setRoom] = React.useState<RoomSession | null>(null);
  const [messages, setMessages] = React.useState<RoomMessage[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [starting, setStarting] = React.useState(false);
  const [mode, setMode] = React.useState("live");
  const [controlsOpen, setControlsOpen] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    const data = await getRoom(roomId);
    setRoom(data);
    setMessages(data.messages ?? []);
    if (data.error) setError("This match is unavailable right now.");
    return data;
  }, [roomId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch {
        if (!cancelled) setError("We couldn’t load this match right now.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  React.useEffect(() => {
    if (!roomId) return;
    const es = new EventSource(roomStreamUrl(roomId));

    const pushMessage = (msg: RoomMessage) => {
      if (!msg?.id || !msg?.content) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const onEvent = (ev: MessageEvent) => {
      try {
        const parsed = JSON.parse(ev.data) as { type?: string; data?: unknown };

        if (parsed.type === "message" && parsed.data) {
          pushMessage(parsed.data as RoomMessage);
          return;
        }
        if (parsed.type === "snapshot" && parsed.data) {
          const session = parsed.data as {
            messages?: RoomMessage[];
            status?: string;
            error?: string;
          };
          if (session.messages) setMessages(session.messages);
          if (session.status) {
            setRoom((prev) =>
              prev ? { ...prev, status: session.status as RoomSession["status"] } : prev,
            );
          }
          if (session.error) setError("This match needs attention. Try again in a moment.");
          return;
        }
        if (parsed.type === "debate_start") {
          setRoom((prev) => (prev ? { ...prev, status: "running" } : prev));
          setError(null);
          return;
        }
        if (parsed.type === "turn_change" && parsed.data) {
          const d = parsed.data as { turn?: number; speakerId?: string };
          setRoom((prev) => {
            if (!prev) return prev;
            const next = { ...prev, status: "running" as const, currentTurn: d.turn };
            const sid = d.speakerId;
            next.agentA = {
              ...next.agentA,
              status: sid === next.agentA.id ? "speaking" : "ready",
            };
            next.agentB = {
              ...next.agentB,
              status: sid === next.agentB.id ? "speaking" : "ready",
            };
            next.master = { ...next.master, status: "ready" };
            return next;
          });
          return;
        }
        if (parsed.type === "debate_end") {
          setRoom((prev) => (prev ? { ...prev, status: "settling" } : prev));
          return;
        }
        if (parsed.type === "settlement_final" && parsed.data) {
          const s = parsed.data as {
            outcome?: string;
            rationale?: string;
            summary?: string;
            votes?: Array<{ agentId: string; outcome: string }>;
          };
          const votes: Record<string, string> = {};
          for (const v of s.votes ?? []) votes[v.agentId] = v.outcome;
          const outcome =
            (s.outcome as "YES" | "NO" | "INVALID" | "UNCLEAR") ?? "INVALID";
          setRoom((prev) =>
            prev
              ? {
                  ...prev,
                  status: "ended",
                  settlement: {
                    outcome,
                    rationale: s.rationale ?? s.summary ?? "",
                    votes,
                  },
                  master: { ...prev.master, status: "idle" },
                  agentA: { ...prev.agentA, status: "idle" },
                  agentB: { ...prev.agentB, status: "idle" },
                }
              : prev,
          );
          toastSuccess(`Result: ${outcome}`, s.rationale ?? s.summary);
          return;
        }
        if (parsed.type === "error" && parsed.data) {
          const d = parsed.data as { message?: string };
          if (d.message) {
            setError("This match needs attention. Try again in a moment.");
            toastError("Match paused", "Try again in a moment.");
          }
          setRoom((prev) => (prev ? { ...prev, status: "failed" } : prev));
          return;
        }
        if (parsed.type === "agent_down" && parsed.data) {
          const hb = parsed.data as { agentId?: string };
          setRoom((prev) => {
            if (!prev || !hb.agentId) return prev;
            if (prev.agentA.id === hb.agentId) {
              return { ...prev, agentA: { ...prev.agentA, status: "down" } };
            }
            if (prev.agentB.id === hb.agentId) {
              return { ...prev, agentB: { ...prev.agentB, status: "down" } };
            }
            if (hb.agentId === "master") {
              return { ...prev, master: { ...prev.master, status: "down" } };
            }
            return prev;
          });
        }
      } catch {
        /* ignore */
      }
    };

    for (const name of [
      "message",
      "snapshot",
      "debate_start",
      "debate_end",
      "turn_change",
      "settlement_proposal",
      "settlement_final",
      "agent_down",
      "agent_recovered",
      "heartbeat",
      "failover",
      "error",
    ]) {
      es.addEventListener(name, onEvent);
    }
    es.onmessage = onEvent;
    return () => es.close();
  }, [roomId]);

  const onStart = async () => {
    setError(null);
    try {
      setStarting(true);
      toastInfo("Starting match", "The debate is opening…");
      const next = await startRoom(roomId);
      setRoom(next);
      toastSuccess("Debate live", "You can follow the transcript and trade when ready.");
    } catch {
      const msg = "The match couldn’t start. Try again in a moment.";
      setError(msg);
      setRoom((prev) => (prev ? { ...prev, status: "failed" } : prev));
      toastError("Match couldn’t start", msg);
    } finally {
      setStarting(false);
    }
  };

  const onSubmitNote = async (content: string) => {
    const res = await injectHostNote(roomId, content);
    setMessages((prev) => {
      if (prev.some((m) => m.id === res.message.id)) return prev;
      return [...prev, res.message];
    });
    if (res.room) setRoom(res.room);
  };

  if (error && !room) {
    return (
      <div className="mx-auto w-full max-w-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-4 text-[13px] font-medium text-[#b91c1c]">
          <span>{error}</span>
          <button type="button" onClick={() => void load().catch(() => undefined)} className="font-semibold underline underline-offset-2">
            Try again
          </button>
        </div>
        <NextLink
          href="/rooms"
          className="inline-flex h-10 items-center rounded-full border border-black/[0.08] bg-white px-4 text-[13px] font-semibold text-[#0a0a0b]"
        >
          Back to arenas
        </NextLink>
      </div>
    );
  }

  if (!room) {
    return (
      <p className="text-[14px] font-medium text-[#52525b]">Loading match…</p>
    );
  }

  const canStart = room.status === "created" || room.status === "ready";
  const isLive = room.status === "running" || room.status === "live";
  const isDone =
    room.status === "ended" || room.status === "settled" || room.status === "debate_ended";

  const controls = (
    <ArenaControls room={room} />
  );

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Header */}
      <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="lp-eyebrow">
              <span className="h-1.5 w-1.5 rounded-full bg-[#5B7CFA]" />
              Arena
            </span>
            <StatusBadge status={room.status} />
            {isLive && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d1fae5] px-2.5 py-0.5 text-[11px] font-semibold text-[#065f46]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#059669]" />
                Live
              </span>
            )}
          </div>
          <h1 className="text-[clamp(1.35rem,2.5vw,1.75rem)] font-bold tracking-[-0.03em] text-[#0a0a0b]">
            {room.agentA.name} vs {room.agentB.name}
          </h1>
          <p className="text-[13px] font-medium text-[#52525b]">{room.topic}</p>
          <p className="text-[14px] font-semibold leading-snug text-[#0a0a0b]">
            {room.marketQuestion}
          </p>
          {(room.currentTurn ?? 0) > 0 && (
            <p className="text-[12px] font-medium text-[#71717a]">Turn {room.currentTurn}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <NextLink
            href="/rooms"
            className="mm-button-secondary h-10 px-3.5 text-[12px]"
          >
            Arenas
          </NextLink>
          <NextLink
            href="/markets"
            className="mm-button-secondary h-10 px-3.5 text-[12px]"
          >
            Markets
          </NextLink>
          <button
            type="button"
            className="mm-button-secondary h-10 px-3.5 text-[12px] lg:hidden"
            onClick={() => setControlsOpen((v) => !v)}
            aria-expanded={controlsOpen}
            aria-controls="match-activity"
          >
            Match activity
          </button>
          {canStart && (
            <button
              type="button"
              disabled={starting}
              onClick={() => void onStart()}
              className="mm-button-primary h-10 gap-1.5 px-4 text-[12px] disabled:opacity-50"
              aria-busy={starting}
            >
              <Icon icon="solar:play-bold" width={14} className="text-white" />
              <span className="text-white">{starting ? "Starting…" : "Start debate"}</span>
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[13px] font-medium text-[#b91c1c]">
          <div>
          <p className="font-semibold">Something went wrong</p>
            <p className="mt-0.5">Try again in a moment.</p>
          </div>
          <button type="button" onClick={() => void load().catch(() => undefined)} className="font-semibold underline underline-offset-2">
            Try again
          </button>
        </div>
      )}

      {/* Mobile controls drawer */}
      {controlsOpen && (
        <div id="match-activity" className="mb-4 rounded-2xl border border-black/[0.06] bg-white p-4 lg:hidden">
          {controls}
        </div>
      )}

      {/* 3-column playground — tight gaps */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-4">
        <aside className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-6 rounded-2xl border border-black/[0.06] bg-white p-4">
            {controls}
          </div>
        </aside>

        <section className="lg:col-span-6">
          <PromptContainerWithConversation
            className="max-w-full"
            title={room.topic}
            messages={messages}
            mode={mode}
            onModeChange={setMode}
            onSubmitNote={onSubmitNote}
            onStartDebate={canStart ? () => void onStart() : undefined}
            canStart={canStart && !starting}
            isLive={isLive || canStart}
            bottomRef={bottomRef}
          />

          {room.settlement && (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-[13px] font-semibold text-emerald-800">
                Settled: {room.settlement.outcome}
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-emerald-900/80">
                {room.settlement.rationale}
              </p>
            </div>
          )}

          {isDone && !room.settlement && (
            <div className="mt-3 rounded-2xl border border-black/[0.06] bg-[#f4f4f5] px-4 py-3 text-[12px] font-medium text-[#52525b]">
              Debate ended. Final result is not available yet.
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-3 lg:col-span-3">
          <MarketTradePanel
            question={room.marketQuestion}
            marketAddress={
              room.onChain?.marketAddress?.startsWith("0x")
                ? (room.onChain.marketAddress as `0x${string}`)
                : ""
            }
          />
          <div className="rounded-2xl border border-black/[0.06] bg-white p-4">
            <p className="mb-2 text-[13px] font-semibold text-[#0a0a0b]">How this works</p>
            <ol className="list-decimal space-y-1 pl-4 text-[12px] font-medium leading-relaxed text-[#3f3f46]">
              <li>Characters debate live</li>
              <li>Host notes steer the room</li>
              <li>Trade yes or no</li>
              <li>Settles when the match ends</li>
            </ol>
            <NextLink
              href="/create"
              className="mm-button-secondary mt-3 h-10 w-full text-[12px]"
            >
              Create another
            </NextLink>
          </div>
        </aside>
      </div>
    </div>
  );
}
