import { AGENT_API_URL } from "./config";

export type AgentStatus =
  | "idle"
  | "ready"
  | "speaking"
  | "thinking"
  | "down"
  | "restarting"
  | "failed"
  | "online"
  | "degraded"
  | "starting";

export type RoomStatus =
  | "created"
  | "ready"
  | "running"
  | "paused"
  | "settling"
  | "ended"
  | "failed"
  | "live"
  | "debate_ended"
  | "settled";

export type RoomMessage = {
  id: string;
  roomId: string;
  agentId: string;
  agentName: string;
  role: "persona" | "master" | "system";
  content: string;
  turn?: number;
  createdAt: string | number;
};

export type RoomSession = {
  id: string;
  topic: string;
  marketQuestion: string;
  status: RoomStatus;
  agentA: { id: string; name: string; status: AgentStatus };
  agentB: { id: string; name: string; status: AgentStatus };
  master: { id: string; name: string; status: AgentStatus };
  messages: RoomMessage[];
  settlement?: {
    outcome: "YES" | "NO" | "INVALID" | "UNCLEAR";
    rationale: string;
    votes?: Record<string, string>;
  };
  createdAt: string | number;
  currentTurn?: number;
  characterIds?: string[];
  error?: string;
  onChain?: {
    chainId: number;
    marketAddress: string;
    factoryAddress: string;
    createTxHash: string;
    baseAsset: string;
    quoteAsset: string;
    threshold: string;
    deadline: number;
    status: "open" | "closed" | "resolved" | "cancelled" | "failed";
    closeTxHash?: string;
    resolveTxHash?: string;
    resolvedPrice?: string;
    outcome?: "YES" | "NO";
    error?: string;
  };
  raw?: unknown;
};

export type Character = {
  id?: string;
  name: string;
  username?: string;
  bio: string[] | string;
  adjectives?: string[];
  topics?: string[];
  style?: {
    all?: string[];
    chat?: string[];
    post?: string[];
  };
  lore?: string[];
  knowledge?: string[];
  messageExamples?: unknown[];
  system?: string;
  personalityType?: string;
};

/** Human labels for room status chips */
export function roomStatusLabel(status: RoomStatus | string): string {
  switch (status) {
    case "created":
    case "ready":
      return "Ready";
    case "running":
    case "live":
      return "Live";
    case "paused":
      return "Paused";
    case "settling":
      return "Settling";
    case "ended":
    case "debate_ended":
    case "settled":
      return "Settled";
    case "failed":
      return "Failed";
    default:
      return String(status);
  }
}

export function roomStatusColor(
  status: RoomStatus | string,
): "default" | "primary" | "success" | "warning" | "danger" | "secondary" {
  switch (status) {
    case "running":
    case "live":
      return "success";
    case "ready":
    case "created":
      return "primary";
    case "settling":
    case "paused":
      return "warning";
    case "failed":
      return "danger";
    case "ended":
    case "settled":
    case "debate_ended":
      return "secondary";
    default:
      return "default";
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${AGENT_API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Can’t reach Argue right now. Check your connection and try again.",
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let detail = body || res.statusText;
    try {
      const j = JSON.parse(body) as { error?: string };
      if (j.error) detail = j.error;
    } catch {
      /* keep raw */
    }
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

function resolvePersonaPair(room: Record<string, unknown>): {
  agentA: { id: string; name: string };
  agentB: { id: string; name: string };
  characterIds: string[];
} {
  const config = (room.config as Record<string, unknown> | undefined) ?? {};
  const characterNames = (config.characterNames as Record<string, string> | undefined) ?? {};
  const agents = (room.agents as string[] | undefined) ?? [];
  const fromConfig = (config.characterIds as string[] | undefined) ?? [];
  const fromTop = (room.characterIds as string[] | undefined) ?? [];

  // Prefer explicit characterIds (personas only). Never treat master as A/B.
  let characterIds =
    fromConfig.length > 0
      ? fromConfig
      : fromTop.length > 0
        ? fromTop
        : agents.filter((id) => id.toLowerCase() !== "master");

  if (characterIds.length < 2 && agents.length >= 2) {
    characterIds = agents.filter((id) => id.toLowerCase() !== "master");
  }

  const namedA = room.agentA as { id?: string; name?: string } | undefined;
  const namedB = room.agentB as { id?: string; name?: string } | undefined;

  const idA = namedA?.id || characterIds[0] || "";
  const idB = namedB?.id || characterIds[1] || "";
  const nameA = namedA?.name || characterNames[idA] || idA || "Agent A";
  const nameB = namedB?.name || characterNames[idB] || idB || "Agent B";

  return {
    characterIds: characterIds.length ? characterIds : [idA, idB].filter(Boolean),
    agentA: { id: String(idA), name: String(nameA) },
    agentB: { id: String(idB), name: String(nameB) },
  };
}

function statusesForRoom(
  status: RoomStatus,
): { master: AgentStatus; a: AgentStatus; b: AgentStatus } {
  switch (status) {
    case "running":
    case "live":
      return { master: "ready", a: "ready", b: "ready" };
    case "settling":
      return { master: "thinking", a: "thinking", b: "thinking" };
    case "failed":
      return { master: "failed", a: "failed", b: "failed" };
    case "ended":
    case "settled":
    case "debate_ended":
      return { master: "idle", a: "idle", b: "idle" };
    case "ready":
    case "created":
    default:
      return { master: "ready", a: "ready", b: "ready" };
  }
}

function mapSettlement(
  settlementRaw: unknown,
): RoomSession["settlement"] | undefined {
  if (!settlementRaw || typeof settlementRaw !== "object") return undefined;
  const s = settlementRaw as {
    outcome?: string;
    rationale?: string;
    summary?: string;
    votes?: Array<{ agentId: string; outcome: string }> | Record<string, string>;
  };
  const votes: Record<string, string> = {};
  if (Array.isArray(s.votes)) {
    for (const v of s.votes) votes[v.agentId] = v.outcome;
  } else if (s.votes && typeof s.votes === "object") {
    Object.assign(votes, s.votes);
  }
  return {
    outcome: (s.outcome as RoomSession["settlement"] extends infer S
      ? S extends { outcome: infer O }
        ? O
        : never
      : never) ?? "INVALID",
    rationale: s.rationale ?? s.summary ?? "",
    votes,
  };
}

export function mapRoom(payload: Record<string, unknown>): RoomSession {
  const room = (payload.room as Record<string, unknown> | undefined) ?? payload;
  const config = (room.config as Record<string, unknown> | undefined) ?? {};
  const messages = ((payload.messages as RoomMessage[] | undefined) ??
    (room.messages as RoomMessage[] | undefined) ??
    []) as RoomMessage[];

  const status = String(room.status ?? payload.status ?? "created") as RoomStatus;
  const pair = resolvePersonaPair(room);
  const st = statusesForRoom(status);
  const settlement =
    mapSettlement(room.settlement) ?? mapSettlement(payload.settlement);

  return {
    id: String(room.id),
    topic: String((room.topic as string) ?? config.topic ?? ""),
    marketQuestion: String(
      (room.marketQuestion as string) ?? config.marketQuestion ?? "",
    ),
    status,
    agentA: { ...pair.agentA, status: st.a },
    agentB: { ...pair.agentB, status: st.b },
    master: { id: "master", name: "Master", status: st.master },
    messages,
    settlement,
    createdAt: (room.createdAt as number | string) ?? Date.now(),
    currentTurn: (room.currentTurn as number | undefined) ?? 0,
    characterIds: pair.characterIds,
    error: (room.error as string | undefined) ?? undefined,
    onChain: (room.onChain as RoomSession["onChain"]) ?? undefined,
    raw: room,
  };
}

export async function listAgents(): Promise<Character[]> {
  const data = await api<{ agents: Character[] } | Character[]>("/agents");
  const list = Array.isArray(data) ? data : data.agents ?? [];
  // Belt-and-suspenders: never show master in UI selectors
  return list.filter((a) => (a.id ?? "").toLowerCase() !== "master");
}

export async function registerAgent(character: Character): Promise<Character> {
  const data = await api<{ ok: boolean; id: string; name: string } | Character>("/agents", {
    method: "POST",
    body: JSON.stringify(character),
  });
  if ("ok" in data && data.ok) {
    return { ...character, id: data.id, name: data.name };
  }
  return data as Character;
}

export async function deleteAgent(id: string): Promise<void> {
  await api<{ ok: boolean }>(`/agents/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function walletSignIn(address: string, signMessage: (args: { message: string }) => Promise<string>): Promise<void> {
  const challenge = await api<{ nonce: string; message: string }>("/auth/nonce", {
    method: "POST",
    body: JSON.stringify({ address }),
  });
  const signature = await signMessage({ message: challenge.message });
  await api<{ address: string }>("/auth/verify", {
    method: "POST",
    body: JSON.stringify({ address, nonce: challenge.nonce, signature }),
  });
}

export async function getWalletSession(): Promise<string | null> {
  try {
    const result = await api<{ address: string }>("/auth/session");
    return result.address;
  } catch {
    return null;
  }
}

export async function createRoom(input: {
  topic: string;
  marketQuestion: string;
  agentAId: string;
  agentBId: string;
  maxTurns?: number;
  autoStart?: boolean;
  oracleMarket: {
    baseAsset: string;
    quoteAsset: string;
    threshold: string;
    deadline: number;
  };
}): Promise<RoomSession> {
  if (input.agentAId === input.agentBId) {
    throw new Error("Pick two different characters for the match.");
  }
  if (
    input.agentAId.toLowerCase() === "master" ||
    input.agentBId.toLowerCase() === "master"
  ) {
    throw new Error("The referee isn’t a fighter — pick two characters instead.");
  }

  const data = await api<Record<string, unknown>>("/rooms", {
    method: "POST",
    body: JSON.stringify({
      characterIds: [input.agentAId, input.agentBId],
      topic: input.topic,
      marketQuestion: input.marketQuestion,
      maxTurns: input.maxTurns,
      settlementRequired: true,
      oracleMarket: input.oracleMarket,
    }),
  });
  let room = mapRoom(data);

  if (input.autoStart) {
    room = await startRoom(room.id);
  }
  return room;
}

export async function getRoom(id: string): Promise<RoomSession> {
  const data = await api<Record<string, unknown>>(`/rooms/${id}`);
  return mapRoom(data);
}

export async function listRooms(): Promise<RoomSession[]> {
  const data = await api<{ rooms: Record<string, unknown>[] } | Record<string, unknown>[]>(
    "/rooms",
  );
  const rooms = Array.isArray(data) ? data : data.rooms ?? [];
  return rooms.map((r) => mapRoom(r));
}

export async function startRoom(id: string): Promise<RoomSession> {
  const data = await api<Record<string, unknown>>(`/rooms/${id}/start`, { method: "POST" });
  return mapRoom(data);
}

export async function injectHostNote(
  id: string,
  content: string,
): Promise<{ message: RoomMessage; room: RoomSession }> {
  const data = await api<{ message: RoomMessage; room: Record<string, unknown> }>(
    `/rooms/${id}/notes`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
  );
  return {
    message: data.message,
    room: mapRoom({ room: data.room }),
  };
}

export function roomStreamUrl(id: string) {
  return `${AGENT_API_URL}/rooms/${id}/stream`;
}

export function healthCheck() {
  return api<{ ok: boolean; agents?: number; rooms?: number }>("/health");
}
