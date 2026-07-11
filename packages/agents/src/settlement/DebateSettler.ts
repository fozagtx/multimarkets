import { createHash, createHmac } from "node:crypto";
import type { PersonaAgent } from "../agents/PersonaAgent.js";
import type { EventBus } from "../room/EventBus.js";
import type {
  AgentMessage,
  SettlementPayload,
  SettlementVote,
  VoteOutcome,
} from "../types.js";

export interface DebateSettlerOptions {
  eventBus?: EventBus;
  /** Optional oracle price fetcher; if provided and fails, settlement throws */
  fetchOraclePrice?: () => Promise<{
    pair: string;
    amount: string;
    source: string;
    fetchedAt: number;
  }>;
  /** HMAC secret for payload signature; defaults to SETTLEMENT_HMAC_SECRET or LLM key material */
  signingSecret?: string;
}

export interface SettleParams {
  roomId: string;
  marketQuestion: string;
  transcript: AgentMessage[];
  master: PersonaAgent;
  personas: PersonaAgent[];
}

/**
 * Master + persona agents vote on the prediction question from the debate
 * transcript and produce a signed settlement payload.
 */
export class DebateSettler {
  private readonly eventBus?: EventBus;
  private readonly fetchOraclePrice?: DebateSettlerOptions["fetchOraclePrice"];
  private readonly signingSecret?: string;

  constructor(options: DebateSettlerOptions = {}) {
    this.eventBus = options.eventBus;
    this.fetchOraclePrice = options.fetchOraclePrice;
    this.signingSecret = options.signingSecret;
  }

  async settle(params: SettleParams): Promise<SettlementPayload> {
    const voters: PersonaAgent[] = [params.master, ...params.personas];
    const votes: SettlementVote[] = [];

    for (const voter of voters) {
      // Skip agents that are hard-down if they cannot vote
      if (voter.getStatus() === "down" || voter.getStatus() === "failed") {
        continue;
      }
      const vote = await voter.voteSettlement({
        marketQuestion: params.marketQuestion,
        transcript: params.transcript,
      });
      votes.push(vote);
    }

    if (votes.length === 0) {
      throw new Error(
        "Settlement failed: no agents available to vote (all down or empty)",
      );
    }

    const aggregated = aggregateVotes(votes);
    const transcriptHash = hashTranscript(params.transcript);

    let oraclePrice: SettlementPayload["oraclePrice"];
    if (this.fetchOraclePrice) {
      oraclePrice = await this.fetchOraclePrice();
    }

    const signedAt = Date.now();
    const payloadBody = {
      roomId: params.roomId,
      marketQuestion: params.marketQuestion,
      outcome: aggregated.outcome,
      confidence: aggregated.confidence,
      votes,
      transcriptHash,
      oraclePrice,
      signedAt,
    };

    this.eventBus?.emitEvent("settlement_proposal", params.roomId, payloadBody);

    const signature = signPayload(
      payloadBody,
      resolveSecret(this.signingSecret),
    );

    return {
      ...payloadBody,
      signature,
    };
  }
}

function aggregateVotes(votes: SettlementVote[]): {
  outcome: VoteOutcome;
  confidence: number;
} {
  const weights: Record<VoteOutcome, number> = {
    YES: 0,
    NO: 0,
    UNCLEAR: 0,
    INVALID: 0,
  };
  let confSum = 0;

  for (const v of votes) {
    weights[v.outcome] += v.confidence;
    confSum += v.confidence;
  }

  let best: VoteOutcome = "UNCLEAR";
  let bestW = -1;
  for (const outcome of Object.keys(weights) as VoteOutcome[]) {
    if (weights[outcome] > bestW) {
      bestW = weights[outcome];
      best = outcome;
    }
  }

  const confidence =
    confSum > 0 ? Math.min(1, bestW / Math.max(confSum, 1)) : 0;

  return { outcome: best, confidence: Number(confidence.toFixed(4)) };
}

function hashTranscript(transcript: AgentMessage[]): string {
  const material = transcript
    .map(
      (m) =>
        `${m.turn}|${m.agentId}|${m.createdAt}|${m.content}`,
    )
    .join("\n");
  return createHash("sha256").update(material, "utf8").digest("hex");
}

function signPayload(body: unknown, secret: string): string {
  const canonical = JSON.stringify(body);
  return createHmac("sha256", secret).update(canonical, "utf8").digest("hex");
}

function resolveSecret(explicit?: string): string {
  if (explicit) return explicit;
  const fromEnv =
    process.env.SETTLEMENT_HMAC_SECRET?.trim() ||
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.XAI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim();
  if (!fromEnv) {
    throw new Error(
      "Cannot sign settlement payload: set SETTLEMENT_HMAC_SECRET (or OPENROUTER_API_KEY / XAI_API_KEY / OPENAI_API_KEY)",
    );
  }
  return fromEnv;
}
