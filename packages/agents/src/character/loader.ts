import { readFile } from "node:fs/promises";
import { resolve, isAbsolute } from "node:path";
import { CharacterSchema, type Character } from "../types.js";

export class CharacterValidationError extends Error {
  constructor(
    message: string,
    public readonly issues?: unknown,
  ) {
    super(message);
    this.name = "CharacterValidationError";
  }
}

export class CharacterLoadError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "CharacterLoadError";
  }
}

/** Validate raw JSON against Eliza-compatible Character schema */
export function validateCharacter(raw: unknown): Character {
  const result = CharacterSchema.safeParse(raw);
  if (!result.success) {
    throw new CharacterValidationError(
      `Invalid character definition: ${result.error.message}`,
      result.error.flatten(),
    );
  }
  const character = result.data;
  if (!character.id) {
    character.id = slugify(character.name);
  }
  // Normalize personality type into the stored character for LLM context
  const type =
    character.personalityType?.trim() ||
    character.adjectives.map((a) => a.trim()).filter(Boolean)[0];
  if (type) {
    character.personalityType = type;
  }
  return character;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Load character JSON from a local filesystem path */
export async function loadCharacterFromDisk(path: string): Promise<Character> {
  const absolute = isAbsolute(path) ? path : resolve(process.cwd(), path);
  try {
    const text = await readFile(absolute, "utf8");
    const raw: unknown = JSON.parse(text);
    return validateCharacter(raw);
  } catch (err) {
    if (err instanceof CharacterValidationError) throw err;
    throw new CharacterLoadError(
      `Failed to load character from disk: ${absolute}`,
      err,
    );
  }
}

/**
 * Load character JSON from HTTP/HTTPS or IPFS gateway URL.
 * IPFS CIDs / ipfs:// URIs are rewritten to a public gateway.
 */
export async function loadCharacterFromUrl(url: string): Promise<Character> {
  const resolved = resolveIpfsUrl(url);
  let response: Response;
  try {
    response = await fetch(resolved, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    throw new CharacterLoadError(
      `Failed to fetch character from URL: ${resolved}`,
      err,
    );
  }

  if (!response.ok) {
    throw new CharacterLoadError(
      `Character URL returned ${response.status} ${response.statusText}: ${resolved}`,
    );
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch (err) {
    throw new CharacterLoadError(
      `Character URL did not return valid JSON: ${resolved}`,
      err,
    );
  }

  return validateCharacter(raw);
}

/** Load from disk path or URL automatically */
export async function loadCharacter(source: string): Promise<Character> {
  if (
    source.startsWith("http://") ||
    source.startsWith("https://") ||
    source.startsWith("ipfs://") ||
    source.startsWith("ipfs/") ||
    /^Qm[1-9A-HJ-NP-Za-km-z]{44}/.test(source) ||
    /^bafy[a-z2-7]+/i.test(source)
  ) {
    return loadCharacterFromUrl(source);
  }
  return loadCharacterFromDisk(source);
}

export function resolveIpfsUrl(url: string): string {
  const gateway =
    process.env.IPFS_GATEWAY?.replace(/\/$/, "") ??
    "https://ipfs.io/ipfs";

  if (url.startsWith("ipfs://")) {
    const path = url.slice("ipfs://".length).replace(/^ipfs\//, "");
    return `${gateway}/${path}`;
  }
  if (url.startsWith("ipfs/")) {
    return `${gateway}/${url.slice("ipfs/".length)}`;
  }
  if (/^Qm[1-9A-HJ-NP-Za-km-z]{44}/.test(url) || /^bafy[a-z2-7]+/i.test(url)) {
    return `${gateway}/${url}`;
  }
  return url;
}
