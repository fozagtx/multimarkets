import type { FailoverAction, Heartbeat } from "../types.js";
import type { PersonaAgent } from "../agents/PersonaAgent.js";
import type { EventBus } from "../room/EventBus.js";

export interface FailoverOptions {
  roomId: string;
  eventBus: EventBus;
  maxRetries?: number;
  /** Base backoff in ms; doubles each attempt */
  baseBackoffMs?: number;
  /** Max backoff cap */
  maxBackoffMs?: number;
  /**
   * When true and a backup persona is registered, swap to it after max retries.
   * When false, continue as monologue with a system note.
   */
  allowSwap?: boolean;
}

export interface FailoverContext {
  agentId: string;
  agents: Map<string, PersonaAgent>;
  backupAgentIds?: string[];
  heartbeat?: Heartbeat;
  reason: string;
}

/**
 * If agent A fails: pause, retry with exponential backoff,
 * optionally swap to backup persona, or continue monologue with system note.
 */
export class FailoverController {
  private readonly roomId: string;
  private readonly eventBus: EventBus;
  private readonly maxRetries: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly allowSwap: boolean;
  private readonly attempts = new Map<string, number>();

  constructor(options: FailoverOptions) {
    this.roomId = options.roomId;
    this.eventBus = options.eventBus;
    this.maxRetries = options.maxRetries ?? 3;
    this.baseBackoffMs = options.baseBackoffMs ?? 1_000;
    this.maxBackoffMs = options.maxBackoffMs ?? 15_000;
    this.allowSwap = options.allowSwap ?? false;
  }

  getAttempts(agentId: string): number {
    return this.attempts.get(agentId) ?? 0;
  }

  reset(agentId: string): void {
    this.attempts.delete(agentId);
  }

  resetAll(): void {
    this.attempts.clear();
  }

  /**
   * Decide failover action for a failed agent.
   * Does not generate mock speech - only control-plane decisions.
   */
  decide(ctx: FailoverContext): FailoverAction {
    const attempt = (this.attempts.get(ctx.agentId) ?? 0) + 1;
    this.attempts.set(ctx.agentId, attempt);

    if (attempt <= this.maxRetries) {
      const action: FailoverAction = {
        type: "retry",
        agentId: ctx.agentId,
        reason: ctx.reason,
        attempt,
      };
      this.emit(action);
      return action;
    }

    if (this.allowSwap && ctx.backupAgentIds && ctx.backupAgentIds.length > 0) {
      const backup = ctx.backupAgentIds.find(
        (id) => id !== ctx.agentId && ctx.agents.has(id),
      );
      if (backup) {
        const action: FailoverAction = {
          type: "swap",
          agentId: ctx.agentId,
          backupAgentId: backup,
          reason: ctx.reason,
          attempt,
        };
        this.emit(action);
        return action;
      }
    }

    // After retries exhausted: monologue mode for remaining healthy agents
    const healthy = [...ctx.agents.values()].filter(
      (a) => a.id !== ctx.agentId && a.getStatus() !== "down" && a.getStatus() !== "failed",
    );

    if (healthy.length === 0) {
      const action: FailoverAction = {
        type: "abort",
        agentId: ctx.agentId,
        reason: `No healthy agents remaining after failure of ${ctx.agentId}: ${ctx.reason}`,
        attempt,
      };
      this.emit(action);
      return action;
    }

    const action: FailoverAction = {
      type: "monologue",
      agentId: ctx.agentId,
      reason: ctx.reason,
      attempt,
    };
    this.emit(action);
    return action;
  }

  /** Sleep for backoff based on attempt number */
  async waitBackoff(attempt: number): Promise<void> {
    const ms = Math.min(
      this.baseBackoffMs * 2 ** Math.max(0, attempt - 1),
      this.maxBackoffMs,
    );
    await sleep(ms);
  }

  /**
   * Execute retry path: mark restarting, wait backoff, mark ready.
   * Caller is responsible for re-invoking generation.
   */
  async prepareRetry(agent: PersonaAgent, attempt: number): Promise<void> {
    agent.markRestarting();
    await this.waitBackoff(attempt);
    agent.markReady();
  }

  private emit(action: FailoverAction): void {
    this.eventBus.emitEvent("failover", this.roomId, action);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
