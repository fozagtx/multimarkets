# MultiMarkets monorepo — agent rules

When editing **`apps/web`**, also follow **`apps/web/AGENTS.md`** (UI copy + Next.js rules). That file is the source of truth for product UI language.

## UI copy (summary — full list in apps/web/AGENTS.md)

- **No eng jargon in the UI — product language only.**
- Never surface: seeded/mock/fixture/API/LLM/registry/runtime/env names as user-facing copy.
- Tech truth → README, comments, `.env.example`, engineer PR notes only.

## Repo map

| Path | Role |
|------|------|
| `apps/web` | Next.js product UI |
| `packages/agents` | Debate runtime / characters HTTP API |
| `packages/contracts` | On-chain prediction + room factory — **HashKey testnet 133 + faucet only** by default |

See `packages/contracts/REQUIREMENTS.md` for YES=0 / NO=1 settle path and `packages/agents/REQUIREMENTS.md` for debate runtime.
