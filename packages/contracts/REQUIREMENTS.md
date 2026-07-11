# Contracts + prediction resolution — requirements (HashKey **testnet**)

**Network of record:** HashKey Chain **Testnet · chain ID 133**  
**Gas:** HSK from **https://faucet.hsk.xyz/faucet**  
**Not mainnet:** Deploy scripts refuse chain `177` unless `ALLOW_MAINNET=1`.

---

## 1. Outcome encoding (resolution contract)

| Debate result | On-chain action | Value |
|---------------|-----------------|-------|
| **YES** | `ChatRoom.settle(0)` | `0` |
| **NO** | `ChatRoom.settle(1)` | `1` |
| **UNCLEAR / INVALID** | `ChatRoom.cancelSettlement()` | market cancelled, claim refunds |

Off-chain map: `packages/agents/src/settlement/outcomeCodes.ts`.

---

## 2. Resolution flow (must stay single-path)

```
Market Open → buyShares(YES|NO)
ChatRoom.goLive()
… debate …
ChatRoom.endDebate()     → market.closeMarket()
ChatRoom.settle(0|1)     → market.resolve (ONLY callable by ChatRoom)
   OR cancelSettlement() → market.cancel()
Winners (or refunds) claim()
```

### Success criteria

| ID | Criterion |
|----|-----------|
| **PR-1** | `PredictionMarket.resolve` reverts if `msg.sender != chatRoom` |
| **PR-2** | After `endDebate`, market is Closed; buys revert |
| **PR-3** | `settle(0)` → room Settled, market Resolved, winningOutcome=0 |
| **PR-4** | Winner `claim()` receives pro-rata pool (fees excluded from totalPool) |
| **PR-5** | `cancelSettlement` → market Cancelled; users refund net shares |
| **PR-6** | Hardhat suite green: `npm test` |
| **PR-7** | Testnet deploy does not require mainnet tokens; TestnetUSDT mintable |
| **PR-8** | Mainnet deploy blocked without `ALLOW_MAINNET=1` |

---

## 3. Deploy (testnet + faucet)

```bash
# 1) Get test HSK
#    https://faucet.hsk.xyz/faucet
#    RPC https://testnet.hsk.xyz  chainId 133

cd packages/contracts
cp -n .env.example .env
# PRIVATE_KEY=0x…   (wallet funded with faucet HSK)

npm install
npm test
npm run deploy:testnet
# writes deployments/hashkeyTestnet-133.json
# prints NEXT_PUBLIC_* snippets for apps/web
```

Collateral on testnet: **TestnetUSDT / tUSDT** (`mint(address,amount)`) unless `COLLATERAL_TOKEN` is set.

---

## 4. Web wiring (still partial)

| Item | Status |
|------|--------|
| Contracts + unit tests | Ready (PR-1…PR-6) |
| Factory address in web env | After deploy |
| `buyShares` / `claim` from UI | Not wired yet (`onTrade` optional) |
| Agents auto-call `settle` | Not wired — use `mapDebateOutcomeToOnChain` when bridging |

---

## 5. Explicit non-goals

- Building or defaulting to **mainnet (177)**  
- Resolving markets without `ChatRoom` state machine  
