import type { Character } from "../types.js";

function asLines(value: string | string[]): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Build an Eliza-style system prompt from a Character definition.
 * Used by PersonaAgent and MasterAgent for LLM generation.
 */
export function buildSystemPrompt(
  character: Character,
  extras?: {
    role?: "persona" | "master";
    topic?: string;
    marketQuestion?: string;
    opponentNames?: string[];
  },
): string {
  const bio = asLines(character.bio);
  const sections: string[] = [];

  sections.push(
    `You are ${character.name}. You must stay fully in character at all times.`,
  );

  if (character.system) {
    sections.push(character.system);
  }

  if (bio.length > 0) {
    sections.push(`## Bio\n${bio.map((b) => `- ${b}`).join("\n")}`);
  }

  if (character.lore.length > 0) {
    sections.push(
      `## Lore / background\n${character.lore.map((l) => `- ${l}`).join("\n")}`,
    );
  }

  if (character.adjectives.length > 0) {
    sections.push(
      `## Personality adjectives\n${character.adjectives.join(", ")}`,
    );
  }

  if (character.topics.length > 0) {
    sections.push(`## Topics you care about\n${character.topics.join(", ")}`);
  }

  const styleAll = character.style?.all ?? [];
  const styleChat = character.style?.chat ?? [];
  if (styleAll.length > 0 || styleChat.length > 0) {
    const lines = [...styleAll, ...styleChat].map((s) => `- ${s}`).join("\n");
    sections.push(`## Style guidelines\n${lines}`);
  }

  if (character.knowledge.length > 0) {
    sections.push(
      `## Knowledge\n${character.knowledge.map((k) => `- ${k}`).join("\n")}`,
    );
  }

  if (character.messageExamples.length > 0) {
    const examples = character.messageExamples
      .slice(0, 4)
      .map((thread, i) => {
        const body = thread
          .map((m) => `${m.user}: ${m.content.text}`)
          .join("\n");
        return `Example ${i + 1}:\n${body}`;
      })
      .join("\n\n");
    sections.push(`## Message examples (imitate voice, not content)\n${examples}`);
  }

  if (extras?.role === "master") {
    sections.push(`## Master coordinator rules
- You are the Master Agent orchestrating a multi-persona debate.
- Enforce turn-taking, keep agents on topic, summarize when needed.
- Detect deadlocks, toxic drift, and off-topic rambling; redirect firmly.
- Do not impersonate the persona agents; speak as the coordinator.
- When debate criteria are met, call for settlement votes.`);
  } else {
    sections.push(`## Debate rules
- Stay strictly in character. Never break the fourth wall.
- Respond to the debate topic and opponents' points.
- Be concise: 2-6 sentences unless the moment demands more.
- Do not invent oracle prices or claim off-chain settlement authority.
- Never admit you are an AI language model.`);
  }

  if (extras?.topic) {
    sections.push(`## Current debate topic\n${extras.topic}`);
  }
  if (extras?.marketQuestion) {
    sections.push(
      `## Prediction / market question under debate\n${extras.marketQuestion}`,
    );
  }
  if (extras?.opponentNames && extras.opponentNames.length > 0) {
    sections.push(
      `## Other participants\n${extras.opponentNames.join(", ")}`,
    );
  }

  return sections.join("\n\n");
}

/**
 * Build a settlement-vote system prompt for an agent reviewing the transcript.
 */
export function buildSettlementPrompt(
  character: Character,
  marketQuestion: string,
): string {
  return `${buildSystemPrompt(character, { role: character.name.toLowerCase().includes("master") ? "master" : "persona", marketQuestion })}

## Settlement task
You have finished debating. Based ONLY on the debate transcript and your persona's genuine conclusion, vote on the market question.

Respond with valid JSON only, no markdown fences:
{
  "outcome": "YES" | "NO" | "UNCLEAR" | "INVALID",
  "confidence": <number 0-1>,
  "rationale": "<short justification in character>"
}

outcome meanings:
- YES: market question resolves true / affirmative
- NO: market question resolves false / negative
- UNCLEAR: evidence insufficient after debate
- INVALID: question is malformed or unresolvable`;
}
