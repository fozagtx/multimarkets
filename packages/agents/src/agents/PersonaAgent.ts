import { randomUUID } from "node:crypto";
import { buildSettlementPrompt, buildSystemPrompt } from "./systemPrompt.js";
import type {
  AgentMessage,
  AgentStatus,
  Character,
  LlmConfig,
  SettlementVote,
  VoteOutcome,
} from "../types.js";

export class LlmConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmConfigError";
  }
}

export class LlmGenerationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "LlmGenerationError";
  }
}

/**
 * Resolve OpenAI-compatible API config from env.
 * Priority: OPENROUTER_API_KEY → XAI_API_KEY → OPENAI_API_KEY
 * Override with LLM_PROVIDER=openrouter|xai|openai
 */
export function resolveLlmConfig(): LlmConfig {
  const forced = (process.env.LLM_PROVIDER ?? "").trim().toLowerCase();
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const xaiKey = process.env.XAI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  const openrouter = (): LlmConfig => ({
    apiKey: openrouterKey!,
    baseUrl: (
      process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1"
    ).replace(/\/$/, ""),
    model:
      process.env.OPENROUTER_MODEL ??
      process.env.LLM_MODEL ??
      "openai/gpt-4o-mini",
    provider: "openrouter",
    headers: {
      "HTTP-Referer":
        process.env.OPENROUTER_HTTP_REFERER ?? "https://multimarkets.local",
      "X-Title": process.env.OPENROUTER_APP_TITLE ?? "MultiMarkets",
    },
  });

  const xai = (): LlmConfig => ({
    apiKey: xaiKey!,
    baseUrl: (process.env.XAI_BASE_URL ?? "https://api.x.ai/v1").replace(
      /\/$/,
      "",
    ),
    model: process.env.XAI_MODEL ?? process.env.LLM_MODEL ?? "grok-3",
    provider: "xai",
  });

  const openai = (): LlmConfig => ({
    apiKey: openaiKey!,
    baseUrl: (
      process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"
    ).replace(/\/$/, ""),
    model: process.env.OPENAI_MODEL ?? process.env.LLM_MODEL ?? "gpt-4o",
    provider: "openai",
  });

  if (forced === "openrouter") {
    if (!openrouterKey) {
      throw new LlmConfigError(
        "LLM_PROVIDER=openrouter but OPENROUTER_API_KEY is missing.",
      );
    }
    return openrouter();
  }
  if (forced === "xai") {
    if (!xaiKey) {
      throw new LlmConfigError("LLM_PROVIDER=xai but XAI_API_KEY is missing.");
    }
    return xai();
  }
  if (forced === "openai") {
    if (!openaiKey) {
      throw new LlmConfigError(
        "LLM_PROVIDER=openai but OPENAI_API_KEY is missing.",
      );
    }
    return openai();
  }

  if (openrouterKey) return openrouter();
  if (xaiKey) return xai();
  if (openaiKey) return openai();

  throw new LlmConfigError(
    "Missing LLM API key. Set OPENROUTER_API_KEY (preferred), XAI_API_KEY, or OPENAI_API_KEY before generating agent messages.",
  );
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function chatCompletion(
  config: LlmConfig,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const url = `${config.baseUrl}/chat/completions`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        ...(config.headers ?? {}),
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: options?.temperature ?? 0.85,
        max_tokens: options?.maxTokens ?? 600,
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (err) {
    throw new LlmGenerationError(`LLM request failed (${config.provider})`, err);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new LlmGenerationError(
      `LLM API error ${response.status} ${response.statusText}: ${body.slice(0, 500)}`,
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new LlmGenerationError("LLM returned empty content");
  }
  return content;
}

export interface PersonaAgentOptions {
  character: Character;
  roomId: string;
  role?: "persona" | "master";
  llm?: LlmConfig;
}

export class PersonaAgent {
  readonly id: string;
  readonly character: Character;
  readonly roomId: string;
  readonly role: "persona" | "master";
  private llm: LlmConfig | null;
  private status: AgentStatus = "idle";
  private lastMessageAt?: number;
  private lastError?: string;

  constructor(options: PersonaAgentOptions) {
    this.character = options.character;
    this.id = options.character.id ?? options.character.name;
    this.roomId = options.roomId;
    this.role = options.role ?? "persona";
    this.llm = options.llm ?? null;
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  getLastError(): string | undefined {
    return this.lastError;
  }

  getLastMessageAt(): number | undefined {
    return this.lastMessageAt;
  }

  markReady(): void {
    this.status = "ready";
    this.lastError = undefined;
  }

  markDown(error: string): void {
    this.status = "down";
    this.lastError = error;
  }

  markRestarting(): void {
    this.status = "restarting";
  }

  private ensureLlm(): LlmConfig {
    if (this.llm) return this.llm;
    this.llm = resolveLlmConfig();
    return this.llm;
  }

  /**
   * Generate an in-character debate message. Requires a real LLM API key.
   * Throws if the key is missing or the provider fails - no simulated replies.
   */
  async generateMessage(params: {
    topic: string;
    marketQuestion: string;
    transcript: AgentMessage[];
    turn: number;
    opponentNames: string[];
    instruction?: string;
  }): Promise<AgentMessage> {
    this.status = "thinking";
    const config = this.ensureLlm();

    const system = buildSystemPrompt(this.character, {
      role: this.role,
      topic: params.topic,
      marketQuestion: params.marketQuestion,
      opponentNames: params.opponentNames,
    });

    const history: ChatMessage[] = params.transcript.map((m) => ({
      role: m.agentId === this.id ? "assistant" : "user",
      content: `[${m.agentName}]: ${m.content}`,
    }));

    const userCue =
      params.instruction ??
      (this.role === "master"
        ? `Coordinate turn ${params.turn}. Keep the debate on topic: "${params.topic}". Market question: "${params.marketQuestion}". Issue a brief facilitator note or hand the floor.`
        : `It is your turn (turn ${params.turn}) in the debate on: "${params.topic}". Market question: "${params.marketQuestion}". Respond in character to the latest points.`);

    try {
      this.status = "speaking";
      const content = await chatCompletion(config, [
        { role: "system", content: system },
        ...history,
        { role: "user", content: userCue },
      ]);

      const message: AgentMessage = {
        id: randomUUID(),
        roomId: this.roomId,
        agentId: this.id,
        agentName: this.character.name,
        role: this.role,
        content,
        turn: params.turn,
        createdAt: Date.now(),
      };
      this.lastMessageAt = message.createdAt;
      this.status = "ready";
      this.lastError = undefined;
      return message;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.markDown(msg);
      throw err;
    }
  }

  /** Vote on settlement from transcript. Real LLM call only. */
  async voteSettlement(params: {
    marketQuestion: string;
    transcript: AgentMessage[];
  }): Promise<SettlementVote> {
    this.status = "thinking";
    const config = this.ensureLlm();
    const system = buildSettlementPrompt(
      this.character,
      params.marketQuestion,
    );
    const transcriptText = params.transcript
      .map((m) => `[turn ${m.turn}] ${m.agentName}: ${m.content}`)
      .join("\n");

    try {
      const raw = await chatCompletion(
        config,
        [
          { role: "system", content: system },
          {
            role: "user",
            content: `Debate transcript:\n\n${transcriptText}\n\nVote now as JSON.`,
          },
        ],
        { temperature: 0.3, maxTokens: 400 },
      );

      const vote = parseSettlementJson(raw);
      this.status = "ready";
      return {
        agentId: this.id,
        agentName: this.character.name,
        outcome: vote.outcome,
        confidence: vote.confidence,
        rationale: vote.rationale,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.markDown(msg);
      throw err;
    }
  }
}

function parseSettlementJson(raw: string): {
  outcome: VoteOutcome;
  confidence: number;
  rationale: string;
} {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new LlmGenerationError(
        `Settlement vote was not valid JSON: ${raw.slice(0, 200)}`,
      );
    }
    parsed = JSON.parse(match[0]);
  }

  const obj = parsed as Record<string, unknown>;
  const outcome = String(obj.outcome ?? "").toUpperCase();
  const allowed: VoteOutcome[] = ["YES", "NO", "UNCLEAR", "INVALID"];
  if (!allowed.includes(outcome as VoteOutcome)) {
    throw new LlmGenerationError(`Invalid settlement outcome: ${outcome}`);
  }
  const confidence = Number(obj.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new LlmGenerationError(`Invalid settlement confidence: ${obj.confidence}`);
  }
  const rationale = String(obj.rationale ?? "").trim();
  if (!rationale) {
    throw new LlmGenerationError("Settlement rationale missing");
  }
  return {
    outcome: outcome as VoteOutcome,
    confidence,
    rationale,
  };
}
