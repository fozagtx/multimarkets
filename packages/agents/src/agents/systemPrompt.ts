import type { Character } from "../types.js";
import {
  extractPersonality,
  resolvePersonalityType,
} from "../character/fetchPersona.js";

function asLines(value: string | string[]): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Build an Eliza-style system prompt from a Character definition.
 * Personality type is always resolved and injected into LLM context.
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
  const personality = extractPersonality(character);
  const personalityType = resolvePersonalityType(character);
  const sections: string[] = [];

  sections.push(
    `You are ${character.name}. You must stay fully in character at all times.`,
  );

  // Primary personality signal — first-class context for the model
  if (personalityType) {
    sections.push(
      `## Personality type\n${personalityType}\nYou must speak and reason as someone whose core type is "${personalityType}".`,
    );
  }

  if (personality.summary) {
    sections.push(`## Personality profile\n${personality.summary}`);
  }

  if (character.system) {
    sections.push(character.system);
  }

  if (bio.length > 0) {
    sections.push(`## Bio\n${bio.map((b) => `- ${b}`).join("\n")}`);
  }

  if ((character.lore ?? []).length > 0) {
    sections.push(
      `## Lore / background\n${character.lore.map((l) => `- ${l}`).join("\n")}`,
    );
  }

  if (personality.traits.length > 0) {
    sections.push(
      `## Personality traits\n${personality.traits.join(", ")}\nExpress these traits in tone, word choice, and stance.`,
    );
  }

  if (personality.topics.length > 0) {
    sections.push(
      `## Topics you care about\n${personality.topics.join(", ")}`,
    );
  }

  const styleAll = character.style?.all ?? [];
  const styleChat = character.style?.chat ?? [];
  if (styleAll.length > 0 || styleChat.length > 0) {
    const lines = [...styleAll, ...styleChat].map((s) => `- ${s}`).join("\n");
    sections.push(`## Style guidelines\n${lines}`);
  }

  if ((character.knowledge ?? []).length > 0) {
    sections.push(
      `## Knowledge\n${character.knowledge.map((k) => `- ${k}`).join("\n")}`,
    );
  }

  if ((character.messageExamples ?? []).length > 0) {
    const examples = character.messageExamples
      .slice(0, 4)
      .map((thread, i) => {
        const body = thread
          .map((m) => `${m.user}: ${m.content.text}`)
          .join("\n");
        return `Example ${i + 1}:\n${body}`;
      })
      .join("\n\n");
    sections.push(
      `## Message examples (imitate voice, not content)\n${examples}`,
    );
  }

  if (extras?.role === "master") {
    sections.push(`## Referee / coordinator rules
- You coordinate a multi-character debate fairly.
- Enforce turn-taking, keep speakers on topic, summarize when needed.
- Detect deadlocks and off-topic drift; redirect firmly.
- Do not impersonate the fighters; speak as the referee.
- When debate criteria are met, call for settlement votes.`);
  } else {
    sections.push(`## Debate rules
- Stay strictly in character. Never break the fourth wall.
- Respond to the debate topic and opponents' points.
${personalityType ? `- Filter every reply through your personality type: ${personalityType}.` : ""}
- Be concise: 2-6 sentences unless the moment demands more.
- Output plain spoken dialogue only. Never prefix with your name, "Name:", or "[Name]:".
- Do not invent prices or claim off-chain settlement authority.
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
  const role = character.name.toLowerCase().includes("master")
    ? "master"
    : "persona";
  return `${buildSystemPrompt(character, { role, marketQuestion })}

## Settlement task
You have finished debating. Based ONLY on the debate transcript and your genuine conclusion in character, vote on the market question.

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
