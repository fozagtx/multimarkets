#!/usr/bin/env node
/**
 * Sanity: personality type is resolved and present in system prompt context.
 * Run: node scripts/check-personality.mjs
 */
import { buildSystemPrompt } from "../dist/agents/systemPrompt.js";
import { validateCharacter } from "../dist/character/loader.js";
import {
  extractPersonality,
  resolvePersonalityType,
} from "../dist/character/fetchPersona.js";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("PASS:", msg);
}

const ch = validateCharacter({
  name: "Ava",
  bio: ["Trader who distrusts hype"],
  adjectives: ["skeptical", "sharp"],
  topics: ["markets"],
  personalityType: "skeptical",
  style: { chat: ["Short replies"], all: [] },
});

assert(ch.personalityType === "skeptical", "personalityType stored on character");
assert(resolvePersonalityType(ch) === "skeptical", "resolvePersonalityType");
const profile = extractPersonality(ch);
assert(profile.personalityType === "skeptical", "extractPersonality.personalityType");
assert(profile.summary.includes("skeptical"), "summary includes type");

const prompt = buildSystemPrompt(ch, {
  role: "persona",
  topic: "Open models",
  marketQuestion: "Will open models win?",
  opponentNames: ["Ben"],
});
assert(prompt.includes("## Personality type"), "prompt has Personality type section");
assert(prompt.includes("skeptical"), "prompt includes skeptical");
assert(prompt.includes("Will open models win?"), "prompt includes market question");

const fallback = validateCharacter({
  name: "Ben",
  bio: ["Optimist"],
  adjectives: ["bold", "warm"],
  topics: [],
});
assert(fallback.personalityType === "bold", "fallback personalityType from adjectives[0]");

console.log("\nAll personality checks passed.\n");
