import { z } from "zod";

/** ElizaOS-compatible message example turn */
export const MessageExampleSchema = z.object({
  user: z.string(),
  content: z.object({
    text: z.string(),
  }),
});

/** ElizaOS-compatible character schema */
export const CharacterSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  username: z.string().optional(),
  system: z.string().optional(),
  bio: z.union([z.string(), z.array(z.string())]),
  lore: z.array(z.string()).default([]),
  messageExamples: z.array(z.array(MessageExampleSchema)).default([]),
  postExamples: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
  adjectives: z.array(z.string()).default([]),
  /**
   * Primary personality label (e.g. "bold", "skeptical").
   * Used in LLM context. Falls back to adjectives[0] if omitted.
   */
  personalityType: z.string().min(1).optional(),
  style: z
    .object({
      all: z.array(z.string()).default([]),
      chat: z.array(z.string()).default([]),
      post: z.array(z.string()).default([]),
    })
    .default({ all: [], chat: [], post: [] }),
  knowledge: z.array(z.string()).default([]),
  plugins: z.array(z.string()).default([]),
  clients: z.array(z.string()).default([]),
  modelProvider: z.string().optional(),
  settings: z
    .object({
      voice: z
        .object({
          model: z.string().optional(),
        })
        .optional(),
      secrets: z.record(z.string()).optional(),
      chains: z.record(z.unknown()).optional(),
    })
    .passthrough()
    .optional(),
  templates: z.record(z.string()).optional(),
});

export type MessageExample = z.infer<typeof MessageExampleSchema>;
export type Character = z.infer<typeof CharacterSchema>;

export type AgentStatus =
  | "idle"
  | "ready"
  | "speaking"
  | "thinking"
  | "down"
  | "restarting"
  | "failed";

export interface Heartbeat {
  agentId: string;
  roomId: string;
  status: AgentStatus;
  timestamp: number;
  latencyMs?: number;
  lastMessageAt?: number;
  error?: string;
}

export interface AgentMessage {
  id: string;
  roomId: string;
  agentId: string;
  agentName: string;
  role: "persona" | "master" | "system";
  content: string;
  turn: number;
  createdAt: number;
}

export type RoomStatus =
  | "created"
  | "ready"
  | "running"
  | "paused"
  | "settling"
  | "ended"
  | "failed";

export interface RoomConfig {
  characterIds: string[];
  topic: string;
  marketQuestion: string;
  maxTurns?: number;
  turnTimeoutMs?: number;
  heartbeatIntervalMs?: number;
  settlementRequired?: boolean;
}

export interface RoomSession {
  id: string;
  status: RoomStatus;
  config: RoomConfig;
  agents: string[];
  messages: AgentMessage[];
  currentTurn: number;
  currentSpeakerId: string | null;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  error?: string;
  settlement?: SettlementPayload;
}

export type VoteOutcome = "YES" | "NO" | "UNCLEAR" | "INVALID";

export interface SettlementVote {
  agentId: string;
  agentName: string;
  outcome: VoteOutcome;
  confidence: number;
  rationale: string;
}

export interface SettlementPayload {
  roomId: string;
  marketQuestion: string;
  outcome: VoteOutcome;
  confidence: number;
  votes: SettlementVote[];
  transcriptHash: string;
  oraclePrice?: {
    pair: string;
    amount: string;
    source: string;
    fetchedAt: number;
  };
  signedAt: number;
  signature: string;
}

export type RoomEventType =
  | "message"
  | "heartbeat"
  | "agent_down"
  | "agent_recovered"
  | "debate_start"
  | "debate_end"
  | "settlement_proposal"
  | "settlement_final"
  | "turn_change"
  | "error"
  | "failover";

export interface RoomEvent<T = unknown> {
  type: RoomEventType;
  roomId: string;
  timestamp: number;
  data: T;
}

export interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: "openrouter" | "xai" | "openai";
  /** Extra headers (OpenRouter HTTP-Referer / X-Title, etc.) */
  headers?: Record<string, string>;
}

export interface FailoverAction {
  type: "retry" | "skip" | "monologue" | "abort" | "swap";
  agentId: string;
  reason: string;
  backupAgentId?: string;
  attempt: number;
}

export interface PersonalityProfile {
  name: string;
  /** Primary type label (explicit personalityType or first adjective) */
  personalityType?: string;
  traits: string[];
  topics: string[];
  summary: string;
  source: "bio" | "adjectives" | "mixed" | "personalityType";
}
