/**
 * Thin HSP payment client stub.
 * Points at env HSP_COORDINATOR_URL for agent fee settlement.
 * Makes real HTTP calls; throws if URL is unset when used.
 */

export class HspClientError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "HspClientError";
  }
}

export interface HspConfig {
  coordinatorUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface HspFeeSettlementRequest {
  roomId: string;
  agentId: string;
  amount: string;
  currency: string;
  memo?: string;
  metadata?: Record<string, unknown>;
}

export interface HspFeeSettlementResponse {
  id: string;
  status: string;
  roomId: string;
  agentId: string;
  amount: string;
  currency: string;
  raw: unknown;
}

export class HspClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;

  constructor(config: HspConfig = {}) {
    const url = (
      config.coordinatorUrl ??
      process.env.HSP_COORDINATOR_URL ??
      ""
    ).trim();
    if (!url) {
      throw new HspClientError(
        "HSP_COORDINATOR_URL is not set. Configure the HSP coordinator before settling agent fees.",
      );
    }
    this.baseUrl = url.replace(/\/$/, "");
    this.apiKey =
      config.apiKey ?? process.env.HSP_API_KEY?.trim() ?? undefined;
    this.timeoutMs = config.timeoutMs ?? 20_000;
  }

  /** POST /v1/settlements - agent fee settlement */
  async settleAgentFee(
    request: HspFeeSettlementRequest,
  ): Promise<HspFeeSettlementResponse> {
    return this.postJson<HspFeeSettlementResponse>("/v1/settlements", request);
  }

  /** GET /health on coordinator */
  async health(): Promise<{ ok: boolean; raw: unknown }> {
    const raw = await this.getJson<unknown>("/health");
    return { ok: true, raw };
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (this.apiKey) {
      h.Authorization = `Bearer ${this.apiKey}`;
    }
    return h;
  }

  private async getJson<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: this.headers(),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new HspClientError(`HSP GET ${path} failed`, err);
    }
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new HspClientError(
        `HSP GET ${path} HTTP ${response.status}: ${body.slice(0, 300)}`,
      );
    }
    return (await response.json()) as T;
  }

  private async postJson<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new HspClientError(`HSP POST ${path} failed`, err);
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new HspClientError(
        `HSP POST ${path} HTTP ${response.status}: ${text.slice(0, 300)}`,
      );
    }
    return (await response.json()) as T;
  }
}

/** Lazy factory - only throws when first used without env */
export function createHspClient(config?: HspConfig): HspClient {
  return new HspClient(config);
}
