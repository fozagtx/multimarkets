import { randomUUID } from "node:crypto";
import { PersonaAgent } from "../agents/PersonaAgent.js";
import { MasterAgent } from "../master/MasterAgent.js";
import { DebateSettler } from "../settlement/DebateSettler.js";
import { withResolvedPersonality } from "../character/fetchPersona.js";
import { EventBus } from "./EventBus.js";
import type {
  AgentMessage,
  Character,
  RoomConfig,
  RoomSession,
  RoomStatus,
} from "../types.js";

export interface CreateRoomOptions {
  config: RoomConfig;
  characters: Character[];
  masterCharacter: Character;
  eventBus?: EventBus;
}

/**
 * Room session lifecycle: create, add agents, run debate loop, stream events.
 */
export class RoomRuntime {
  readonly eventBus: EventBus;
  private readonly rooms = new Map<string, RoomHandle>();

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus ?? new EventBus();
  }

  createRoom(options: CreateRoomOptions): RoomSession {
    const { config, characters, masterCharacter } = options;
    if (characters.length < 2) {
      throw new Error("createRoom requires at least two different characters");
    }
    if (!config.topic?.trim()) {
      throw new Error("createRoom requires a topic");
    }
    if (!config.marketQuestion?.trim()) {
      throw new Error("createRoom requires a marketQuestion");
    }

    const id = randomUUID();
    const personas = characters.map(
      (c) =>
        new PersonaAgent({
          character: withResolvedPersonality(c),
          roomId: id,
          role: "persona",
        }),
    );

    const master = new MasterAgent({
      character: withResolvedPersonality(masterCharacter),
      roomId: id,
      eventBus: this.eventBus,
      maxTurns: config.maxTurns ?? 8,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 5_000,
    });
    master.registerPersonas(personas);

    const session: RoomSession = {
      id,
      status: "ready",
      config: {
        ...config,
        maxTurns: config.maxTurns ?? 8,
        turnTimeoutMs: config.turnTimeoutMs ?? 90_000,
        heartbeatIntervalMs: config.heartbeatIntervalMs ?? 5_000,
        settlementRequired: config.settlementRequired ?? true,
      },
      agents: [
        master.getMasterAgent().id,
        ...personas.map((p) => p.id),
      ],
      messages: [],
      currentTurn: 0,
      currentSpeakerId: null,
      createdAt: Date.now(),
    };

    const handle: RoomHandle = {
      session,
      master,
      personas,
      runPromise: null,
      abort: false,
    };
    this.rooms.set(id, handle);
    return cloneSession(session);
  }

  getRoom(id: string): RoomSession | null {
    const handle = this.rooms.get(id);
    return handle ? cloneSession(handle.session) : null;
  }

  listRooms(): RoomSession[] {
    return [...this.rooms.values()].map((h) => cloneSession(h.session));
  }

  /** Start the debate loop asynchronously. Returns immediately. */
  startDebate(roomId: string): RoomSession {
    const handle = this.rooms.get(roomId);
    if (!handle) throw new Error(`Room not found: ${roomId}`);
    if (handle.session.status === "running") {
      return cloneSession(handle.session);
    }
    if (handle.session.status === "ended" || handle.session.status === "failed") {
      throw new Error(`Room ${roomId} already finished with status=${handle.session.status}`);
    }

    handle.abort = false;
    handle.session.status = "running";
    handle.session.startedAt = Date.now();
    this.eventBus.emitEvent("debate_start", roomId, {
      topic: handle.session.config.topic,
      marketQuestion: handle.session.config.marketQuestion,
      agents: handle.session.agents,
    });

    handle.master.startHeartbeat();
    handle.runPromise = this.runLoop(handle).catch((err) => {
      handle.session.status = "failed";
      handle.session.error = err instanceof Error ? err.message : String(err);
      handle.session.endedAt = Date.now();
      this.eventBus.emitEvent("error", roomId, {
        message: handle.session.error,
      });
      handle.master.dispose();
    });

    return cloneSession(handle.session);
  }

  /** Wait for an in-flight debate to finish */
  async waitForDebate(roomId: string): Promise<RoomSession> {
    const handle = this.rooms.get(roomId);
    if (!handle) throw new Error(`Room not found: ${roomId}`);
    if (handle.runPromise) await handle.runPromise;
    return cloneSession(handle.session);
  }

  stopDebate(roomId: string): RoomSession {
    const handle = this.rooms.get(roomId);
    if (!handle) throw new Error(`Room not found: ${roomId}`);
    handle.abort = true;
    return cloneSession(handle.session);
  }

  /** Host / spectator injects a system note into the live transcript (real message, not mock persona speech). */
  injectSystemNote(roomId: string, content: string): AgentMessage {
    const handle = this.rooms.get(roomId);
    if (!handle) throw new Error(`Room not found: ${roomId}`);
    const text = content.trim();
    if (!text) throw new Error("System note content is required");
    if (text.length > 2000) throw new Error("System note max length is 2000 characters");

    const message: AgentMessage = {
      id: randomUUID(),
      roomId,
      agentId: "host",
      agentName: "Host",
      role: "system",
      content: text,
      turn: handle.session.currentTurn,
      createdAt: Date.now(),
    };
    this.pushMessage(handle, message);
    return message;
  }

  private async runLoop(handle: RoomHandle): Promise<void> {
    const { session, master } = handle;
    const { topic, marketQuestion } = session.config;
    const maxTurns = session.config.maxTurns ?? 8;

    try {
      while (!handle.abort) {
        const end = master.shouldEndDebate(session);
        if (end && end.reason !== "settlement_ready") {
          await this.finishDebate(handle, end.detail);
          return;
        }
        if (end?.reason === "settlement_ready" && session.currentTurn >= 2) {
          await this.finishDebate(handle, end.detail);
          return;
        }
        if (session.currentTurn >= maxTurns) {
          await this.finishDebate(handle, `Reached max turns (${maxTurns})`);
          return;
        }

        const speakerId = master.nextSpeakerId();
        if (!speakerId) {
          await this.finishDebate(handle, "No speakers available");
          return;
        }

        session.currentTurn += 1;
        session.currentSpeakerId = speakerId;
        this.eventBus.emitEvent("turn_change", session.id, {
          turn: session.currentTurn,
          speakerId,
        });

        const { message, failover } = await master.runPersonaTurn({
          speakerId,
          topic,
          marketQuestion,
          transcript: session.messages,
          turn: session.currentTurn,
        });

        if (failover?.type === "abort") {
          await this.finishDebate(
            handle,
            failover.reason,
            "failed",
          );
          return;
        }

        if (message) {
          this.pushMessage(handle, message);
        }

        // Topic enforcement may inject a master note
        const redirect = await master.maybeEnforceTopic({
          topic,
          marketQuestion,
          transcript: session.messages,
          turn: session.currentTurn,
        });
        if (redirect) {
          this.pushMessage(handle, redirect);
        }
      }

      await this.finishDebate(handle, "Stopped externally", "ended");
    } finally {
      master.stopHeartbeat();
    }
  }

  private pushMessage(handle: RoomHandle, message: AgentMessage): void {
    handle.session.messages.push(message);
    this.eventBus.emitEvent("message", handle.session.id, message);
  }

  private async finishDebate(
    handle: RoomHandle,
    detail: string,
    status: RoomStatus = "ended",
  ): Promise<void> {
    const { session, master, personas } = handle;

    this.eventBus.emitEvent("debate_end", session.id, {
      detail,
      turns: session.currentTurn,
      messageCount: session.messages.length,
    });

    if (
      session.config.settlementRequired !== false &&
      session.messages.length > 0 &&
      status !== "failed"
    ) {
      session.status = "settling";
      try {
        const settler = new DebateSettler({ eventBus: this.eventBus });
        const settlement = await settler.settle({
          roomId: session.id,
          marketQuestion: session.config.marketQuestion,
          transcript: session.messages,
          master: master.getMasterAgent(),
          personas,
        });
        session.settlement = settlement;
        this.eventBus.emitEvent("settlement_final", session.id, settlement);
      } catch (err) {
        session.error =
          err instanceof Error
            ? `Settlement failed: ${err.message}`
            : `Settlement failed: ${String(err)}`;
        this.eventBus.emitEvent("error", session.id, {
          message: session.error,
        });
        // Debate still ends; settlement error is recorded
      }
    }

    session.status = status === "failed" ? "failed" : "ended";
    session.endedAt = Date.now();
    session.currentSpeakerId = null;
    master.dispose();
  }
}

interface RoomHandle {
  session: RoomSession;
  master: MasterAgent;
  personas: PersonaAgent[];
  runPromise: Promise<void> | null;
  abort: boolean;
}

function cloneSession(session: RoomSession): RoomSession {
  return {
    ...session,
    config: { ...session.config },
    agents: [...session.agents],
    messages: session.messages.map((m) => ({ ...m })),
    settlement: session.settlement
      ? {
          ...session.settlement,
          votes: session.settlement.votes.map((v) => ({ ...v })),
          oraclePrice: session.settlement.oraclePrice
            ? { ...session.settlement.oraclePrice }
            : undefined,
        }
      : undefined,
  };
}
