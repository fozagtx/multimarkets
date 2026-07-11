"use client";

/**
 * Characters — compact list + form (no oversized cards)
 */

import React from "react";
import NextLink from "next/link";
import { Icon } from "@iconify/react";
import { listAgents, registerAgent, type Character } from "@/lib/agent-api";
import { toastError, toastSuccess } from "@/lib/toast";
import { Reveal } from "@/components/landing/reveal";

/** Display label: primary personality type, then traits, then bio snippet */
function personalityFrom(character: Character): string {
  if (character.personalityType?.trim()) return character.personalityType.trim();
  const firstAdj = character.adjectives?.map((a) => a.trim()).filter(Boolean)[0];
  if (firstAdj) return firstAdj;
  const bio = Array.isArray(character.bio) ? character.bio[0] : character.bio;
  return bio?.slice(0, 80) || "Unset";
}

const fieldClass =
  "w-full rounded-lg border border-black/[0.08] bg-white px-2.5 py-2 text-[13px] font-medium text-[#0a0a0b] outline-none placeholder:text-[#a1a1aa] focus:border-[#5B7CFA]/40";

const labelClass = "text-[11px] font-semibold text-[#52525b]";

export default function AgentsPage() {
  const [agents, setAgents] = React.useState<Character[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [personalityType, setPersonalityType] = React.useState("");
  const [adjectives, setAdjectives] = React.useState("");
  const [topics, setTopics] = React.useState("");
  const [styleChat, setStyleChat] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [justCreated, setJustCreated] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    const list = await listAgents();
    setAgents(list);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await refresh();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load agents");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const onRegister = async () => {
    setError(null);
    if (!name.trim() || !bio.trim()) {
      const msg = "Name and bio are required.";
      setError(msg);
      toastError("Incomplete character", msg);
      return;
    }
    try {
      setSubmitting(true);
      const adjList = adjectives
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const typeLabel = personalityType.trim() || adjList[0] || undefined;
      const created = await registerAgent({
        name: name.trim(),
        bio: bio
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        adjectives: adjList,
        topics: topics
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        style: {
          chat: styleChat
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          all: [],
        },
        personalityType: typeLabel,
      });
      setName("");
      setBio("");
      setPersonalityType("");
      setAdjectives("");
      setTopics("");
      setStyleChat("");
      await refresh();
      setJustCreated(created.name);
      toastSuccess("Character saved", `${created.name} is ready.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to register agent";
      setError(msg);
      toastError("Register failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Reveal className="mb-5 flex items-end justify-between gap-3">
        <div>
          <span className="lp-eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5B7CFA]" />
            Characters
          </span>
          <h1 className="mt-2 text-[1.5rem] font-bold tracking-[-0.03em] text-[#0a0a0b] sm:text-[1.75rem]">
            Build the voices
          </h1>
          <p className="mt-1 text-[13px] font-medium text-[#3f3f46]">
            Add two, then create a match.
          </p>
        </div>
        {agents.length >= 2 && (
          <NextLink
            href="/create"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#0a0a0b] px-3.5 text-[12px] font-semibold text-white hover:bg-[#18181b]"
          >
            <Icon icon="solar:play-bold" width={14} className="text-white" />
            <span className="text-white">Create</span>
          </NextLink>
        )}
      </Reveal>

      {justCreated && (
        <p className="mb-3 text-[12px] font-medium text-emerald-800">
          Saved <strong>{justCreated}</strong>
          {agents.length >= 2 ? " — ready to create a match." : " — add one more."}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal delay={0.03} className="flex flex-col gap-1.5">
          {loading && (
            <p className="text-[13px] font-medium text-[#52525b]">Loading…</p>
          )}
          {error && (
            <p className="rounded-lg bg-[#fef2f2] px-3 py-2 text-[12px] font-medium text-[#b91c1c]">
              {error}
            </p>
          )}
          {!loading && agents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f4f4f5] text-[#a1a1aa]">
                <Icon icon="solar:users-group-rounded-linear" width={28} />
              </span>
              <p className="mt-3 text-[13px] font-semibold text-[#0a0a0b]">No characters yet</p>
              <p className="mt-0.5 text-[12px] font-medium text-[#71717a]">
                Use the form to add the first voice.
              </p>
            </div>
          )}
          {agents.map((agent) => (
            <div
              key={agent.id ?? agent.name}
              className="flex items-center justify-between gap-3 border-b border-black/[0.06] py-2.5 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[#0a0a0b]">{agent.name}</p>
                <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-[#71717a]">
                  {Array.isArray(agent.bio) ? agent.bio[0] : agent.bio}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#f4f4f5] px-2 py-0.5 text-[10px] font-semibold text-[#52525b]">
                {personalityFrom(agent)}
              </span>
            </div>
          ))}
        </Reveal>

        <Reveal delay={0.05}>
          <div className="lp-bezel h-fit">
            <div className="lp-bezel-core flex flex-col gap-3 p-4 sm:p-5">
              <h2 className="text-[15px] font-semibold text-[#0a0a0b]">New character</h2>

              <label className="flex flex-col gap-1">
                <span className={labelClass}>Name</span>
                <input
                  className={fieldClass}
                  placeholder="Character name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className={labelClass}>Bio</span>
                <textarea
                  className={fieldClass}
                  rows={3}
                  placeholder={"Who they are\nHow they speak"}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className={labelClass}>Personality</span>
                <input
                  className={fieldClass}
                  placeholder="bold, skeptical…"
                  value={personalityType}
                  onChange={(e) => setPersonalityType(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className={labelClass}>Traits</span>
                <input
                  className={fieldClass}
                  placeholder="bold, concise"
                  value={adjectives}
                  onChange={(e) => setAdjectives(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className={labelClass}>Topics</span>
                <input
                  className={fieldClass}
                  placeholder="markets, tech, policy"
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className={labelClass}>Chat style</span>
                <textarea
                  className={fieldClass}
                  rows={2}
                  placeholder={"Short punchy sentences"}
                  value={styleChat}
                  onChange={(e) => setStyleChat(e.target.value)}
                />
              </label>

              <button
                type="button"
                disabled={submitting}
                onClick={() => void onRegister()}
                className="mt-1 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#0a0a0b] text-[13px] font-semibold text-white hover:bg-[#18181b] disabled:opacity-50"
              >
                <Icon icon="solar:user-plus-bold" width={16} className="text-white" />
                <span className="text-white">{submitting ? "Saving…" : "Save character"}</span>
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
