# PersonaPit Contracts

Solidity smart contracts for **MultiMarkets / PersonaPit** — prediction markets settled from live character debates.

**Build target: HashKey Chain Testnet (133)** — gas from [faucet.hsk.xyz](https://faucet.hsk.xyz/faucet).  
See **[REQUIREMENTS.md](./REQUIREMENTS.md)** for resolution flow and success criteria. Mainnet is opt-in only.

## Stack

- Hardhat 2 + TypeScript
- Solidity `0.8.24`
- OpenZeppelin Contracts 5.x (`Ownable`, `ReentrancyGuard`, `IERC20`, `SafeERC20`, `ECDSA`)

## Contracts

| Contract | Description |
|----------|-------------|
| `AgentRegistry` | Register AI agents with `personaHash` (IPFS/content hash of Eliza character JSON), creator, name, tags |
| `ChatRoomFactory` | Creates linked `ChatRoom` + `PredictionMarket` pairs |
| `ChatRoom` | Room state machine: `Created → Live → DebateEnded → Settled`; message batch roots; master agent |
| `PredictionMarket` | Binary / multi-outcome parimutuel market; ERC20 collateral; pro-rata payout on resolve |
| `MasterAgentGuard` | Heartbeats per room; backup master takeover after `HEARTBEAT_TIMEOUT` |
| `CoinbaseOracleAdapter` | EIP-191 Coinbase-style signed prices + APRO `AggregatorV3` `latestRoundData` reads |

## HashKey Chain

| Network | Chain ID | RPC | Explorer |
|---------|----------|-----|----------|
| Mainnet | `177` | `https://mainnet.hsk.xyz` | https://hashkey.blockscout.com |
| Testnet | `133` | `https://testnet.hsk.xyz` | https://testnet-explorer.hsk.xyz |

### Mainnet token / oracle addresses

| Asset | Address |
|-------|---------|
| USDT | `0xf1b50ed67a9e2cc94ad3c477779e2d4cbfff9029` |
| USDC | `0x054ed45810DbBAb8B27668922D110669c9D88D0a` |
| WHSK | `0xB210D2120d57b758EE163cFfb43e73728c471Cf1` |
| APRO BTC/USD | `0x204ED500ab56A2E19B051561258E3A45c850360F` |
| APRO USDT/USD | `0x823d7f90f7A3498DB6595886b6B5dC95E6B0B7f3` |
| APRO USDC/USD | `0x244Ce344df8837c9d938867E2Ffbf0E4B0169B56` |
| APRO HSK/USD | `0x86CE42c1b714149Dc3A7b17169EF67b5F78A224b` |
| SUPRA pull | `0x16f70cAD28dd621b0072B5A8a8c392970E87C3dD` |

## Setup

```bash
cd packages/contracts
cp .env.example .env
# set PRIVATE_KEY (and optional RPC / explorer key / COINBASE_ORACLE_SIGNER)

npm install
# or: pnpm install / yarn
```

## Compile

```bash
npm run compile
```

## Test

```bash
npm test
```

Covers:

- Agent registry register/update auth
- Full flow: create room + market → buy shares → live → message batches → end debate → settle → claim
- Master heartbeat timeout + backup takeover
- Coinbase EIP-191 signed price submission

## Deploy

### HashKey testnet (chainId 133) — recommended

Get gas: [faucet.hsk.xyz](https://faucet.hsk.xyz/faucet)

```bash
# Interactive: prompts for key (hidden). Key is NOT written to .env or disk.
npm run deploy:testnet:sync
```

This deploys registry, guard, oracle, factory, TestnetUSDT, a demo market, and **merges contract addresses into `apps/web/.env.local`** (never your private key).

Fund the deployer with test HSK first: https://faucet.hsk.xyz/faucet

### HashKey mainnet (chainId 177)

```bash
npm run deploy:mainnet
# equivalent: npx hardhat run scripts/deploy.ts --network hashkey
```

Deployment writes `deployments/<network>-<chainId>.json` with contract addresses.

### Deploy order (scripted)

1. `AgentRegistry`
2. `MasterAgentGuard`
3. `CoinbaseOracleAdapter` (signer from `COINBASE_ORACLE_SIGNER` or deployer)
4. `ChatRoomFactory`
5. `MasterAgentGuard.setFactoryAuthorization(factory, true)`

## Protocol flow

```text
1. registerAgent(personaHash, name, tags)          // AgentRegistry
2. factory.createRoom({ topic, agentA, agentB,     // ChatRoomFactory
     masterAgent, collateralToken, marketParams,
     backupMasters })
3. users buyShares(outcome, amount)                // PredictionMarket (USDT/USDC)
4. master.goLive()                                 // ChatRoom
5. master.commitMessageBatch(messageRoot)          // ChatRoom (+ heartbeat)
6. master.endDebate()                              // closes market trading
7. master.settle(winningOutcome)                   // resolves market
8. winners claim()                                 // pro-rata of total pool
```

If the master misses heartbeats longer than `HEARTBEAT_TIMEOUT` (default 10 minutes), a registered backup calls:

```text
MasterAgentGuard.takeover(roomId, chatRoom)
```

## Coinbase oracle message format

Relayer submits a price signed by the authorized Coinbase oracle EOA:

```text
messageHash = keccak256(abi.encodePacked(base, "/", quote, price, decimals, timestamp))
signature   = personal_sign(messageHash)   // EIP-191 version 0x45
```

```solidity
adapter.submitCoinbasePrice(base, quote, price, decimals, timestamp, signature);
(price, decimals, ts) = adapter.getCoinbasePrice(base, quote);
(price, decimals, ts) = adapter.getAPROPrice(aproFeedAddress);
```

## License

MIT
