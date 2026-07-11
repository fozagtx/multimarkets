"use client";

/**
 * Create arena — compact form, no oversized card shell
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

function defaultDeadline(): string {
  const date = new Date(Date.now() + 15 * 60_000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
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
  const [baseAsset, setBaseAsset] = React.useState("BTC");
  const [quoteAsset, setQuoteAsset] = React.useState("USD");
  const [threshold, setThreshold] = React.useState("100000");
  const [deadline, setDeadline] = React.useState(defaultDeadline);
  const [autoStart, setAutoStart] = React.useState(true);
  const [loadingAgents, setLoadingAgents] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadAgents = React.useCallback(async () => {
    setLoadingAgents(true);
    const list = await listAgents();
    setAgents(list);
    const defaults = pickDefaults(list);
    setAgentAId(defaults.a);
    setAgentBId(defaults.b);
    setError(null);
    setLoadingAgents(false);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadAgents();
      } catch {
        if (!cancelled) {
          setError("We couldn’t load characters right now.");
          setLoadingAgents(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAgents]);

  const agentA = agents.find((a) => a.id === agentAId);
  const agentB = agents.find((a) => a.id === agentBId);

  const onSubmit = async () => {
    setError(null);
    if (!topic.trim() || !marketQuestion.trim() || !threshold.trim()) {
      const msg = "Topic, market question, and price target are required.";
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
    const deadlineAt = new Date(deadline).getTime();
    if (!Number.isFinite(deadlineAt) || deadlineAt < Date.now() + 60_000) {
      const msg = "Choose a market close time at least a minute from now.";
      setError(msg);
      toastError("Choose a later close time", msg);
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
        oracleMarket: {
          baseAsset: baseAsset.trim().toUpperCase(),
          quoteAsset: quoteAsset.trim().toUpperCase(),
          threshold: threshold.trim(),
          deadline: deadlineAt,
        },
      });
      toastSuccess(
        autoStart ? "Debate started" : "Arena ready",
        autoStart
          ? "The match has started. Follow it as each turn arrives."
          : "Start the match when you are ready.",
      );
      router.push(`/rooms/${room.id}`);
    } catch {
      const msg = "We couldn’t create this match. Try again in a moment.";
      setError(msg);
      toastError("Could not create arena", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = {
    label: "text-[12px] font-semibold text-[#0a0a0b]",
    input: "text-[13px] text-[#0a0a0b] placeholder:text-[#a1a1aa]",
    inputWrapper:
      "min-h-10 border border-black/[0.08] bg-white shadow-none data-[hover=true]:bg-white group-data-[focus=true]:border-[#5B7CFA]/40",
    description: "text-[11px] font-medium text-[#71717a]",
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <Reveal className="mb-5 flex items-end justify-between gap-3">
        <div>
          <span className="lp-eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5B7CFA]" />
            Create
          </span>
          <h1 className="mt-2 text-[1.5rem] font-bold tracking-[-0.03em] text-[#0a0a0b] sm:text-[1.75rem]">
            Open a match
          </h1>
          <p className="mt-1 text-[13px] font-medium text-[#3f3f46]">
            Two characters, one yes/no question.
          </p>
        </div>
        <NextLink
          href="/markets"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#0a0a0b] hover:bg-[#fafafa]"
        >
          <Icon icon="solar:arrow-left-linear" width={14} />
          Markets
        </NextLink>
      </Reveal>

      <Reveal delay={0.04}>
        <div className="flex flex-col gap-3.5">
          {!isConnected && (
            <p className="text-[12px] font-medium text-[#71717a]">
              Wallet optional to watch. Connect when you want to trade.
            </p>
          )}

          {loadingAgents ? (
            <div className="space-y-2" aria-label="Loading characters">
              <div className="h-10 animate-pulse rounded-xl bg-black/[0.04]" />
              <div className="h-10 animate-pulse rounded-xl bg-black/[0.04]" />
            </div>
          ) : agents.length < 2 ? (
            <p className="rounded-xl bg-[#fffbeb] px-3 py-2 text-[12px] font-medium text-[#92400e]">
              Need two characters.{" "}
              <NextLink href="/agents" className="font-semibold text-[#0a0a0b] underline">
                Add them
              </NextLink>{" "}
              first.
            </p>
          ) : null}

          <Input
            label="Topic"
            labelPlacement="outside"
            placeholder="AI regulation vs open markets"
            value={topic}
            onValueChange={setTopic}
            variant="bordered"
            size="sm"
            classNames={fieldClass}
          />

          <Textarea
            label="What are people betting on?"
            labelPlacement="outside"
            description="Yes or no only."
            placeholder="Will side A admit regulation slows AI by the end of the match?"
            value={marketQuestion}
            onValueChange={setMarketQuestion}
            variant="bordered"
            minRows={2}
            maxRows={3}
            classNames={fieldClass}
          />

          <div className="grid gap-3 sm:grid-cols-[0.7fr_0.7fr_1fr]">
            <Input
              label="Asset"
              labelPlacement="outside"
              value={baseAsset}
              onValueChange={setBaseAsset}
              variant="bordered"
              size="sm"
              classNames={fieldClass}
            />
            <Input
              label="Currency"
              labelPlacement="outside"
              value={quoteAsset}
              onValueChange={setQuoteAsset}
              variant="bordered"
              size="sm"
              classNames={fieldClass}
            />
            <Input
              type="number"
              label="Price target"
              labelPlacement="outside"
              min="0"
              step="any"
              value={threshold}
              onValueChange={setThreshold}
              variant="bordered"
              size="sm"
              classNames={fieldClass}
            />
          </div>

          <Input
            type="datetime-local"
            label="Market closes"
            labelPlacement="outside"
            description="The final price decides YES or NO."
            value={deadline}
            onValueChange={setDeadline}
            variant="bordered"
            size="sm"
            classNames={fieldClass}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Character A"
              labelPlacement="outside"
              placeholder="Select"
              selectedKeys={agentAId ? new Set([agentAId]) : new Set()}
              onSelectionChange={(keys) => {
                const v = Array.from(keys)[0];
                if (v) setAgentAId(String(v));
              }}
              isDisabled={loadingAgents || agents.length === 0}
              variant="bordered"
              size="sm"
              classNames={{
                label: fieldClass.label,
                trigger: fieldClass.inputWrapper,
                value: "text-[13px] text-[#0a0a0b]",
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
              placeholder="Select"
              selectedKeys={agentBId ? new Set([agentBId]) : new Set()}
              onSelectionChange={(keys) => {
                const v = Array.from(keys)[0];
                if (v) setAgentBId(String(v));
              }}
              isDisabled={loadingAgents || agents.length === 0}
              variant="bordered"
              size="sm"
              classNames={{
                label: fieldClass.label,
                trigger: fieldClass.inputWrapper,
                value: "text-[13px] text-[#0a0a0b]",
              }}
            >
              {agents.map((a) => (
                <SelectItem key={a.id!} textValue={a.name}>
                  {a.name}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <Input
              type="number"
              label="Max turns"
              labelPlacement="outside"
              min={4}
              max={40}
              value={maxTurns}
              onValueChange={setMaxTurns}
              variant="bordered"
              size="sm"
              classNames={fieldClass}
            />
            <div className="flex h-10 items-center gap-2 pb-0.5">
              <Switch isSelected={autoStart} onValueChange={setAutoStart} size="sm" color="success" />
              <span className="whitespace-nowrap text-[12px] font-semibold text-[#0a0a0b]">
                Start now
              </span>
            </div>
          </div>

          {error && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#fef2f2] px-3 py-2 text-[12px] font-medium text-[#b91c1c]">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void loadAgents().catch(() => setError("We couldn’t load characters right now."))}
                className="font-semibold underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          )}

          <button
            type="button"
            disabled={submitting || loadingAgents || agents.length < 2}
            onClick={() => void onSubmit()}
            className="mm-button-primary h-11 w-full px-5 text-[14px] disabled:cursor-not-allowed disabled:opacity-50"
            aria-busy={submitting}
          >
            {submitting ? (
              <span className="text-white">Working…</span>
            ) : (
              <>
                <Icon icon="solar:play-bold" width={16} className="text-white" />
                <span className="text-white">
                  {autoStart ? "Create and start" : "Create arena"}
                </span>
              </>
            )}
          </button>
        </div>
      </Reveal>
    </div>
  );
}
