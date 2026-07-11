import { PersonaAgent } from "../agents/PersonaAgent.js";
import { FailoverController } from "./Failover.js";
import { HeartbeatMonitor } from "./Heartbeat.js";
import type { EventBus } from "../room/EventBus.js";
import type {
  AgentMessage,
  Character,
  FailoverAction,
  RoomSession,
} from "../types.js";

export interface MasterAgentOptions {
  character: Character;
  roomId: string;
  eventBus: EventBus;
  maxTurns?: number;
  heartbeatIntervalMs?: number;
  /** End debate early if last N messages show both sides repeating without new points */
  stagnationWindow?: number;
}

export interface DebateEndReason {
  reason:
    | "max_turns"
    | "master_decision"
    | "abort_no_agents"
    | "settlement_ready"
    | "external_stop";
  detail: string;
}

/**
 * Master Agent orchestrator:
 * - coordinates 2+ persona agents
 * - turn-taking
 * - topic enforcement
 * - debate end criteria
 * - works with DebateSettler for vote aggregation
 */
export class MasterAgent {
  readonly agent: PersonaAgent;
  readonly roomId: string;
  private readonly eventBus: EventBus;
  private readonly maxTurns: number;
  private readonly stagnationWindow: number;
  private personas = new Map<string, PersonaAgent>();
  private turnOrder: string[] = [];
  private turnIndex = 0;
  private failover: FailoverController;
  private heartbeat: HeartbeatMonitor | null = null;
  private monologueMode = false;
  private disabledAgents = new Set<string>();
  private heartbeatIntervalMs: number;

  constructor(options: MasterAgentOptions) {
    this.roomId = options.roomId;
    this.eventBus = options.eventBus;
    this.maxTurns = options.maxTurns ?? 8;
    this.stagnationWindow = options.stagnationWindow ?? 4;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 5_000;

    this.agent = new PersonaAgent({
      character: options.character,
      roomId: options.roomId,
      role: "master",
    });
    this.agent.markReady();

    this.failover = new FailoverController({
      roomId: options.roomId,
      eventBus: options.eventBus,
      maxRetries: 3,
      allowSwap: false,
    });
  }

  getMasterAgent(): PersonaAgent {
    return this.agent;
  }

  registerPersonas(personas: PersonaAgent[]): void {
    this.personas.clear();
    this.turnOrder = [];
    for (const p of personas) {
      this.personas.set(p.id, p);
      p.markReady();
      this.turnOrder.push(p.id);
    }
    this.turnIndex = 0;
  }

  getPersonas(): Map<string, PersonaAgent> {
    return this.personas;
  }

  getActiveTurnOrder(): string[] {
    return this.turnOrder.filter((id) => !this.disabledAgents.has(id));
  }

  startHeartbeat(): void {
    const agents = new Map<string, PersonaAgent>();
    agents.set(this.agent.id, this.agent);
    for (const [id, p] of this.personas) agents.set(id, p);

    this.heartbeat?.stop();
    this.heartbeat = new HeartbeatMonitor({
      roomId: this.roomId,
      agents,
      eventBus: this.eventBus,
      intervalMs: this.heartbeatIntervalMs,
      onAgentDown: (agentId) => {
        if (agentId === this.agent.id) return;
        // Failover decisions happen inline during generateTurn
        void agentId;
      },
    });
    this.heartbeat.start();
  }

  stopHeartbeat(): void {
    this.heartbeat?.stop();
    this.heartbeat = null;
  }

  /** Select next speaker according to turn order, skipping disabled agents */
  nextSpeakerId(): string | null {
    const active = this.getActiveTurnOrder();
    if (active.length === 0) return null;
    if (this.monologueMode && active.length === 1) return active[0]!;

    // Advance until we land on an active speaker
    for (let i = 0; i < this.turnOrder.length; i++) {
      const id = this.turnOrder[this.turnIndex % this.turnOrder.length]!;
      this.turnIndex = (this.turnIndex + 1) % this.turnOrder.length;
      if (!this.disabledAgents.has(id) && this.personas.has(id)) {
        return id;
      }
    }
    return active[0] ?? null;
  }

  /**
   * Evaluate whether the debate should end.
   */
  shouldEndDebate(session: RoomSession): DebateEndReason | null {
    if (session.currentTurn >= this.maxTurns) {
      return {
        reason: "max_turns",
        detail: `Reached max turns (${this.maxTurns})`,
      };
    }

    const active = this.getActiveTurnOrder();
    if (active.length === 0) {
      return {
        reason: "abort_no_agents",
        detail: "No healthy persona agents remaining",
      };
    }

    if (this.isStagnant(session.messages)) {
      return {
        reason: "settlement_ready",
        detail: "Debate appears stagnant; proceeding to settlement",
      };
    }

    return null;
  }

  private isStagnant(messages: AgentMessage[]): boolean {
    const personaMsgs = messages.filter((m) => m.role === "persona");
    if (personaMsgs.length < this.stagnationWindow) return false;
    const window = personaMsgs.slice(-this.stagnationWindow);
    // Heuristic: very short repeated-ish messages
    const normalized = window.map((m) =>
      m.content.toLowerCase().replace(/\s+/g, " ").slice(0, 80),
    );
    const unique = new Set(normalized);
    return unique.size <= Math.max(1, Math.floor(this.stagnationWindow / 2));
  }

  /**
   * Topic enforcement: master issues a redirect if recent messages drift.
   * Uses a real LLM call for the redirect note.
   */
  async maybeEnforceTopic(params: {
    topic: string;
    marketQuestion: string;
    transcript: AgentMessage[];
    turn: number;
  }): Promise<AgentMessage | null> {
    if (params.transcript.length < 2) return null;

    const last = params.transcript[params.transcript.length - 1]!;
    const topicTokens = params.topic
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 3);
    const text = last.content.toLowerCase();
    const hits = topicTokens.filter((t) => text.includes(t)).length;
    const offTopic = topicTokens.length > 0 && hits === 0 && last.content.length > 40;

    if (!offTopic) return null;

    const opponents = [...this.personas.values()].map((p) => p.character.name);
    return this.agent.generateMessage({
      topic: params.topic,
      marketQuestion: params.marketQuestion,
      transcript: params.transcript,
      turn: params.turn,
      opponentNames: opponents,
      instruction: `The last speaker drifted off topic. Issue a brief coordinator redirect back to: "${params.topic}" and the market question: "${params.marketQuestion}". Do not debate as a persona.`,
    });
  }

  /**
   * Run one persona turn with failover (retry / monologue / abort).
   */
  async runPersonaTurn(params: {
    speakerId: string;
    topic: string;
    marketQuestion: string;
    transcript: AgentMessage[];
    turn: number;
  }): Promise<{ message: AgentMessage | null; failover?: FailoverAction }> {
    const speaker = this.personas.get(params.speakerId);
    if (!speaker) {
      return {
        message: null,
        failover: {
          type: "skip",
          agentId: params.speakerId,
          reason: "Speaker not registered",
          attempt: 0,
        },
      };
    }

    const opponentNames = [...this.personas.values()]
      .filter((p) => p.id !== speaker.id)
      .map((p) => p.character.name);

    let lastError = "unknown";
    for (;;) {
      try {
        const message = await speaker.generateMessage({
          topic: params.topic,
          marketQuestion: params.marketQuestion,
          transcript: params.transcript,
          turn: params.turn,
          opponentNames,
        });
        this.failover.reset(speaker.id);
        return { message };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        const action = this.failover.decide({
          agentId: speaker.id,
          agents: this.personas,
          reason: lastError,
        });

        if (action.type === "retry") {
          await this.failover.prepareRetry(speaker, action.attempt);
          continue;
        }

        if (action.type === "monologue") {
          this.disabledAgents.add(speaker.id);
          this.monologueMode = true;
          const note = await this.systemNote(
            params,
            `Agent ${speaker.character.name} failed after retries (${lastError}). Continuing in monologue mode with remaining agents.`,
          );
          return { message: note, failover: action };
        }

        if (action.type === "swap" && action.backupAgentId) {
          this.disabledAgents.add(speaker.id);
          return this.runPersonaTurn({
            ...params,
            speakerId: action.backupAgentId,
          });
        }

        if (action.type === "abort") {
          this.disabledAgents.add(speaker.id);
          return { message: null, failover: action };
        }

        if (action.type === "skip") {
          this.disabledAgents.add(speaker.id);
          return { message: null, failover: action };
        }

        return { message: null, failover: action };
      }
    }
  }

  private async systemNote(
    params: {
      topic: string;
      marketQuestion: string;
      transcript: AgentMessage[];
      turn: number;
    },
    text: string,
  ): Promise<AgentMessage> {
    // Prefer master LLM note; if master also fails, emit deterministic system message.
    try {
      return await this.agent.generateMessage({
        topic: params.topic,
        marketQuestion: params.marketQuestion,
        transcript: params.transcript,
        turn: params.turn,
        opponentNames: [...this.personas.values()].map((p) => p.character.name),
        instruction: `Emit a short system/coordinator notice: ${text}`,
      });
    } catch {
      return {
        id: cryptoRandomId(),
        roomId: this.roomId,
        agentId: "system",
        agentName: "system",
        role: "system",
        content: text,
        turn: params.turn,
        createdAt: Date.now(),
      };
    }
  }

  isMonologueMode(): boolean {
    return this.monologueMode;
  }

  dispose(): void {
    this.stopHeartbeat();
    this.failover.resetAll();
  }
}

function cryptoRandomId(): string {
  return `sys_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
