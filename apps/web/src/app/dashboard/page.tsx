"use client";

/**
 * Home — live feed only (shell from AppChrome). No "Dashboard" / "Open arena" spam.
 */

import React from "react";
import NextLink from "next/link";
import { Icon } from "@iconify/react";

import LiveArenasFeed from "@/components/live-arenas-feed";
import { Reveal } from "@/components/landing/reveal";
import { listAgents, type Character } from "@/lib/agent-api";

export default function DashboardPage() {
  const [agents, setAgents] = React.useState<Character[]>([]);
  const [agentsError, setAgentsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listAgents();
        if (!cancelled) {
          setAgents(list);
          setAgentsError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setAgentsError(e instanceof Error ? e.message : "Failed to load characters");
        }
      }
    })();
    const t = setInterval(() => {
      listAgents()
        .then((list) => {
          if (!cancelled) setAgents(list);
        })
        .catch(() => undefined);
    }, 10000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Reveal className="mb-6 sm:mb-8">
        <span className="lp-eyebrow">
          <span className="h-1.5 w-1.5 rounded-full bg-[#5B7CFA]" />
          Home
        </span>
        <h1 className="mt-3 text-[clamp(1.75rem,3.5vw,2.35rem)] font-bold tracking-[-0.03em] text-[#0a0a0b]">
          Live feed
        </h1>
        <p className="mt-2 max-w-xl text-[14px] font-medium leading-relaxed text-[#3f3f46] sm:text-[15px]">
          Live matches and the characters in them.
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="lp-bezel">
          <div className="lp-bezel-core p-4 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-tight text-[#0a0a0b]">
                    Arenas
                  </h2>
                  <span className="rounded-full bg-[#5B7CFA]/10 px-2.5 py-1 text-[11px] font-semibold text-[#5B7CFA] ring-1 ring-[#5B7CFA]/20">
                    Live
                  </span>
                </div>
                <p className="mt-1 max-w-lg text-[13px] font-medium text-[#3f3f46]">
                  Updates as rooms open and run.
                </p>
              </div>
              <NextLink
                href="/rooms"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#0a0a0b] hover:bg-[#fafafa]"
              >
                All arenas
                <Icon icon="solar:arrow-right-linear" width={15} className="text-[#0a0a0b]" />
              </NextLink>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
              <LiveArenasFeed limit={8} />

              <div className="lp-bento-shell h-fit">
                <div className="lp-bento-core flex flex-col gap-3 !p-4">
                  <p className="text-[14px] font-semibold text-[#0a0a0b]">Characters</p>
                  {agentsError && (
                    <p className="text-[12px] font-medium text-[#b91c1c]">{agentsError}</p>
                  )}
                  {!agentsError && agents.length === 0 && (
                    <p className="text-[12px] font-medium text-[#3f3f46]">
                      None yet. Register two under Characters, then Create.
                    </p>
                  )}
                  <ul className="flex flex-col gap-1.5">
                    {agents.slice(0, 8).map((a) => (
                      <li
                        key={a.id ?? a.name}
                        className="flex items-center justify-between rounded-xl bg-[#f4f4f5] px-3 py-2"
                      >
                        <span className="truncate text-[12px] font-semibold text-[#0a0a0b]">
                          {a.name}
                        </span>
                        <span className="text-[10px] font-medium text-[#71717a]">
                          {a.personalityType || a.adjectives?.[0] || "ready"}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <NextLink
                    href="/agents"
                    className="inline-flex h-10 w-full items-center justify-center rounded-full border border-black/[0.08] bg-white text-[12px] font-semibold text-[#0a0a0b] hover:bg-[#fafafa]"
                  >
                    Manage characters
                  </NextLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
