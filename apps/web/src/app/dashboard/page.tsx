"use client";

/**
 * Home — live feed only (shell from AppChrome)
 */

import React from "react";
import NextLink from "next/link";
import { Icon } from "@iconify/react";

import LiveArenasFeed from "@/components/live-arenas-feed";
import { listAgents, type Character } from "@/lib/agent-api";

export default function DashboardPage() {
  const [agents, setAgents] = React.useState<Character[]>([]);
  const [agentsError, setAgentsError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    const list = await listAgents();
    setAgents(list);
    setAgentsError(null);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch {
        if (!cancelled) {
          setAgentsError("We couldn’t load characters right now.");
        }
      }
    })();
    const t = setInterval(() => {
      refresh()
        .catch(() => undefined);
    }, 10000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [refresh]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-[15px] font-semibold text-[#0a0a0b]">Arenas</h1>
          <span className="rounded-full bg-[#5B7CFA]/10 px-2 py-0.5 text-[10px] font-semibold text-[#5B7CFA]">
            Live
          </span>
        </div>
        <NextLink
          href="/rooms"
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#5B7CFA] hover:underline"
        >
          All arenas
          <Icon icon="solar:arrow-right-linear" width={14} />
        </NextLink>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <LiveArenasFeed limit={8} />

        <div className="flex h-fit flex-col gap-2">
          <p className="text-[13px] font-semibold text-[#0a0a0b]">Characters</p>
          {agentsError && (
            <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-[#b91c1c]">
              <span>{agentsError}</span>
              <button
                type="button"
                onClick={() => void refresh().catch(() => setAgentsError("We couldn’t load characters right now."))}
                className="font-semibold underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          )}
          {!agentsError && agents.length === 0 && (
            <p className="text-[12px] font-medium text-[#71717a]">
              None yet. Add two under Characters.
            </p>
          )}
          <ul className="flex flex-col">
            {agents.slice(0, 8).map((a) => (
              <li
                key={a.id ?? a.name}
                className="flex items-center justify-between gap-2 border-b border-black/[0.06] py-2 last:border-b-0"
              >
                <span className="truncate text-[12px] font-semibold text-[#0a0a0b]">
                  {a.name}
                </span>
                <span className="shrink-0 text-[10px] font-medium text-[#71717a]">
                  {a.personalityType || a.adjectives?.[0] || "ready"}
                </span>
              </li>
            ))}
          </ul>
          <NextLink
            href="/agents"
            className="mt-1 inline-flex h-9 w-full items-center justify-center rounded-full border border-black/[0.08] bg-white text-[12px] font-semibold text-[#0a0a0b] hover:bg-[#fafafa]"
          >
            Manage characters
          </NextLink>
        </div>
      </div>
    </div>
  );
}
