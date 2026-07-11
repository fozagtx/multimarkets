import {
  loadCharacter,
  loadCharacterFromDisk,
  loadCharacterFromUrl,
  validateCharacter,
} from "./loader.js";
import type { Character, PersonalityProfile } from "../types.js";

export interface FetchPersonaOptions {
  /** Local path, HTTP(S) URL, or IPFS CID / ipfs:// URI */
  source: string;
}

/**
 * Fetch a persona definition from IPFS/HTTP/disk and extract a
 * lightweight personality profile from bio + adjectives + personalityType.
 */
export async function fetchPersona(
  options: FetchPersonaOptions,
): Promise<{ character: Character; personality: PersonalityProfile }> {
  const character = await loadCharacter(options.source);
  const personality = extractPersonality(character);
  return { character, personality };
}

/**
 * Resolve the primary personality type label for a character.
 * Priority: explicit personalityType → first adjective → undefined
 */
export function resolvePersonalityType(character: Character): string | undefined {
  const explicit = character.personalityType?.trim();
  if (explicit) return explicit;
  const adj = (character.adjectives ?? [])
    .map((a) => a.trim())
    .filter(Boolean);
  return adj[0];
}

/**
 * Build a structured personality profile used in LLM context and APIs.
 */
export function extractPersonality(character: Character): PersonalityProfile {
  const bioLines = Array.isArray(character.bio)
    ? character.bio.map((s) => s.trim()).filter(Boolean)
    : character.bio
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean);

  const traits = [
    ...new Set(
      (character.adjectives ?? []).map((a) => a.trim()).filter(Boolean),
    ),
  ];
  const topics = [
    ...new Set((character.topics ?? []).map((t) => t.trim()).filter(Boolean)),
  ];

  const personalityType = resolvePersonalityType(character);
  const bioSummary = bioLines.slice(0, 3).join(" ");
  const traitSummary =
    traits.length > 0 ? `Traits: ${traits.join(", ")}.` : "";
  const typeSummary = personalityType
    ? `Personality type: ${personalityType}.`
    : "";

  let source: PersonalityProfile["source"] = "mixed";
  if (character.personalityType?.trim()) source = "personalityType";
  else if (traits.length > 0 && bioLines.length === 0) source = "adjectives";
  else if (traits.length === 0 && bioLines.length > 0) source = "bio";

  return {
    name: character.name,
    personalityType,
    traits,
    topics,
    summary: [typeSummary, bioSummary, traitSummary]
      .filter(Boolean)
      .join(" ")
      .trim(),
    source,
  };
}

/**
 * Ensure character carries a concrete personalityType when possible
 * (mutate-safe: returns a new object).
 */
export function withResolvedPersonality(character: Character): Character {
  const personalityType = resolvePersonalityType(character);
  if (!personalityType || character.personalityType === personalityType) {
    return character;
  }
  return { ...character, personalityType };
}

export {
  loadCharacter,
  loadCharacterFromDisk,
  loadCharacterFromUrl,
  validateCharacter,
};
