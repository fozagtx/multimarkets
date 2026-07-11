"use client";

/**
 * Create arena — same Soft Structuralism DNA as dashboard (shell from AppChrome)
 */

import React from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { Input, Select, SelectItem, Switch, Textarea } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAccount } from "wagmi";
import { createRoom, listAgents, type Character } from "@/lib/agent-api";
import { toastError, toastSuccess, toastInfo } from "@/lib/toast";
import { Reveal } from "@/components/landing/reveal";

/** Preselect first two registered characters when available. */
function pickDefaults(list: Character[]): { a: string; b: string } {
  const ids = list.map((c) => c.id).filter(Boolean) as string[];
  return { a: ids[0] ?? "", b: ids[1] ?? "" };
}

export default function CreatePage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [agents, setAgents] = React.useState<Character[]>([]);
  const [topic, setTopic] = React.useState("");
  const [marketQuestion, setMarketQuestion] = React.useState("");
  const [agentAId, setAgentAId] = React.useState("");
  const [agentBId, setAgentBId] = React.useState("");
  const [maxTurns, setMaxTurns] = React.useState("8");
  const [autoStart, setAutoStart] = React.useState(true);
  const [loadingAgents, setLoadingAgents] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingAgents(true);
        const list = await listAgents();
        if (!cancelled) {
          setAgents(list);
          const d = pickDefaults(list);
          setAgentAId(d.a);
          setAgentBId(d.b);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load agents");
        }
      } finally {
        if (!cancelled) setLoadingAgents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const agentA = agents.find((a) => a.id === agentAId);
  const agentB = agents.find((a) => a.id === agentBId);

  const onSubmit = async () => {
    setError(null);
    if (!topic.trim() || !marketQuestion.trim()) {
      const msg = "Topic and market question are required.";
      setError(msg);
      toastError("Missing fields", msg);
      return;
    }
    if (!agentAId || !agentBId || agentAId === agentBId) {
      const msg = "Select two different characters.";
      setError(msg);
      toastError("Pick two characters", msg);
      return;
    }
    if (agents.length < 2) {
      const msg = "You need two characters first. Add them under Characters.";
      setError(msg);
      toastError("Need two characters", msg);
      return;
    }
    try {
      setSubmitting(true);
      toastInfo(
        autoStart ? "Opening arena…" : "Creating arena…",
        `${agentA?.name ?? "A"} vs ${agentB?.name ?? "B"}`,
      );
      const room = await createRoom({
        topic: topic.trim(),
        marketQuestion: marketQuestion.trim(),
        agentAId,
        agentBId,
        maxTurns: Number(maxTurns) || 8,
        autoStart,
      });
      toastSuccess(
        autoStart ? "Debate started" : "Arena ready",
        autoStart
          ? "Master is running turns. Streaming live."
          : "Press Start when you are ready.",
      );
      router.push(`/rooms/${room.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create room";
      setError(msg);
      toastError("Could not create arena", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = {
    label: "text-[13px] font-semibold text-[#0a0a0b]",
    input: "text-[#0a0a0b] placeholder:text-[#a1a1aa]",
    inputWrapper:
      "border border-black/[0.08] bg-white shadow-none data-[hover=true]:bg-white group-data-[focus=true]:border-[#5B7CFA]/40",
    description: "text-[12px] font-medium text-[#71717a]",
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Reveal className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <span className="lp-eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5B7CFA]" />
            Create
          </span>
          <h1 className="mt-3 text-[clamp(1.75rem,3.5vw,2.35rem)] font-bold tracking-[-0.03em] text-[#0a0a0b]">
            Open a match
          </h1>
          <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#3f3f46] sm:text-[15px]">
            {autoStart
              ? "Pick two characters and a yes/no question. The debate starts when you create."
              : "Pick two characters and a yes/no question. Start when you are ready."}
          </p>
        </div>
        <NextLink
          href="/markets"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#0a0a0b] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#fafafa] active:scale-[0.98]"
        >
          <Icon icon="solar:arrow-left-linear" width={15} className="text-[#0a0a0b]" />
          Markets
        </NextLink>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="lp-bezel">
          <div className="lp-bezel-core p-4 sm:p-6 md:p-7">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-[#0a0a0b]">Match setup</h2>
              <span className="rounded-full bg-[#5B7CFA]/10 px-2.5 py-1 text-[11px] font-semibold text-[#5B7CFA] ring-1 ring-[#5B7CFA]/20">
                New arena
              </span>
            </div>

            <div className="flex flex-col gap-5">
              {!isConnected && (
                <div className="rounded-2xl border border-black/[0.06] bg-[#f4f4f5] px-4 py-3 text-[13px] font-medium text-[#3f3f46]">
                  You can open a match without a wallet. Connect from the sidebar when you want to
                  trade.
                </div>
              )}

              {loadingAgents ? (
                <p className="text-[14px] font-medium text-[#52525b]">Loading characters…</p>
              ) : agents.length < 2 ? (
                <div className="rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-[13px] font-medium text-[#92400e]">
                  You need two characters.{" "}
                  <NextLink href="/agents" className="font-semibold text-[#0a0a0b] underline">
                    Add characters
                  </NextLink>{" "}
                  first, then come back.
                </div>
              ) : null}

              <Input
                label="Topic"
                labelPlacement="outside"
                placeholder="AI regulation vs open markets"
                value={topic}
                onValueChange={setTopic}
                variant="bordered"
                classNames={fieldClass}
              />

              <Textarea
                label="What are people betting on?"
                labelPlacement="outside"
                description="Keep it yes or no. Clear questions get better markets."
                placeholder="Will side A admit regulation slows AI by the end of the match?"
                value={marketQuestion}
                onValueChange={setMarketQuestion}
                variant="bordered"
                minRows={3}
                classNames={fieldClass}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Character A"
                  labelPlacement="outside"
                  placeholder="Select character"
                  selectedKeys={agentAId ? new Set([agentAId]) : new Set()}
                  onSelectionChange={(keys) => {
                    const v = Array.from(keys)[0];
                    if (v) setAgentAId(String(v));
                  }}
                  isDisabled={loadingAgents || agents.length === 0}
                  variant="bordered"
                  classNames={{
                    label: fieldClass.label,
                    trigger: fieldClass.inputWrapper,
                    value: "text-[#0a0a0b]",
                  }}
                >
                  {agents.map((a) => (
                    <SelectItem key={a.id!} textValue={a.name}>
                      {a.name}
                    </SelectItem>
                  ))}
                </Select>
                <Select
                  label="Character B"
                  labelPlacement="outside"
                  placeholder="Select character"
                  selectedKeys={agentBId ? new Set([agentBId]) : new Set()}
                  onSelectionChange={(keys) => {
                    const v = Array.from(keys)[0];
                    if (v) setAgentBId(String(v));
                  }}
                  isDisabled={loadingAgents || agents.length === 0}
                  variant="bordered"
                  classNames={{
                    label: fieldClass.label,
                    trigger: fieldClass.inputWrapper,
                    value: "text-[#0a0a0b]",
                  }}
                >
                  {agents.map((a) => (
                    <SelectItem key={a.id!} textValue={a.name}>
                      {a.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              {(agentA || agentB) && (
                <div className="rounded-2xl bg-[#f4f4f5] px-4 py-3 text-[13px] font-medium text-[#3f3f46]">
                  <span className="font-semibold text-[#0a0a0b]">
                    {agentA?.name ?? "?"} vs {agentB?.name ?? "?"}
                  </span>
                  <span> · ready to open</span>
                </div>
              )}

              <Input
                type="number"
                label="Max turns"
                labelPlacement="outside"
                min={4}
                max={40}
                value={maxTurns}
                onValueChange={setMaxTurns}
                variant="bordered"
                classNames={fieldClass}
              />

              <div className="flex items-center justify-between rounded-2xl border border-black/[0.06] bg-[#f4f4f5] px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-[#0a0a0b]">
                    Start as soon as I create
                  </p>
                  <p className="text-[12px] font-medium text-[#52525b]">
                    The match begins the moment the room opens
                  </p>
                </div>
                <Switch isSelected={autoStart} onValueChange={setAutoStart} color="success" />
              </div>

              {error && (
                <p className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[13px] font-medium text-[#b91c1c]">
                  {error}
                </p>
              )}

              <button
                type="button"
                disabled={submitting || loadingAgents || agents.length < 2}
                onClick={() => void onSubmit()}
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0a0a0b] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#18181b] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <span className="text-white">Working…</span>
                ) : (
                  <>
                    <Icon icon="solar:play-bold" width={18} className="text-white" />
                    <span className="text-white">
                      {autoStart ? "Create and start" : "Create arena"}
                    </span>
                  </>
                )}
              </button>

              <p className="text-[12px] font-medium leading-relaxed text-[#71717a]">
                Characters take turns live. If something goes wrong, you’ll see a clear error.
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
