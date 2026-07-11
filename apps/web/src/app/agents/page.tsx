"use client";

/**
 * Characters — compact list + form (no oversized cards)
 */

import React from "react";
import NextLink from "next/link";
import { Icon } from "@iconify/react";
import { deleteAgent, listAgents, registerAgent, type Character } from "@/lib/agent-api";
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
  "w-full rounded-lg border border-black/[0.08] bg-white px-2.5 py-2 text-[13px] font-medium text-[#0a0a0b] outline-none placeholder:text-[#a1a1aa] focus:border-[#5B7CFA]/40 focus-visible:ring-2 focus-visible:ring-[#5B7CFA]/40 focus-visible:ring-offset-2";

const labelClass = "text-[11px] font-semibold text-[#52525b]";

const CHARACTER_PRESETS = {
  trump: {
    name: "Donald Trump",
    bio: "A former U.S. president and business figure with a combative, media-savvy public speaking style.",
    personalityType: "combative",
    adjectives: "confident, provocative, competitive",
    topics: "politics, business, media, markets",
    styleChat: "Use short, emphatic statements. Challenge opponents directly. Focus on winning and headlines.",
  },
  ansem: {
    name: "Ansem",
    bio: "The pseudonymous voice behind the Black Bull avatar, known in crypto circles for high-conviction market commentary.",
    personalityType: "high-conviction",
    adjectives: "direct, energetic, market-focused",
    topics: "crypto, memecoins, markets, internet culture",
    styleChat: "Keep it sharp and internet-native. Make a clear market case with conviction and concise reasoning.",
  },
} as const;

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
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const applyPreset = (preset: (typeof CHARACTER_PRESETS)[keyof typeof CHARACTER_PRESETS]) => {
    setName(preset.name);
    setBio(preset.bio);
    setPersonalityType(preset.personalityType);
    setAdjectives(preset.adjectives);
    setTopics(preset.topics);
    setStyleChat(preset.styleChat);
  };

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
      } catch {
        if (!cancelled) setError("We couldn’t load characters right now.");
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
    } catch {
      const msg = "We couldn’t save this character. Try again in a moment.";
      setError(msg);
      toastError("Character not saved", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (agent: Character) => {
    if (!agent.id || !window.confirm(`Remove ${agent.name} from your character library?`)) return;
    try {
      setDeletingId(agent.id);
      await deleteAgent(agent.id);
      await refresh();
      toastSuccess("Character removed", `${agent.name} is no longer available for new matches.`);
    } catch {
      toastError("Character not removed", "Try again in a moment.");
    } finally {
      setDeletingId(null);
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
            <div className="space-y-2" aria-label="Loading characters">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-12 animate-pulse rounded-xl bg-black/[0.04]" />
              ))}
            </div>
          )}
          {error && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#fef2f2] px-3 py-2 text-[12px] font-medium text-[#b91c1c]">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void refresh().then(() => setError(null)).catch(() => undefined)}
                className="font-semibold underline underline-offset-2"
              >
                Try again
              </button>
            </div>
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
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-[#f4f4f5] px-2 py-0.5 text-[10px] font-semibold text-[#52525b]">
                  {personalityFrom(agent)}
                </span>
                <button
                  type="button"
                  onClick={() => void onDelete(agent)}
                  disabled={deletingId === agent.id}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#71717a] transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 disabled:opacity-50"
                  aria-label={`Remove ${agent.name}`}
                >
                  <Icon icon="solar:trash-bin-trash-linear" width={16} />
                </button>
              </div>
            </div>
          ))}
        </Reveal>

        <Reveal delay={0.05}>
          <div className="lp-bezel h-fit">
            <div className="lp-bezel-core flex flex-col gap-3 p-4 sm:p-5">
              <h2 className="text-[15px] font-semibold text-[#0a0a0b]">New character</h2>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset(CHARACTER_PRESETS.trump)}
                  className="rounded-xl border border-black/[0.08] bg-[#fafafa] px-3 py-2 text-left transition-colors hover:border-[#5B7CFA]/35 hover:bg-[#5B7CFA]/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B7CFA]/40"
                >
                  <span className="block text-[12px] font-semibold text-[#0a0a0b]">Donald Trump</span>
                  <span className="mt-0.5 block text-[10px] font-medium text-[#71717a]">Fill preset</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(CHARACTER_PRESETS.ansem)}
                  className="rounded-xl border border-black/[0.08] bg-[#fafafa] px-3 py-2 text-left transition-colors hover:border-[#5B7CFA]/35 hover:bg-[#5B7CFA]/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B7CFA]/40"
                >
                  <span className="block text-[12px] font-semibold text-[#0a0a0b]">Ansem</span>
                  <span className="mt-0.5 block text-[10px] font-medium text-[#71717a]">Fill preset</span>
                </button>
              </div>

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

              <div className="grid gap-3 sm:grid-cols-2">
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
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={() => void onRegister()}
                className="mm-button-primary mt-1 h-10 w-full text-[13px] disabled:opacity-50"
                aria-busy={submitting}
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
