/** @multimarkets/agents - public API */

export {
  CharacterSchema,
  MessageExampleSchema,
  type Character,
  type MessageExample,
  type AgentStatus,
  type Heartbeat,
  type AgentMessage,
  type RoomStatus,
  type RoomConfig,
  type RoomSession,
  type VoteOutcome,
  type SettlementVote,
  type SettlementPayload,
  type RoomEventType,
  type RoomEvent,
  type LlmConfig,
  type FailoverAction,
  type PersonalityProfile,
} from "./types.js";

export {
  loadCharacter,
  loadCharacterFromDisk,
  loadCharacterFromUrl,
  validateCharacter,
  resolveIpfsUrl,
  CharacterLoadError,
  CharacterValidationError,
} from "./character/loader.js";

export {
  fetchPersona,
  extractPersonality,
} from "./character/fetchPersona.js";

export {
  mapDebateOutcomeToOnChain,
  OUTCOME_YES,
  OUTCOME_NO,
  type DebateOutcome,
  type OnChainResolution,
} from "./settlement/outcomeCodes.js";

export {
  PersonaAgent,
  resolveLlmConfig,
  LlmConfigError,
  LlmGenerationError,
} from "./agents/PersonaAgent.js";

export {
  buildSystemPrompt,
  buildSettlementPrompt,
} from "./agents/systemPrompt.js";

export { MasterAgent } from "./master/MasterAgent.js";
export type { MasterAgentOptions, DebateEndReason } from "./master/MasterAgent.js";

export { HeartbeatMonitor } from "./master/Heartbeat.js";
export type { HeartbeatMonitorOptions } from "./master/Heartbeat.js";

export { FailoverController } from "./master/Failover.js";
export type { FailoverOptions, FailoverContext } from "./master/Failover.js";

export { EventBus } from "./room/EventBus.js";
export { RoomRuntime } from "./room/RoomRuntime.js";
export type { CreateRoomOptions } from "./room/RoomRuntime.js";

export { DebateSettler } from "./settlement/DebateSettler.js";
export type {
  DebateSettlerOptions,
  SettleParams,
} from "./settlement/DebateSettler.js";

export {
  fetchCoinbaseSpotPrice,
  CoinbaseOracleError,
} from "./oracle/coinbaseOracle.js";
export type { CoinbaseSpotPrice } from "./oracle/coinbaseOracle.js";

export {
  fetchHashkeyAproPrice,
  HashkeyOracleError,
} from "./oracle/hashkeyOracle.js";
export type {
  HashkeyOracleConfig,
  HashkeyPrice,
} from "./oracle/hashkeyOracle.js";

export { HspClient, createHspClient, HspClientError } from "./hsp/client.js";
export type {
  HspConfig,
  HspFeeSettlementRequest,
  HspFeeSettlementResponse,
} from "./hsp/client.js";

export { createApp, startServer } from "./server.js";
