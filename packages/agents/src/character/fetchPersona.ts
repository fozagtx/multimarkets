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
 * lightweight personality profile from bio + adjectives.
 */
export async function fetchPersona(
  options: FetchPersonaOptions,
): Promise<{ character: Character; personality: PersonalityProfile }> {
  const character = await loadCharacter(options.source);
  const personality = extractPersonality(character);
  return { character, personality };
}

export function extractPersonality(character: Character): PersonalityProfile {
  const bioLines = Array.isArray(character.bio)
    ? character.bio
    : character.bio
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean);

  const traits = [...new Set(character.adjectives.map((a) => a.trim()).filter(Boolean))];
  const topics = [...new Set(character.topics.map((t) => t.trim()).filter(Boolean))];

  const bioSummary = bioLines.slice(0, 3).join(" ");
  const traitSummary =
    traits.length > 0 ? `Personality traits: ${traits.join(", ")}.` : "";

  let source: PersonalityProfile["source"] = "mixed";
  if (traits.length > 0 && bioLines.length === 0) source = "adjectives";
  else if (traits.length === 0 && bioLines.length > 0) source = "bio";

  return {
    name: character.name,
    traits,
    topics,
    summary: [bioSummary, traitSummary].filter(Boolean).join(" ").trim(),
    source,
  };
}

export {
  loadCharacter,
  loadCharacterFromDisk,
  loadCharacterFromUrl,
  validateCharacter,
};
