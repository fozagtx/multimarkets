"use client";

/**
 * Characters — Soft Structuralism DNA (shell from AppChrome)
 */

import React from "react";
import NextLink from "next/link";
import { Icon } from "@iconify/react";
import { listAgents, registerAgent, type Character } from "@/lib/agent-api";
import { toastError, toastSuccess } from "@/lib/toast";
import { Reveal } from "@/components/landing/reveal";

function personalityFrom(character: Character): string {
  if (character.personalityType) return character.personalityType;
  const adj = character.adjectives?.slice(0, 3).join(", ");
  if (adj) return adj;
  const bio = Array.isArray(character.bio) ? character.bio[0] : character.bio;
  return bio?.slice(0, 80) || "Undefined";
}

const fieldClass =
  "w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 text-[13px] font-medium text-[#0a0a0b] outline-none placeholder:text-[#a1a1aa] focus:border-[#5B7CFA]/40";

export default function AgentsPage() {
  const [agents, setAgents] = React.useState<Character[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState("");
  const [bio, setBio] = React.useState("");
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
      const created = await registerAgent({
        name: name.trim(),
        bio: bio
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        adjectives: adjectives
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
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
        personalityType: adjectives.split(",")[0]?.trim() || undefined,
      });
      setName("");
      setBio("");
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
    <div className="mx-auto w-full max-w-6xl">
      <Reveal className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <span className="lp-eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5B7CFA]" />
            Characters
          </span>
          <h1 className="mt-3 text-[clamp(1.75rem,3.5vw,2.35rem)] font-bold tracking-[-0.03em] text-[#0a0a0b]">
            Build the voices
          </h1>
          <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#3f3f46] sm:text-[15px]">
            Add two characters, then create a match. The referee stays separate.
          </p>
        </div>
        {agents.length >= 2 && (
          <NextLink
            href="/create"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#0a0a0b] px-4 text-[13px] font-semibold text-white hover:bg-[#18181b]"
          >
            <Icon icon="solar:play-bold" width={16} className="text-white" />
            <span className="text-white">Create</span>
          </NextLink>
        )}
      </Reveal>

      {justCreated && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-900">
          <span>
            Saved <strong>{justCreated}</strong>
            {agents.length >= 2
              ? ". You can create a match now."
              : ". Add one more character to start."}
          </span>
          {agents.length >= 2 && (
            <NextLink
              href="/create"
              className="inline-flex h-8 items-center rounded-full bg-[#0a0a0b] px-3 text-[12px] font-semibold text-white"
            >
              <span className="text-white">Create</span>
            </NextLink>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-3">
          {loading && (
            <p className="text-[14px] font-medium text-[#52525b]">Loading characters…</p>
          )}
          {error && (
            <div className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[13px] font-medium text-[#b91c1c]">
              {error}
            </div>
          )}
          {!loading && agents.length === 0 && (
            <div className="lp-bento-shell">
              <div className="lp-bento-core !p-6 text-center">
                <p className="text-[14px] font-semibold text-[#0a0a0b]">No characters yet</p>
                <p className="mt-1 text-[13px] font-medium text-[#52525b]">
                  Use the form to add the first voice.
                </p>
              </div>
            </div>
          )}
          {agents.map((agent) => (
            <article key={agent.id ?? agent.name} className="lp-bento-shell">
              <div className="lp-bento-core !p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-[#0a0a0b]">{agent.name}</p>
                    <p className="mt-1 line-clamp-2 text-[12px] font-medium text-[#52525b]">
                      {Array.isArray(agent.bio) ? agent.bio[0] : agent.bio}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#f4f4f5] px-2.5 py-0.5 text-[11px] font-semibold text-[#3f3f46]">
                    {personalityFrom(agent)}
                  </span>
                </div>
                {(agent.topics ?? []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(agent.topics ?? []).slice(0, 6).map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-[#f4f4f5] px-2 py-0.5 text-[10px] font-semibold text-[#52525b]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="lp-bezel h-fit">
          <div className="lp-bezel-core flex flex-col gap-4 p-4 sm:p-5">
            <h2 className="text-[15px] font-semibold text-[#0a0a0b]">New character</h2>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#52525b]">
                Name
              </span>
              <input
                className={fieldClass}
                placeholder="Character name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#52525b]">
                Bio (one line per bullet)
              </span>
              <textarea
                className={fieldClass}
                rows={4}
                placeholder={"Who they are\nHow they speak\nWhat they care about"}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#52525b]">
                Adjectives (comma-separated)
              </span>
              <input
                className={fieldClass}
                placeholder="bold, concise, skeptical"
                value={adjectives}
                onChange={(e) => setAdjectives(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#52525b]">
                Topics (comma-separated)
              </span>
              <input
                className={fieldClass}
                placeholder="markets, tech, policy"
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#52525b]">
                Chat style (one per line)
              </span>
              <textarea
                className={fieldClass}
                rows={3}
                placeholder={"Short punchy sentences\nRepeats key phrases"}
                value={styleChat}
                onChange={(e) => setStyleChat(e.target.value)}
              />
            </label>

            <button
              type="button"
              disabled={submitting}
              onClick={() => void onRegister()}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0a0a0b] text-[14px] font-semibold text-white hover:bg-[#18181b] disabled:opacity-50"
            >
              <Icon icon="solar:user-plus-bold" width={18} className="text-white" />
              <span className="text-white">{submitting ? "Saving…" : "Save character"}</span>
            </button>
            <p className="text-[12px] font-medium text-[#71717a]">
              Name and bio shape how they speak in the match.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
