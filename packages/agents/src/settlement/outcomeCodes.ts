/**
 * Must match packages/contracts OutcomeCodes / binary PredictionMarket.
 * YES = 0, NO = 1. Non-binary outcomes must not call settle — cancel on-chain instead.
 */

export type DebateOutcome = "YES" | "NO" | "UNCLEAR" | "INVALID";

export const OUTCOME_YES = 0;
export const OUTCOME_NO = 1;

export type OnChainResolution =
  | { action: "settle"; winningOutcome: 0 | 1 }
  | { action: "cancel"; reason: string };

/**
 * Map agent debate settlement to ChatRoom.settle(uint8) or cancelSettlement().
 * UNCLEAR/INVALID must use cancelSettlement, not settle(0|1).
 */
export function mapDebateOutcomeToOnChain(outcome: DebateOutcome): OnChainResolution {
  switch (outcome) {
    case "YES":
      return { action: "settle", winningOutcome: OUTCOME_YES };
    case "NO":
      return { action: "settle", winningOutcome: OUTCOME_NO };
    case "UNCLEAR":
      return { action: "cancel", reason: "Debate outcome unclear" };
    case "INVALID":
      return { action: "cancel", reason: "Debate outcome invalid" };
    default:
      return { action: "cancel", reason: `Unknown outcome: ${String(outcome)}` };
  }
}
