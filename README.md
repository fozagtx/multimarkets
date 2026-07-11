# MultiMarkets

**Gamified prediction markets on HashKey Chain** - lock AI personas into a debate arena, watch them argue, trade the outcome, settle with real oracles.

Built for the **HashKey Chain Horizon Hackathon** (DeFi + AI tracks) with **HSP**-ready agent payments.

## Why this wins attention

Prediction markets are usually dull order books. MultiMarkets makes every market a **live persona duel**:

1. Create a chat room + YES/NO market  
2. Lock two Eliza-compatible agents you register  
3. **Master Agent** coordinates turns, heartbeats, and failover  
4. Users trade while the debate streams  
5. Agent council settles the outcome; collateral priced via Coinbase + HashKey APRO  

## Monorepo

```
apps/web              Next.js 16 + HeroUI + wagmi/RainbowKit (HashKey 177/133)
packages/agents       Master Agent + PersonaAgents (Eliza character schema)
packages/contracts    Hardhat Solidity markets, registry, oracle adapter
docs/SPEC.md          Full product + technical specification
```

## Agent framework decision

| Option | Verdict |
|--------|---------|
| Full **elizaOS** monorepo | Too heavy for hackathon deploy surface |
| Master-only orchestration | Weak multi-persona identity |
| **Eliza character JSON + custom Master Agent** | **Selected** |

See `packages/agents/README.md` for failover, settlement, and oracle details.

## Quick start

### Prerequisites

- Node 20+
- pnpm 10+
- `XAI_API_KEY` or `OPENAI_API_KEY` for real LLM debate
- WalletConnect project id for wallet connect
- Deployer key for HashKey contracts

### Install

```bash
pnpm install
# contracts use npm/hardhat locally if needed:
cd packages/contracts && npm install && cd ../..
cd packages/agents && npm install && cd ../..
```

### Env

```bash
# apps/web/.env.local
cp apps/web/.env.example apps/web/.env.local
# set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID and agent API URL

# packages/agents/.env
export XAI_API_KEY=...
export PORT=8787
export HASHKEY_RPC_URL=https://mainnet.hsk.xyz

# packages/contracts/.env
export PRIVATE_KEY=0x...
export HASHKEY_RPC_URL=https://mainnet.hsk.xyz
```

### Run

```bash
# terminal 1 - agent runtime (real LLM + Coinbase oracle)
pnpm --filter @multimarkets/agents dev

# terminal 2 - web
pnpm --filter @multimarkets/web dev
```

Open http://localhost:3000

### Contracts

```bash
cd packages/contracts
npm run compile
npm test
npm run deploy:testnet   # HashKey 133
npm run deploy:mainnet   # HashKey 177 (required for submission)
```

Copy deployed addresses into `apps/web/.env.local`.

## HashKey / oracles / HSP

| Piece | Integration |
|-------|-------------|
| Chain | Mainnet `177` `https://mainnet.hsk.xyz`, Testnet `133` |
| Collateral | USDT / USDC on HashKey |
| Oracles | Coinbase spot API (agents) + APRO feeds + Coinbase signed adapter (contracts) |
| HSP | `packages/agents` HSP client → `HSP_COORDINATOR_URL` for agent fee mandates |

## License

MIT - hackathon build.
