#!/usr/bin/env bash
# Deploy Argue contracts to HashKey TESTNET (133)
# and merge addresses into apps/web/.env.local
#
# SECURITY: Never put PRIVATE_KEY in .env or git.
# This script only accepts:
#   A) Interactive prompt (hidden, not saved to disk)
#   B) One-shot env for THIS process only (not written to a file):
#        read -s KEY && PRIVATE_KEY="$KEY" npm run deploy:testnet:sync
#
# Usage:
#   ./scripts/deploy-testnet.sh
#   # then paste key when asked (input is hidden)
#
# Prerequisites:
#   - Testnet HSK: https://faucet.hsk.xyz/faucet
#   - Chain 133 · RPC https://testnet.hsk.xyz

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export HASHKEY_TESTNET_RPC="${HASHKEY_TESTNET_RPC:-https://testnet.hsk.xyz}"
unset ALLOW_MAINNET

# Do NOT load PRIVATE_KEY from .env (intentionally dangerous for many people)
if [[ -f .env ]] && grep -qE '^PRIVATE_KEY=.+' .env 2>/dev/null; then
  echo "WARNING: packages/contracts/.env contains PRIVATE_KEY."
  echo "         Prefer deleting that line. This script will not read it."
fi

# Only use PRIVATE_KEY if already set in THIS shell (not from file)
if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "===================================================="
  echo " Argue → HashKey TESTNET (133)"
  echo " Faucet: https://faucet.hsk.xyz/faucet"
  echo " RPC:    $HASHKEY_TESTNET_RPC"
  echo "===================================================="
  echo ""
  echo "Private key is NOT saved to disk."
  echo "Paste key (starts with 0x), then Enter. Input is hidden."
  echo -n "PRIVATE_KEY: "
  # -s = silent (no echo)
  read -r -s PRIVATE_KEY
  echo ""
  export PRIVATE_KEY
fi

if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "ERROR: empty key. Aborted."
  exit 1
fi

# Normalize 0x
if [[ "$PRIVATE_KEY" != 0x* && "$PRIVATE_KEY" != 0X* ]]; then
  export PRIVATE_KEY="0x$PRIVATE_KEY"
fi

# Basic length check (32-byte key hex = 64 chars + 0x)
KEY_BODY="${PRIVATE_KEY#0x}"
KEY_BODY="${KEY_BODY#0X}"
if [[ ${#KEY_BODY} -ne 64 ]]; then
  echo "ERROR: key should be 64 hex chars after 0x (got ${#KEY_BODY})."
  unset PRIVATE_KEY
  exit 1
fi

echo "===================================================="
echo " Deploying (key only in memory for this process)"
echo "===================================================="

npm install --silent 2>/dev/null || npm install
npm run compile

npx hardhat run scripts/deploy.ts --network hashkeyTestnet
DEPLOY_STATUS=$?

# Wipe key from environment as soon as deploy ends
unset PRIVATE_KEY

if [[ $DEPLOY_STATUS -ne 0 ]]; then
  echo "Deploy failed."
  exit $DEPLOY_STATUS
fi

echo ""
echo "OK. Addresses written to:"
echo "  - packages/contracts/deployments/hashkeyTestnet-133.json"
echo "  - apps/web/src/lib/config.ts  (in code — never your key)"
echo ""
echo "Next:"
echo "  1) Restart web:  cd apps/web && pnpm dev"
echo "  2) Wallet on HashKey Testnet 133 + HSK from faucet"
echo "  3) In app: Get testnet USDT → Buy YES/NO"
