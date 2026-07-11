import postgres, { type Sql } from "postgres";

import type {
  AgentMessage,
  Character,
  RoomSession,
  RoomStatus,
  SettlementPayload,
} from "../types.js";

type RoomRow = {
  id: string;
  status: RoomStatus;
  config: unknown;
  agents: unknown;
  current_turn: number;
  current_speaker_id: string | null;
  created_at: string | number;
  started_at: string | number | null;
  ended_at: string | number | null;
  error: string | null;
  settlement: unknown;
};

type CharacterRow = {
  character: unknown;
};

type MessageRow = {
  id: string;
  room_id: string;
  agent_id: string;
  agent_name: string;
  role: AgentMessage["role"];
  content: string;
  turn: number;
  created_at: string | number;
};

function parseJson<T>(value: unknown): T {
  if (typeof value === "string") return JSON.parse(value) as T;
  return value as T;
}

function toNumber(value: string | number | null): number | undefined {
  return value === null ? undefined : Number(value);
}

function toSession(row: RoomRow, messages: AgentMessage[]): RoomSession {
  return {
    id: row.id,
    status: row.status,
    config: parseJson<RoomSession["config"]>(row.config),
    agents: parseJson<string[]>(row.agents),
    messages,
    currentTurn: row.current_turn,
    currentSpeakerId: row.current_speaker_id,
    createdAt: Number(row.created_at),
    startedAt: toNumber(row.started_at),
    endedAt: toNumber(row.ended_at),
    error: row.error ?? undefined,
    settlement: row.settlement
      ? parseJson<SettlementPayload>(row.settlement)
      : undefined,
  };
}

function toMessage(row: MessageRow): AgentMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    agentId: row.agent_id,
    agentName: row.agent_name,
    role: row.role,
    content: row.content,
    turn: row.turn,
    createdAt: Number(row.created_at),
  };
}

export class RuntimeStore {
  private constructor(private readonly sql: Sql) {}

  static connect(databaseUrl = process.env.DATABASE_URL): RuntimeStore {
    if (!databaseUrl?.trim()) {
      throw new Error(
        "DATABASE_URL is required for durable runtime storage. Add the Neon pooled connection string to the agents service.",
      );
    }
    return new RuntimeStore(
      postgres(databaseUrl, {
        max: 5,
        idle_timeout: 20,
        connect_timeout: 15,
        prepare: false,
      }),
    );
  }

  async migrate(): Promise<void> {
    await this.sql`
      CREATE TABLE IF NOT EXISTS runtime_characters (
        id TEXT PRIMARY KEY,
        name_key TEXT NOT NULL UNIQUE,
        character JSONB NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )
    `;
    await this.sql`
      CREATE TABLE IF NOT EXISTS runtime_rooms (
        id UUID PRIMARY KEY,
        status TEXT NOT NULL,
        config JSONB NOT NULL,
        agents JSONB NOT NULL,
        current_turn INTEGER NOT NULL DEFAULT 0,
        current_speaker_id TEXT,
        created_at BIGINT NOT NULL,
        started_at BIGINT,
        ended_at BIGINT,
        error TEXT,
        settlement JSONB,
        updated_at BIGINT NOT NULL
      )
    `;
    await this.sql`
      CREATE TABLE IF NOT EXISTS runtime_messages (
        id UUID PRIMARY KEY,
        room_id UUID NOT NULL REFERENCES runtime_rooms(id) ON DELETE CASCADE,
        agent_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        turn INTEGER NOT NULL,
        created_at BIGINT NOT NULL
      )
    `;
    await this.sql`
      CREATE INDEX IF NOT EXISTS runtime_messages_room_order_idx
      ON runtime_messages (room_id, created_at, id)
    `;
    await this.sql`
      CREATE INDEX IF NOT EXISTS runtime_rooms_created_at_idx
      ON runtime_rooms (created_at DESC)
    `;
  }

  async close(): Promise<void> {
    await this.sql.end({ timeout: 5 });
  }

  async saveCharacter(character: Character): Promise<void> {
    const id = character.id;
    if (!id) throw new Error("Cannot persist a character without an id");
    const now = Date.now();
    await this.sql`
      INSERT INTO runtime_characters (id, name_key, character, created_at, updated_at)
      VALUES (
        ${id},
        ${character.name.toLowerCase()},
        ${JSON.stringify(character)}::jsonb,
        ${now},
        ${now}
      )
      ON CONFLICT (id) DO UPDATE SET
        name_key = EXCLUDED.name_key,
        character = EXCLUDED.character,
        updated_at = EXCLUDED.updated_at
    `;
  }

  async loadCharacters(): Promise<Character[]> {
    const rows = await this.sql<CharacterRow[]>`
      SELECT character FROM runtime_characters ORDER BY created_at ASC
    `;
    return rows.map((row) => parseJson<Character>(row.character));
  }

  async createRoom(session: RoomSession): Promise<void> {
    await this.saveRoom(session);
  }

  async saveRoom(session: RoomSession): Promise<void> {
    await this.sql`
      INSERT INTO runtime_rooms (
        id, status, config, agents, current_turn, current_speaker_id,
        created_at, started_at, ended_at, error, settlement, updated_at
      )
      VALUES (
        ${session.id},
        ${session.status},
        ${JSON.stringify(session.config)}::jsonb,
        ${JSON.stringify(session.agents)}::jsonb,
        ${session.currentTurn},
        ${session.currentSpeakerId},
        ${session.createdAt},
        ${session.startedAt ?? null},
        ${session.endedAt ?? null},
        ${session.error ?? null},
        ${session.settlement ? JSON.stringify(session.settlement) : null}::jsonb,
        ${Date.now()}
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        config = EXCLUDED.config,
        agents = EXCLUDED.agents,
        current_turn = EXCLUDED.current_turn,
        current_speaker_id = EXCLUDED.current_speaker_id,
        started_at = EXCLUDED.started_at,
        ended_at = EXCLUDED.ended_at,
        error = EXCLUDED.error,
        settlement = EXCLUDED.settlement,
        updated_at = EXCLUDED.updated_at
    `;
  }

  async appendMessage(message: AgentMessage): Promise<void> {
    await this.sql`
      INSERT INTO runtime_messages (
        id, room_id, agent_id, agent_name, role, content, turn, created_at
      )
      VALUES (
        ${message.id},
        ${message.roomId},
        ${message.agentId},
        ${message.agentName},
        ${message.role},
        ${message.content},
        ${message.turn},
        ${message.createdAt}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }

  async loadRooms(): Promise<RoomSession[]> {
    const rooms = await this.sql<RoomRow[]>`
      SELECT
        id, status, config, agents, current_turn, current_speaker_id,
        created_at, started_at, ended_at, error, settlement
      FROM runtime_rooms
      ORDER BY created_at DESC
    `;
    if (rooms.length === 0) return [];

    const ids = rooms.map((room) => room.id);
    const messages = await this.sql<MessageRow[]>`
      SELECT id, room_id, agent_id, agent_name, role, content, turn, created_at
      FROM runtime_messages
      WHERE room_id = ANY(${ids}::uuid[])
      ORDER BY created_at ASC, id ASC
    `;
    const messagesByRoom = new Map<string, AgentMessage[]>();
    for (const row of messages) {
      const roomMessages = messagesByRoom.get(row.room_id) ?? [];
      roomMessages.push(toMessage(row));
      messagesByRoom.set(row.room_id, roomMessages);
    }
    return rooms.map((room) => toSession(room, messagesByRoom.get(room.id) ?? []));
  }

  async markRunningRoomsInterrupted(): Promise<number> {
    const now = Date.now();
    const rows = await this.sql<{ id: string }[]>`
      UPDATE runtime_rooms
      SET
        status = 'failed',
        current_speaker_id = NULL,
        ended_at = ${now},
        error = 'The service restarted before this match was completed.',
        updated_at = ${now}
      WHERE status IN ('running', 'settling')
      RETURNING id
    `;
    return rows.length;
  }
}
