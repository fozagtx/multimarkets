import type { Heartbeat, AgentStatus } from "../types.js";
import type { PersonaAgent } from "../agents/PersonaAgent.js";
import type { EventBus } from "../room/EventBus.js";

export interface HeartbeatMonitorOptions {
  roomId: string;
  agents: Map<string, PersonaAgent>;
  eventBus: EventBus;
  intervalMs?: number;
  /** Agent considered dead if no heartbeat-eligible activity within this window while expected alive */
  staleMs?: number;
  onAgentDown?: (agentId: string, heartbeat: Heartbeat) => void;
  onAgentRecovered?: (agentId: string, heartbeat: Heartbeat) => void;
}

/**
 * Emit periodic heartbeats for all agents in a room.
 * Detects agents that enter `down` / `failed` state and notifies failover.
 */
export class HeartbeatMonitor {
  private readonly roomId: string;
  private readonly agents: Map<string, PersonaAgent>;
  private readonly eventBus: EventBus;
  private readonly intervalMs: number;
  private readonly staleMs: number;
  private readonly onAgentDown?: HeartbeatMonitorOptions["onAgentDown"];
  private readonly onAgentRecovered?: HeartbeatMonitorOptions["onAgentRecovered"];
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly previousStatus = new Map<string, AgentStatus>();
  private running = false;

  constructor(options: HeartbeatMonitorOptions) {
    this.roomId = options.roomId;
    this.agents = options.agents;
    this.eventBus = options.eventBus;
    this.intervalMs = options.intervalMs ?? 5_000;
    this.staleMs = options.staleMs ?? 45_000;
    this.onAgentDown = options.onAgentDown;
    this.onAgentRecovered = options.onAgentRecovered;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.tick();
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
    // Allow process exit without waiting on heartbeats
    if (this.timer && typeof this.timer === "object" && "unref" in this.timer) {
      this.timer.unref();
    }
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Force a single heartbeat cycle (used by tests / failover paths). */
  async tick(): Promise<Heartbeat[]> {
    const now = Date.now();
    const results: Heartbeat[] = [];

    for (const [agentId, agent] of this.agents) {
      const started = Date.now();
      let status = agent.getStatus();
      const lastMessageAt = agent.getLastMessageAt();
      const error = agent.getLastError();

      // Stale detection while room expects activity
      if (
        (status === "ready" || status === "thinking" || status === "speaking") &&
        lastMessageAt !== undefined &&
        now - lastMessageAt > this.staleMs &&
        status !== "ready"
      ) {
        // long thinking/speaking without completion
        if (status === "thinking" || status === "speaking") {
          agent.markDown(
            `Agent stale: status=${status} for >${this.staleMs}ms without completion`,
          );
          status = "down";
        }
      }

      const heartbeat: Heartbeat = {
        agentId,
        roomId: this.roomId,
        status,
        timestamp: now,
        latencyMs: Date.now() - started,
        lastMessageAt,
        error,
      };

      results.push(heartbeat);
      this.eventBus.emitEvent("heartbeat", this.roomId, heartbeat);

      const prev = this.previousStatus.get(agentId);
      const isDown = status === "down" || status === "failed";
      const wasDown = prev === "down" || prev === "failed";

      if (isDown && !wasDown) {
        this.eventBus.emitEvent("agent_down", this.roomId, heartbeat);
        this.onAgentDown?.(agentId, heartbeat);
      } else if (
        (wasDown || prev === "restarting") &&
        (status === "ready" || status === "idle")
      ) {
        this.eventBus.emitEvent("agent_recovered", this.roomId, heartbeat);
        this.onAgentRecovered?.(agentId, heartbeat);
      }

      this.previousStatus.set(agentId, status);
    }

    return results;
  }
}
