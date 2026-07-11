import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { getAddress, verifyMessage } from "ethers";
import { loadCharacterFromDisk, validateCharacter } from "./character/loader.js";
import { RoomRuntime } from "./room/RoomRuntime.js";
import { RuntimeStore } from "./persistence/RuntimeStore.js";
import { OracleMarketBridge } from "./settlement/OracleMarketBridge.js";
import { CharacterSchema, type Character } from "./types.js";
import { resolveLlmConfig, LlmConfigError } from "./agents/PersonaAgent.js";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CHARACTERS_DIR = resolve(__dirname, "../characters");

/** Load packages/agents/.env into process.env (does not override existing keys). */
export async function loadDotEnv(): Promise<void> {
  const envPath = resolve(__dirname, "../.env");
  if (!existsSync(envPath)) return;
  try {
    const raw = await readFile(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  } catch {
    /* ignore */
  }
}

const characterRegistry = new Map<string, Character>();
let runtime = new RoomRuntime();
let runtimeStore: RuntimeStore | null = null;

type AuthenticatedOwner = { address: string };

function normalizeAddress(value: string): string | null {
  try {
    return getAddress(value).toLowerCase();
  } catch {
    return null;
  }
}

function cookieValue(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const prefix = `${name}=`;
  return (
    header
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length) ?? null
  );
}

function authMessage(address: string, nonce: string): string {
  return `Sign in to Argue\nWallet: ${address}\nNonce: ${nonce}`;
}

const CreateRoomBody = z.object({
  /** Two lockable fighters — master is never in this list */
  characterIds: z.array(z.string().min(1)).min(2).max(8),
  topic: z.string().min(1),
  marketQuestion: z.string().min(1),
  oracleMarket: z.object({
    baseAsset: z.string().regex(/^[A-Za-z0-9]{2,12}$/),
    quoteAsset: z.string().regex(/^[A-Za-z0-9]{2,12}$/),
    threshold: z.string().regex(/^\d+(\.\d{1,8})?$/),
    deadline: z.number().int().positive(),
  }),
  maxTurns: z.number().int().positive().optional(),
  turnTimeoutMs: z.number().int().positive().optional(),
  heartbeatIntervalMs: z.number().int().positive().optional(),
  settlementRequired: z.boolean().optional(),
  masterId: z.string().optional(),
});

function llmReadiness(): {
  configured: boolean;
  provider?: string;
  model?: string;
  error?: string;
} {
  try {
    const cfg = resolveLlmConfig();
    return {
      configured: true,
      provider: cfg.provider,
      model: cfg.model,
    };
  } catch (e) {
    return {
      configured: false,
      error:
        e instanceof LlmConfigError
          ? e.message
          : "LLM not configured",
    };
  }
}

function personaCount(): number {
  const unique = new Map<string, Character>();
  for (const ch of characterRegistry.values()) {
    unique.set(ch.id ?? ch.name, ch);
  }
  return [...unique.values()].filter(
    (ch) => (ch.id ?? "").toLowerCase() !== "master",
  ).length;
}

function masterLoaded(): boolean {
  return characterRegistry.has("master");
}

/**
 * Load only the Master coordinator from disk.
 * Debate personas are registered via POST /agents.
 */
async function loadBundledCharacters(dir: string): Promise<void> {
  const masterPath = resolve(dir, "master.json");
  try {
    const character = await loadCharacterFromDisk(masterPath);
    characterRegistry.set(character.id ?? "master", character);
    characterRegistry.set("master", character);
  } catch (err) {
    console.error(`[agents] failed to load master.json:`, err);
  }
}

function getCharacterOrThrow(id: string): Character {
  const c = characterRegistry.get(id);
  if (!c) {
    throw new Error(
      `Unknown characterId "${id}". Register via POST /agents or place JSON in characters/.`,
    );
  }
  return c;
}

function registerCharacter(character: Character): void {
  const id = character.id;
  if (!id) throw new Error("Character is missing an id");
  characterRegistry.set(id, character);
  characterRegistry.set(character.name.toLowerCase(), character);
}

export function createApp(): Hono {
  const app = new Hono();

  const allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGIN ?? "http://localhost:3000")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

  // Browser UI (Next.js) calls this API cross-origin in dev and production.
  app.use("*", async (c, next) => {
    const origin = c.req.header("Origin");
    if (origin && allowedOrigins.has(origin)) {
      c.header("Access-Control-Allow-Origin", origin);
      c.header("Vary", "Origin");
    }
    c.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    c.header("Access-Control-Allow-Credentials", "true");
    if (c.req.method === "OPTIONS") {
      return c.body(null, 204);
    }
    await next();
  });

  async function requireOwner(c: { req: { header(name: string): string | undefined } }): Promise<AuthenticatedOwner | null> {
    const token = cookieValue(c.req.header("cookie"), "argue_session");
    if (!token || !runtimeStore) return null;
    const address = await runtimeStore.getSessionOwner(token);
    return address ? { address } : null;
  }

  app.post("/auth/nonce", async (c) => {
    const body = await c.req.json().catch(() => null);
    const address =
      body && typeof body === "object" && "address" in body
        ? normalizeAddress(String(body.address))
        : null;
    if (!address || !runtimeStore) return c.json({ error: "A valid wallet address is required." }, 400);
    const nonce = await runtimeStore.createAuthNonce(address);
    return c.json({ nonce, message: authMessage(address, nonce) });
  });

  app.post("/auth/verify", async (c) => {
    const body = await c.req.json().catch(() => null);
    const rawAddress =
      body && typeof body === "object" && "address" in body ? String(body.address) : "";
    const nonce = body && typeof body === "object" && "nonce" in body ? String(body.nonce) : "";
    const signature =
      body && typeof body === "object" && "signature" in body ? String(body.signature) : "";
    const address = normalizeAddress(rawAddress);
    if (!address || !nonce || !signature || !runtimeStore) {
      return c.json({ error: "Invalid sign-in request." }, 400);
    }
    let recovered: string | null = null;
    try {
      recovered = normalizeAddress(verifyMessage(authMessage(address, nonce), signature));
    } catch {
      recovered = null;
    }
    const validNonce =
      recovered === address &&
      (await runtimeStore.consumeAuthNonce(nonce, address));
    if (!validNonce || recovered !== address) {
      return c.json({ error: "Wallet verification failed." }, 401);
    }
    const session = await runtimeStore.createSession(address);
    const cookiePolicy =
      process.env.NODE_ENV === "production"
        ? "; SameSite=None; Secure"
        : "; SameSite=Lax";
    c.header(
      "Set-Cookie",
      `argue_session=${session.token}; Path=/; HttpOnly; Max-Age=604800${cookiePolicy}`,
    );
    return c.json({ address, expiresAt: session.expiresAt });
  });

  app.get("/auth/session", async (c) => {
    const owner = await requireOwner(c);
    return owner ? c.json({ address: owner.address }) : c.json({ address: null }, 401);
  });

  app.get("/health", (c) => {
    const llm = llmReadiness();
    const personas = personaCount();
    const master = masterLoaded();
    // Ready for create/start when master + LLM are present (personas registered by users)
    const ready = master && llm.configured;
    return c.json({
      ok: true,
      ready,
      service: "@multimarkets/agents",
      masterLoaded: master,
      personas,
      agents: characterRegistry.size,
      rooms: runtime.listRooms().length,
      llm: {
        configured: llm.configured,
        provider: llm.provider ?? null,
        model: llm.model ?? null,
        // never leak keys
      },
      timestamp: Date.now(),
    });
  });

  /** Deploy probe: 200 only when master + LLM key are configured */
  app.get("/ready", (c) => {
    const llm = llmReadiness();
    const master = masterLoaded();
    if (master && llm.configured) {
      return c.json({
        ready: true,
        masterLoaded: true,
        llm: { provider: llm.provider, model: llm.model },
      });
    }
    return c.json(
      {
        ready: false,
        masterLoaded: master,
        llm: { configured: llm.configured, error: llm.error ?? null },
        hint: "Set OPENROUTER_API_KEY and ensure characters/master.json loads.",
      },
      503,
    );
  });

  app.get("/agents", async (c) => {
    const owner = await requireOwner(c);
    if (!owner || !runtimeStore) return c.json({ error: "Sign in with your wallet to view characters." }, 401);
    const unique = new Map<string, Character>();
    for (const ch of await runtimeStore.loadCharacters(owner.address)) {
      unique.set(ch.id ?? ch.name, ch);
    }
    // Master is coordinator-only - never offered as a lockable persona
    const personas = [...unique.values()].filter(
      (ch) => (ch.id ?? "").toLowerCase() !== "master",
    );
    return c.json({
      agents: personas.map((ch) => {
        const personalityType =
          ch.personalityType?.trim() ||
          ch.adjectives?.map((a) => a.trim()).filter(Boolean)[0] ||
          undefined;
        return {
          id: ch.id,
          name: ch.name,
          bio: ch.bio,
          adjectives: ch.adjectives,
          topics: ch.topics,
          style: ch.style,
          lore: ch.lore,
          personalityType,
        };
      }),
    });
  });

  app.get("/rooms", (c) => {
    const rooms = runtime.listRooms().map((session) => {
      // Personas come from config.characterIds - session.agents is [master, ...personas]
      const personaIds =
        session.config.characterIds?.length > 0
          ? session.config.characterIds
          : session.agents.filter((id) => id !== "master");
      const resolve = (id: string | undefined) => {
        if (!id) return { id: "", name: "Unknown" };
        const ch = characterRegistry.get(id);
        return { id, name: ch?.name ?? session.config.characterNames?.[id] ?? id };
      };
      const a = resolve(personaIds[0]);
      const b = resolve(personaIds[1]);
      return {
        id: session.id,
        topic: session.config.topic,
        marketQuestion: session.config.marketQuestion,
        status: session.status,
        agentA: a,
        agentB: b,
        master: { name: "Master", id: "master" },
        characterIds: personaIds,
        createdAt: session.createdAt,
        currentTurn: session.currentTurn,
        messageCount: session.messages.length,
        onChain: session.onChain,
        settlement: session.settlement
          ? {
              outcome: session.settlement.outcome,
              rationale:
                session.settlement.votes
                  ?.map((v) => v.rationale)
                  .filter(Boolean)
                  .join(" · ") || `Outcome ${session.settlement.outcome}`,
            }
          : undefined,
      };
    });
    return c.json({ rooms });
  });

  app.post("/agents", async (c) => {
    const owner = await requireOwner(c);
    if (!owner || !runtimeStore) return c.json({ error: "Sign in with your wallet to save characters." }, 401);
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const parsed = CharacterSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Invalid character", issues: parsed.error.flatten() },
        400,
      );
    }
    const character = validateCharacter(parsed.data);
    character.id = randomUUID();
    await runtimeStore.saveCharacter(character, owner.address);
    registerCharacter(character);
    return c.json({ ok: true, id: character.id, name: character.name }, 201);
  });

  app.delete("/agents/:id", async (c) => {
    const owner = await requireOwner(c);
    if (!owner || !runtimeStore) return c.json({ error: "Sign in with your wallet to remove characters." }, 401);
    const deleted = await runtimeStore.deleteCharacter(c.req.param("id"), owner.address);
    if (!deleted) return c.json({ error: "Character not found." }, 404);
    return c.json({ ok: true });
  });

  app.post("/rooms", async (c) => {
    const owner = await requireOwner(c);
    if (!owner || !runtimeStore) return c.json({ error: "Sign in with your wallet to create a match." }, 401);
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const parsed = CreateRoomBody.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Invalid room config", issues: parsed.error.flatten() },
        400,
      );
    }

    try {
      const ids = parsed.data.characterIds.map((id) => id.trim()).filter(Boolean);
      if (ids.length < 2) {
        return c.json(
          { error: "A match needs at least two different characters." },
          400,
        );
      }
      if (new Set(ids.map((id) => id.toLowerCase())).size < 2) {
        return c.json(
          { error: "Pick two different characters for the match." },
          400,
        );
      }
      if (ids.some((id) => id.toLowerCase() === "master")) {
        return c.json(
          { error: "The referee cannot be locked as a fighter." },
          400,
        );
      }
      if (!(await Promise.all(ids.map((id) => runtimeStore!.characterBelongsTo(id, owner.address)))).every(Boolean)) {
        return c.json({ error: "You can only use characters in your library." }, 403);
      }

      const masterId = parsed.data.masterId ?? "master";
      const masterCharacter = getCharacterOrThrow(masterId);
      const personas = ids.map((id) => getCharacterOrThrow(id));

      const session = await runtime.createRoom({
        config: {
          characterIds: ids,
          characterNames: Object.fromEntries(
            personas.map((persona) => [persona.id ?? persona.name, persona.name]),
          ),
          topic: parsed.data.topic,
          marketQuestion: parsed.data.marketQuestion,
          oracleMarket: {
            baseAsset: parsed.data.oracleMarket.baseAsset.toUpperCase(),
            quoteAsset: parsed.data.oracleMarket.quoteAsset.toUpperCase(),
            threshold: parsed.data.oracleMarket.threshold,
            deadline: parsed.data.oracleMarket.deadline,
          },
          maxTurns: parsed.data.maxTurns,
          turnTimeoutMs: parsed.data.turnTimeoutMs,
          heartbeatIntervalMs: parsed.data.heartbeatIntervalMs,
          settlementRequired: parsed.data.settlementRequired,
        },
        characters: personas,
        masterCharacter,
      });
      await runtimeStore.setRoomOwner(session.id, owner.address);
      return c.json({ room: session }, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message }, 400);
    }
  });

  app.get("/rooms/:id", (c) => {
    const session = runtime.getRoom(c.req.param("id"));
    if (!session) return c.json({ error: "Room not found" }, 404);
    return c.json({
      room: session,
      status: session.status,
      messages: session.messages,
    });
  });

  app.post("/rooms/:id/start", async (c) => {
    const owner = await requireOwner(c);
    if (!owner || !runtimeStore || !(await runtimeStore.roomBelongsTo(c.req.param("id"), owner.address))) {
      return c.json({ error: "Only the match creator can start it." }, 403);
    }
    try {
      // Fail fast before async loop if LLM is missing
      const llm = llmReadiness();
      if (!llm.configured) {
        return c.json(
          {
            error:
              "Debate cannot start: no language model key configured. Set OPENROUTER_API_KEY on the agents server.",
            code: "LLM_NOT_CONFIGURED",
          },
          503,
        );
      }
      const session = await runtime.startDebate(c.req.param("id"));
      return c.json({ room: session });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes("not found") ? 404 : 400;
      return c.json({ error: message }, status);
    }
  });

  app.post("/rooms/:id/sync-market", async (c) => {
    const owner = await requireOwner(c);
    if (!owner || !runtimeStore || !(await runtimeStore.roomBelongsTo(c.req.param("id"), owner.address))) {
      return c.json({ error: "Only the match creator can update it." }, 403);
    }
    try {
      await runtime.syncOracleMarkets();
      const session = runtime.getRoom(c.req.param("id"));
      if (!session) return c.json({ error: "Room not found" }, 404);
      return c.json({ room: session });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message }, 502);
    }
  });

  app.post("/rooms/:id/notes", async (c) => {
    const owner = await requireOwner(c);
    if (!owner || !runtimeStore || !(await runtimeStore.roomBelongsTo(c.req.param("id"), owner.address))) {
      return c.json({ error: "Only the match creator can add notes." }, 403);
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const content =
      typeof body === "object" && body && "content" in body
        ? String((body as { content: unknown }).content ?? "")
        : "";
    try {
      const message = await runtime.injectSystemNote(c.req.param("id"), content);
      const session = runtime.getRoom(c.req.param("id"));
      return c.json({ message, room: session }, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes("not found") ? 404 : 400;
      return c.json({ error: message }, status);
    }
  });

  app.get("/rooms/:id/stream", (c) => {
    const roomId = c.req.param("id");
    const session = runtime.getRoom(roomId);
    if (!session) return c.json({ error: "Room not found" }, 404);

    return streamSSE(c, async (stream) => {
      let closed = false;
      const unsub = runtime.eventBus.onRoom(roomId, (event) => {
        if (closed) return;
        void stream
          .writeSSE({
            event: event.type,
            data: JSON.stringify(event),
            id: String(event.timestamp),
          })
          .catch(() => {
            closed = true;
          });
      });

      // snapshot
      await stream.writeSSE({
        event: "snapshot",
        data: JSON.stringify({
          type: "snapshot",
          roomId,
          timestamp: Date.now(),
          data: session,
        }),
      });

      // keep alive until client disconnects or debate ends + grace
      try {
        while (!closed) {
          await stream.writeSSE({
            event: "ping",
            data: JSON.stringify({ t: Date.now() }),
          });
          await stream.sleep(15_000);
          const current = runtime.getRoom(roomId);
          if (
            current &&
            (current.status === "ended" || current.status === "failed")
          ) {
            // one more grace period for settlement events
            await stream.sleep(2_000);
            break;
          }
        }
      } finally {
        closed = true;
        unsub();
      }
    });
  });

  return app;
}

export async function startServer(options?: {
  port?: number;
  charactersDir?: string;
}): Promise<{ port: number; app: Hono }> {
  await loadDotEnv();
  runtimeStore = RuntimeStore.connect();
  await runtimeStore.migrate();
  const interruptedRooms = await runtimeStore.markRunningRoomsInterrupted();
  const charactersDir = options?.charactersDir ?? DEFAULT_CHARACTERS_DIR;
  await loadBundledCharacters(charactersDir);
  for (const character of await runtimeStore.loadCharacters()) {
    registerCharacter(character);
  }
  const oracleMarketBridge = process.env.ORACLE_THRESHOLD_FACTORY_ADDRESS
    ? new OracleMarketBridge()
    : undefined;
  runtime = new RoomRuntime(runtimeStore, undefined, oracleMarketBridge);
  runtime.restoreRooms(await runtimeStore.loadRooms());
  const marketSyncTimer = setInterval(() => {
    void runtime.syncOracleMarkets().catch((error) => {
      console.error("[agents] oracle market sync failed", error);
    });
  }, 30_000);
  marketSyncTimer.unref();

  const app = createApp();
  const port = options?.port ?? Number(process.env.PORT ?? 8787);
  // Railway / containers need 0.0.0.0; local default is fine either way
  const hostname = process.env.HOST?.trim() || "0.0.0.0";

  serve({ fetch: app.fetch, port, hostname }, (info) => {
    console.log(
      `[Argue agents] listening on http://${hostname}:${info.port}`,
    );
    console.log(
      `[Argue agents] characters loaded: ${characterRegistry.size}`,
    );
    if (interruptedRooms > 0) {
      console.warn(
        `[Argue agents] marked ${interruptedRooms} unfinished match(es) as interrupted after restart`,
      );
    }
    try {
      const llm = resolveLlmConfig();
      console.log(
        `[Argue agents] LLM: ${llm.provider} · model ${llm.model}`,
      );
    } catch (e) {
      const msg =
        e instanceof LlmConfigError
          ? e.message
          : "No LLM key configured (set OPENROUTER_API_KEY)";
      console.warn(`[Argue agents] ${msg}`);
    }
  });

  return { port, app };
}

// CLI entry (tsx/node: compare resolved paths)
function isDirectEntry(): boolean {
  if (process.env.AGENTS_AUTOSTART === "1") return true;
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    const thisFile = fileURLToPath(import.meta.url);
    const resolvedEntry = resolve(entry);
    return (
      thisFile === resolvedEntry ||
      thisFile === resolvedEntry + ".ts" ||
      thisFile.endsWith("/server.ts") &&
        (resolvedEntry.endsWith("/server.ts") ||
          resolvedEntry.endsWith("/server.js"))
    );
  } catch {
    return false;
  }
}

if (isDirectEntry()) {
  startServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
