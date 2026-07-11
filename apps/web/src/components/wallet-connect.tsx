"use client";

import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type HeaderVariant = "dark" | "light";

/** Compact connect control — black text when on light surfaces */
export function WalletConnectHeader({
  variant = "light",
}: {
  variant?: HeaderVariant;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const solid = cn(
    "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] sm:h-10 sm:px-4 sm:text-[13px]",
    "bg-[#0a0a0b] text-white hover:bg-[#18181b]",
  );

  const soft = cn(
    "inline-flex h-9 max-w-[9rem] items-center truncate rounded-full px-3 text-[12px] font-semibold transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] sm:h-10 sm:max-w-[11rem] sm:px-4 sm:text-[13px]",
    variant === "light"
      ? "bg-[#f4f4f5] text-[#0a0a0b] ring-1 ring-black/10"
      : "bg-white text-[#0a0a0b] ring-1 ring-black/10",
  );

  const warn = solid;

  if (!mounted) {
    return (
      <button type="button" disabled className={cn(solid, "opacity-70")}>
        Connect
      </button>
    );
  }

  return (
    <ConnectButton.Custom>
      {({
        openConnectModal,
        openAccountModal,
        openChainModal,
        account,
        chain,
        mounted: rk,
      }) => {
        if (!rk) {
          return (
            <button type="button" disabled className={cn(solid, "opacity-70")}>
              Connect
            </button>
          );
        }

        if (!account) {
          return (
            <button type="button" onClick={openConnectModal} className={solid}>
              <Icon icon="solar:wallet-linear" width={15} className="shrink-0 text-white" />
              Connect
            </button>
          );
        }

        if (chain?.unsupported) {
          return (
            <button type="button" onClick={openChainModal} className={warn}>
              Switch network
            </button>
          );
        }

        return (
          <button type="button" onClick={openAccountModal} className={soft}>
            <span className="truncate text-[#0a0a0b]">{account.displayName}</span>
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

/**
 * Hero primary — single CTA only on dark/light ink buttons
 */
export function WalletConnectHeroPrimary() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button type="button" disabled className="group lp-btn lp-btn-primary lp-btn-full opacity-70">
        Connect wallet
        <span className="lp-btn-icon">
          <Icon icon="solar:wallet-linear" width={15} />
        </span>
      </button>
    );
  }

  return (
    <ConnectButton.Custom>
      {({ openConnectModal, openChainModal, account, chain }) => {
        if (!account) {
          return (
            <button
              type="button"
              onClick={openConnectModal}
              className="group lp-btn lp-btn-primary lp-btn-full"
            >
              Connect wallet
              <span className="lp-btn-icon">
                <Icon icon="solar:wallet-linear" width={15} />
              </span>
            </button>
          );
        }

        if (chain?.unsupported) {
          return (
            <button
              type="button"
              onClick={openChainModal}
              className="group lp-btn lp-btn-primary lp-btn-full"
            >
              Switch network
              <span className="lp-btn-icon">
                <Icon icon="solar:link-round-linear" width={15} />
              </span>
            </button>
          );
        }

        return (
          <Link href="/markets" className="group lp-btn lp-btn-primary lp-btn-full">
            Enter app
            <span className="lp-btn-icon">
              <Icon icon="solar:arrow-right-up-linear" width={15} />
            </span>
          </Link>
        );
      }}
    </ConnectButton.Custom>
  );
}

export function WalletConnectHero() {
  return <WalletConnectHeroPrimary />;
}

export function WalletConnectActionCard({
  children,
}: {
  children: (args: {
    openConnectModal: () => void;
    account: { displayName?: string } | undefined;
  }) => React.ReactNode;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) {
    return <>{children({ openConnectModal: () => undefined, account: undefined })}</>;
  }
  return (
    <ConnectButton.Custom>
      {({ openConnectModal, account }) =>
        children({ openConnectModal, account: account ?? undefined })
      }
    </ConnectButton.Custom>
  );
}
