"use client";

import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Icon } from "@iconify/react";
import { useAccount, useSignMessage } from "wagmi";

import { useIsClient } from "@/hooks/use-is-client";
import BrandIcon from "@/components/brand-icon";
import { getWalletSession, walletSignIn } from "@/lib/agent-api";

function AppContentReveal({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="t-panel-slide min-h-dvh" data-open={isOpen}>
      {children}
    </div>
  );
}

export default function WalletAccessGate({ children }: { children: React.ReactNode }) {
  const mounted = useIsClient();
  const { isConnected, address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [authenticatedAddress, setAuthenticatedAddress] = React.useState<string | null>(null);
  const [authenticating, setAuthenticating] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!mounted || !isConnected || !address) {
      return;
    }
    let cancelled = false;
    void getWalletSession().then((sessionAddress) => {
      if (!cancelled && sessionAddress?.toLowerCase() === address.toLowerCase()) {
        setAuthenticatedAddress(sessionAddress.toLowerCase());
      }
    });
    return () => {
      cancelled = true;
    };
  }, [address, isConnected, mounted]);

  const authenticate = async () => {
    if (!address) return;
    try {
      setAuthenticating(true);
      setAuthError(null);
      await walletSignIn(address, ({ message }) => signMessageAsync({ message }));
      setAuthenticatedAddress(address.toLowerCase());
    } catch {
      setAuthError("Confirm the wallet signature to enter your character library.");
    } finally {
      setAuthenticating(false);
    }
  };

  if (mounted && isConnected && authenticatedAddress === address?.toLowerCase()) {
    return <AppContentReveal>{children}</AppContentReveal>;
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#eef1f8] px-4 py-8 text-[#0a0a0b]">
      <div className="w-full max-w-sm rounded-[1.75rem] border border-black/[0.06] bg-white p-6 text-center shadow-[0_24px_80px_-24px_rgba(20,20,43,0.18)] sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5B7CFA]/10">
          <BrandIcon size={36} />
        </div>
        <h1 className="mt-5 text-xl font-bold tracking-tight">
          {isConnected ? "Confirm your wallet" : "Connect to continue"}
        </h1>
        <p className="mt-2 text-sm font-medium leading-relaxed text-[#52525b]">
          {isConnected
            ? "Confirm a signature to open your private character library."
            : "Connect your wallet to enter Argue."}
        </p>

        {!mounted ? (
          <div className="mt-6 h-11 w-full animate-pulse rounded-full bg-black/[0.06]" aria-label="Loading wallet" />
        ) : isConnected ? (
          <>
            <button
              type="button"
              disabled={authenticating}
              onClick={() => void authenticate()}
              className="mm-button-primary mt-6 h-11 w-full gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon icon="solar:shield-keyhole-linear" width={17} className="text-white" />
              <span className="text-white">{authenticating ? "Confirming…" : "Confirm wallet"}</span>
            </button>
            {authError && <p className="mt-3 text-xs font-medium text-red-700">{authError}</p>}
          </>
        ) : (
          <ConnectButton.Custom>
            {({ mounted: rainbowMounted, openConnectModal }) => (
              <button
                type="button"
                disabled={!rainbowMounted}
                onClick={openConnectModal}
                className="mm-button-primary mt-6 h-11 w-full gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon icon="solar:wallet-linear" width={17} className="text-white" />
                <span className="text-white">Connect wallet</span>
              </button>
            )}
          </ConnectButton.Custom>
        )}
      </div>
    </main>
  );
}
