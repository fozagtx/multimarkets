"use client";

/**
 * Live market panel — buys YES/NO on HashKey testnet PredictionMarket when configured.
 * Addresses from deploy-testnet.sh → apps/web/.env.local
 */

import React from "react";
import { Icon } from "@iconify/react";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useWriteContract,
  useReadContract,
} from "wagmi";
import { formatUnits, parseUnits, type Address } from "viem";
import { cn } from "@/lib/cn";
import { toastError, toastInfo, toastSuccess, toastWarning } from "@/lib/toast";
import StatusBadge from "@/components/status-badge";
import { CONTRACTS, OUTCOMES, NETWORK } from "@/lib/config";
import { erc20Abi, predictionMarketAbi } from "@/lib/market-abi";

const OUTCOME_YES = OUTCOMES.YES;
const OUTCOME_NO = OUTCOMES.NO;
const FAUCET_URL = NETWORK.faucet;

export type MarketTradePanelProps = {
  question: string;
  /** Override market; defaults to NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS */
  marketAddress?: `0x${string}` | "";
  className?: string;
};

function fmtPool(raw: bigint | undefined, decimals: number): string {
  if (raw === undefined) return "—";
  const n = Number(formatUnits(raw, decimals));
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function MarketTradePanel({
  question,
  marketAddress,
  className,
}: MarketTradePanelProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const market = (marketAddress || CONTRACTS.predictionMarket) as Address | "";
  const collateral = CONTRACTS.collateralToken as Address | "";
  const configured = Boolean(market && collateral && market.startsWith("0x"));

  const [side, setSide] = React.useState<"YES" | "NO">("YES");
  const [amount, setAmount] = React.useState("10");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onTestnet = chainId === 133;

  const { data: decimals = 6 } = useReadContract({
    address: collateral || undefined,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: Boolean(collateral) },
  });

  const { data: yesPool, refetch: refetchYes } = useReadContract({
    address: market || undefined,
    abi: predictionMarketAbi,
    functionName: "getOutcomePool",
    args: [OUTCOME_YES],
    query: { enabled: Boolean(market), refetchInterval: 8_000 },
  });

  const { data: noPool, refetch: refetchNo } = useReadContract({
    address: market || undefined,
    abi: predictionMarketAbi,
    functionName: "getOutcomePool",
    args: [OUTCOME_NO],
    query: { enabled: Boolean(market), refetchInterval: 8_000 },
  });

  const { data: marketState } = useReadContract({
    address: market || undefined,
    abi: predictionMarketAbi,
    functionName: "marketState",
    query: { enabled: Boolean(market), refetchInterval: 8_000 },
  });

  const openForTrade = marketState === 0; // Open

  const mintTestCollateral = async () => {
    if (!address || !collateral || !publicClient) return;
    try {
      setBusy(true);
      const hash = await writeContractAsync({
        address: collateral,
        abi: erc20Abi,
        functionName: "mint",
        args: [address, parseUnits("1000", Number(decimals))],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      toastSuccess("Test tokens minted", "1,000 tUSDT added to your wallet");
    } catch (e) {
      toastError(
        "Mint failed",
        e instanceof Error ? e.message : "Mint only works for testnet USDT",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleTrade = async () => {
    setError(null);
    if (!isConnected || !address) {
      const msg = "Connect a wallet to trade.";
      setError(msg);
      toastWarning("Wallet required", msg);
      return;
    }
    if (!onTestnet) {
      const msg = "Switch to HashKey Testnet (133). Get HSK from the faucet.";
      setError(msg);
      toastWarning("Wrong network", msg);
      return;
    }
    if (!configured || !market || !collateral || !publicClient) {
      const msg = "Markets not deployed yet. Run deploy-testnet.sh first.";
      setError(msg);
      toastInfo("Not deployed", msg);
      return;
    }
    if (!openForTrade) {
      const msg = "This market is closed or settled.";
      setError(msg);
      toastWarning("Market closed", msg);
      return;
    }

    const outcome = side === "YES" ? OUTCOME_YES : OUTCOME_NO;
    let value: bigint;
    try {
      value = parseUnits(amount || "0", Number(decimals));
    } catch {
      setError("Enter a valid amount.");
      return;
    }
    if (value <= BigInt(0)) {
      setError("Amount must be greater than zero.");
      return;
    }

    try {
      setBusy(true);
      toastInfo(`Buying ${side}…`, "Approve token if asked, then confirm buy");

      const allowance = (await publicClient.readContract({
        address: collateral,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, market],
      })) as bigint;

      if (allowance < value) {
        const approveHash = await writeContractAsync({
          address: collateral,
          abi: erc20Abi,
          functionName: "approve",
          args: [market, value],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      const buyHash = await writeContractAsync({
        address: market,
        abi: predictionMarketAbi,
        functionName: "buyShares",
        args: [outcome, value],
      });
      await publicClient.waitForTransactionReceipt({ hash: buyHash });

      toastSuccess(`Bought ${side}`, `${amount} collateral`);
      void refetchYes();
      void refetchNo();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Trade failed";
      setError(msg.slice(0, 180));
      toastError("Trade failed", msg.slice(0, 120));
    } finally {
      setBusy(false);
    }
  };

  const handleClaim = async () => {
    if (!market || !publicClient || !address) return;
    try {
      setBusy(true);
      const hash = await writeContractAsync({
        address: market,
        abi: predictionMarketAbi,
        functionName: "claim",
      });
      await publicClient.waitForTransactionReceipt({ hash });
      toastSuccess("Claimed", "Payout sent to your wallet");
    } catch (e) {
      toastError("Claim failed", e instanceof Error ? e.message : "Try again");
    } finally {
      setBusy(false);
    }
  };

  const dec = Number(decimals);

  return (
    <div
      className={cn(
        "rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_12px_40px_-16px_rgba(20,20,43,0.12)]",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-[#0a0a0b]">Live market</p>
        <StatusBadge status={openForTrade ? "live" : "ended"} />
      </div>
      <p className="mb-3 text-[13px] font-medium leading-snug text-[#3f3f46]">{question}</p>

      {!configured && (
        <p className="mb-3 rounded-xl bg-[#fffbeb] px-3 py-2 text-[11px] font-medium text-[#92400e]">
          Contracts not configured. Deploy testnet and restart the app.
        </p>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSide("YES")}
          className={cn(
            "rounded-xl border px-3 py-2.5 text-left transition-colors",
            side === "YES"
              ? "border-emerald-300 bg-emerald-50"
              : "border-black/[0.06] bg-[#f4f4f5] hover:bg-[#eee]",
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#71717a]">
            YES pool
          </p>
          <p className="text-[16px] font-bold tabular-nums text-emerald-700">
            {fmtPool(yesPool as bigint | undefined, dec)}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setSide("NO")}
          className={cn(
            "rounded-xl border px-3 py-2.5 text-left transition-colors",
            side === "NO"
              ? "border-red-300 bg-red-50"
              : "border-black/[0.06] bg-[#f4f4f5] hover:bg-[#eee]",
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#71717a]">
            NO pool
          </p>
          <p className="text-[16px] font-bold tabular-nums text-red-700">
            {fmtPool(noPool as bigint | undefined, dec)}
          </p>
        </button>
      </div>

      <label className="mb-3 flex flex-col gap-1">
        <span className="text-[11px] font-semibold text-[#52525b]">Amount (test USDT)</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-10 rounded-xl border border-black/[0.08] bg-white px-3 text-[13px] font-semibold text-[#0a0a0b] outline-none focus:border-[#5B7CFA]/40"
        />
      </label>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={busy || !configured}
          onClick={() => void handleTrade()}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#0a0a0b] text-[13px] font-semibold text-white transition-colors hover:bg-[#18181b] disabled:opacity-50"
        >
          <Icon icon="solar:chart-2-bold" width={16} className="text-white" />
          <span className="text-white">{busy ? "Working…" : `Buy ${side}`}</span>
        </button>

        {configured && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void mintTestCollateral()}
            className="inline-flex h-9 w-full items-center justify-center rounded-full border border-black/[0.08] bg-[#f4f4f5] text-[12px] font-semibold text-[#0a0a0b] hover:bg-white disabled:opacity-50"
          >
            Get testnet USDT
          </button>
        )}

        {marketState === 2 || marketState === 3 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleClaim()}
            className="inline-flex h-9 w-full items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-[12px] font-semibold text-emerald-900 disabled:opacity-50"
          >
            Claim payout
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 rounded-xl bg-[#fef2f2] px-3 py-2 text-[11px] font-medium text-[#b91c1c]">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-[11px] font-medium leading-relaxed text-[#71717a]">
          Testnet only. Gas:{" "}
          <a href={FAUCET_URL} target="_blank" rel="noreferrer" className="underline">
            HSK faucet
          </a>
          . YES = 0, NO = 1.
        </p>
      )}
    </div>
  );
}
