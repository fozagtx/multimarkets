# @multimarkets/agents

MultiMarkets multi-agent runtime: **ElizaOS-compatible character schema** + a **custom Master Agent orchestrator**.

## Decision

We use **ElizaOS character JSON** (`name`, `bio`, `lore`, `style`, `adjectives`, `topics`, `messageExamples`, …) with a **lightweight custom runtime**.

We do **not** depend on the full elizaOS monorepo (too heavy). Personas remain portable with the industry-standard Web3 agent character format; the Master Agent is the coordinator/failover layer on top.

### Why not a pure “Master AI” only?

Distinct locked personas must debate (e.g. Trump vs creator). A single blended model collapses voice and accountability. Eliza character files lock style/lore per agent; the Master Agent only coordinates turns, topic, failover, and settlement.

## Architecture

```
characters/*.json          Eliza-compatible persona definitions
        │
        ▼
character/loader.ts        Load + zod-validate from disk / HTTP / IPFS
character/fetchPersona.ts  Fetch + extract personality profile
        │
        ▼
agents/PersonaAgent.ts     In-character LLM generation (OpenRouter / xAI / OpenAI)
agents/systemPrompt.ts     Character → system prompt
        │
        ▼
master/MasterAgent.ts      Turn-taking, topic enforcement, end criteria
master/Heartbeat.ts        Heartbeats + dead-agent detection
master/Failover.ts         Retry / monologue / swap / abort
        │
        ▼
room/RoomRuntime.ts        Session lifecycle + debate loop
room/EventBus.ts           message | heartbeat | agent_down | debate_end | …
        │
        ▼
settlement/DebateSettler.ts  Master + personas vote → signed payload
oracle/coinbaseOracle.ts     Coinbase spot prices
oracle/hashkeyOracle.ts      APRO price via eth_call when configured
hsp/client.ts                HSP fee settlement HTTP client
server.ts                    Hono HTTP + SSE API
```

## Package layout

```
packages/agents/
  package.json
  tsconfig.json
  README.md
  characters/
    master.json          # coordinator only
  src/
    types.ts
    index.ts
    server.ts
    character/
    master/
    agents/
    room/
    settlement/
    oracle/
    hsp/
```

## Requirements & deploy gate

See **[REQUIREMENTS.md](./REQUIREMENTS.md)** for full requirements, success criteria (SC-1…SC-10), and failure modes.

- Node.js ≥ 20
- LLM credentials required for debates (`OPENROUTER_API_KEY` preferred)
- Fighters are registered via `POST /agents` — only `master.json` ships on disk
- Smoke: `npm run smoke` against a running server

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | one of keys | **Preferred** OpenRouter key (`https://openrouter.ai/api/v1`) |
| `OPENROUTER_MODEL` | no | Default `openai/gpt-4o-mini` |
| `XAI_API_KEY` | one of keys | Grok via `https://api.x.ai/v1` |
| `OPENAI_API_KEY` | one of keys | OpenAI-compatible fallback |
| `LLM_PROVIDER` | no | Force `openrouter` \| `xai` \| `openai` |
| `XAI_BASE_URL` / `OPENAI_BASE_URL` / `OPENROUTER_BASE_URL` | no | Override base URLs |
| `XAI_MODEL` / `OPENAI_MODEL` / `LLM_MODEL` | no | Model id overrides |
| `SETTLEMENT_HMAC_SECRET` | recommended | HMAC secret for settlement signatures (falls back to LLM key) |
| `HSP_COORDINATOR_URL` | when using HSP | Base URL for agent fee settlement |
| `HSP_API_KEY` | no | Bearer token for HSP coordinator |
| `HASHKEY_RPC_URL` / `APRO_RPC_URL` | for HashKey oracle | JSON-RPC endpoint |
| `HASHKEY_PRICE_FEED_ADDRESS` / `APRO_PRICE_FEED_ADDRESS` | for HashKey oracle | Feed contract `0x…` |
| `HASHKEY_PRICE_CALLDATA` | no | Default `latestAnswer()` selector `0x50d25bcd` |
| `HASHKEY_PRICE_DECIMALS` | no | Default `8` |
| `IPFS_GATEWAY` | no | Default `https://ipfs.io/ipfs` |
| `PORT` | no | HTTP port (default `8787`) |

## How Master failover works

1. **Heartbeat** (`Heartbeat.ts`) polls agent status on an interval and emits `heartbeat` events. Transition into `down` / `failed` emits `agent_down`.
2. During a persona turn, if `PersonaAgent.generateMessage` throws (missing key, provider error, timeout), **Failover** decides:
   - **`retry`** - up to `maxRetries` (default 3) with exponential backoff (`1s → 2s → 4s…`, capped). Agent is marked `restarting` then `ready`.
   - **`monologue`** - after retries exhausted, the failed agent is disabled; room continues with remaining healthy agents. Master emits a system/coordinator note.
   - **`swap`** - optional if `allowSwap` and a backup persona id is provided.
   - **`abort`** - if no healthy personas remain, debate ends as failed.
3. Failover actions are emitted on the EventBus as `failover` for SSE clients.
4. Topic drift triggers a Master redirect message (LLM call as coordinator).

## HTTP API

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness |
| `GET` | `/agents` | List registered characters |
| `POST` | `/agents` | Register Character JSON body |
| `POST` | `/rooms` | Create room `{ characterIds, topic, marketQuestion, ... }` |
| `GET` | `/rooms/:id` | Status + messages |
| `POST` | `/rooms/:id/start` | Start debate loop |
| `GET` | `/rooms/:id/stream` | SSE stream of room events |

### Example

```bash
# create room
curl -s localhost:8787/rooms -H 'content-type: application/json' -d '{
  "characterIds": ["persona-a", "persona-b"],
  "topic": "Will AI regulation tighten in the US this year?",
  "marketQuestion": "Will the US enact major new federal AI regulation before year-end?",
  "maxTurns": 6
}'

# start
curl -s -X POST localhost:8787/rooms/<ROOM_ID>/start

# stream
curl -N localhost:8787/rooms/<ROOM_ID>/stream
```

## How to run

```bash
cd packages/agents
pnpm install   # or npm install / yarn
export XAI_API_KEY=...   # or OPENAI_API_KEY
pnpm dev       # tsx watch src/server.ts
# production:
pnpm build && pnpm start
```

### Library usage

```ts
import {
  RoomRuntime,
  loadCharacterFromDisk,
  fetchCoinbaseSpotPrice,
} from "@multimarkets/agents";

const master = await loadCharacterFromDisk("./characters/master.json");
// Register personas via POST /agents

const runtime = new RoomRuntime();
// createRoom with your own Character objects after registering them
// (characterIds must match registered agents)

const btc = await fetchCoinbaseSpotPrice("BTC-USD");
```

## Scripts

| Script | Command |
|---|---|
| `dev` | `tsx watch src/server.ts` |
| `build` | `tsc -p tsconfig.json` |
| `start` | `node dist/server.js` |
| `typecheck` | `tsc --noEmit` |

## Design constraints

- TypeScript **strict**
- **zod** validation for Character and API bodies
- LLM via `fetch` to api.x.ai or OpenAI - **throws** if API key missing when generating
- Coinbase oracle - **throws** on failure
