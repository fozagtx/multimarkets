# Argue - Product & Technical Specification

> Gamified prediction markets on **HashKey Chain**, powered by locked AI personas that debate live. Built for the HashKey Chain Horizon Hackathon (DeFi + AI tracks) with **HSP** settlement and real oracle feeds.

## Problem

Prediction markets are dry order books. Users place bets on outcomes they never *see* unfold. There is no narrative, no personality, no theater - so engagement dies.

## Solution

**Argue** turns every market into a live arena:

1. Create a **chat room** around a prediction question.
2. **Lock two AI agents** into the room (Trump vs Elon, two creators, any Eliza-compatible personas).
3. A **Master Agent** coordinates turn-taking, enforces the topic, heartbeats both agents, and fails over if one dies.
4. Users watch the debate stream and **trade YES/NO** (or multi-outcome) shares on what will happen.
5. Settlement is driven by the agent council + on-chain oracle pricing for collateral.

## Tracks

| Track | How we hit it |
|-------|----------------|
| **AI** | Multi-agent debate runtime, Eliza character personas, Master Agent orchestration + failover |
| **DeFi** | On-chain prediction markets, ERC-20 collateral (USDT/USDC), HashKey deployment, **HSP** for agent fee payments |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  apps/web (Next.js)                                             │
│  Landing · Wallet (RainbowKit/wagmi) · Rooms · Markets · Agents │
└────────────┬───────────────────────────────┬────────────────────┘
             │ REST / SSE                    │ wagmi / viem
┌────────────▼────────────┐     ┌────────────▼────────────────────┐
│  packages/agents        │     │  packages/contracts (Hardhat)   │
│  MasterAgent            │     │  AgentRegistry                  │
│  PersonaAgent ×2        │     │  ChatRoom + Factory             │
│  Heartbeat / Failover   │     │  PredictionMarket               │
│  Coinbase Oracle client │     │  CoinbaseOracleAdapter          │
│  HSP payment client     │     │  MasterAgentGuard               │
│  DebateSettler          │     │  APRO / SUPRA price reads       │
└─────────────────────────┘     └─────────────────────────────────┘
             │                               │
             ▼                               ▼
   xAI / OpenAI APIs              HashKey Chain (177 / 133)
   Coinbase Price API             HSP Coordinator
```

## Agent layer decision: ElizaOS characters + Master Agent

| Option | Fit | Verdict |
|--------|-----|---------|
| **Full elizaOS monorepo** | Excellent persona model; heavy deploy surface | Too heavy for hackathon runtime |
| **“Master AI” only** | Good orchestration; weak multi-persona identity | Insufficient for locked celebrity/creator duels |
| **Eliza character schema + custom Master Agent** | Persona JSON standard + fault-tolerant coordinator | **Selected** |

Eliza-compatible character files define name, bio, lore, style, adjectives, topics, messageExamples. The Master Agent:

- Assigns turns and topic constraints
- Emits heartbeats for each agent + itself
- On agent failure: exponential backoff restart → optional backup persona → room pause with on-chain notice
- Aggregates settlement votes from both agents + itself

## User flows

### Create room

1. Connect wallet (HashKey Chain).
2. Pick or create two agents (persona JSON → content hash registered on `AgentRegistry`).
3. Set topic + market question + collateral token + stake bounds.
4. Factory deploys/registers room + market; Master Agent session starts off-chain.

### Debate + trade

1. Master starts debate loop; SSE streams messages to the UI.
2. Users buy YES/NO shares while the room is `Live`.
3. Heartbeat panel shows Master + Agent A/B status (live / degraded / down).

### Settlement

1. Master ends debate by rule (turn cap, time, consensus).
2. Settler produces signed outcome from transcript + agent votes.
3. On-chain market resolves; winners redeem collateral.
4. Agent hosting fees can settle via **HSP** mandates (extra DeFi points).

## Oracles

| Source | Use |
|--------|-----|
| **Coinbase Price Oracle / Exchange API** | Off-chain signed/spot prices for market metadata & stake USD checks |
| **APRO** on HashKey | On-chain BTC/USDT/USDC/HSK feeds for collateral valuation |
| **SUPRA** pull oracle | Optional pull-based redundancy |
| **Chainlink Streams verifier** | Available on HashKey for mission-critical paths |

**Policy:** Missing API keys or RPC failures surface as hard errors.

## Smart contracts (summary)

- `AgentRegistry` - persona hash, creator, metadata
- `ChatRoomFactory` / `ChatRoom` - room lifecycle, message roots, master address
- `PredictionMarket` - parimutuel YES/NO, ERC-20, resolve + claim
- `CoinbaseOracleAdapter` - verify Coinbase signatures + APRO reads
- `MasterAgentGuard` - heartbeat timeout → backup master takeover

## HashKey / HSP

- Deploy contracts to **HashKey Chain mainnet (177)** for submission eligibility.
- Use **HSP SDK** for agent payment mandates when charging room creation / resolve fees.
- Extra points for official HSP usage on DeFi track.

## Non-goals (v0)

- Full order-book CLOB (parimutuel first)
- Mobile native apps
- Fully decentralized LLM inference
- Unbounded multi-agent swarms (>2 persona + 1 master)

## Env vars

```bash
# Web
NEXT_PUBLIC_HASHKEY_RPC=https://mainnet.hsk.xyz
NEXT_PUBLIC_HASHKEY_TESTNET_RPC=https://testnet.hsk.xyz
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_AGENT_API_URL=http://localhost:8787
NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=
NEXT_PUBLIC_CHAT_ROOM_FACTORY_ADDRESS=
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=

# Agents
PORT=8787
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4o-mini
HSP_COORDINATOR_URL=
HASHKEY_RPC_URL=https://mainnet.hsk.xyz
COINBASE_ORACLE_URL=https://api.coinbase.com/v2

# Contracts deploy
PRIVATE_KEY=
HASHKEY_RPC_URL=
```

## Success criteria (hackathon)

- [ ] Contracts compile and deploy to HashKey
- [ ] Wallet connect on HashKey mainnet/testnet
- [ ] Create room + lock 2 real persona agents
- [ ] Live SSE debate with Master coordination
- [ ] Heartbeat + failover path exercised
- [ ] Coinbase price fetch wired
- [ ] Market create / buy / settle path wired
- [ ] Landing + core app UI production-grade (Design ProMax / HeroUI)
- [ ] README + walkthrough for judges
