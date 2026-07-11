"use client";

import React from "react";
import { usePathname } from "next/navigation";

import AppShell from "@/components/app-shell";
import WalletAccessGate from "@/components/wallet-access-gate";

/**
 * Landing (/) = marketing only.
 * All app routes share AppShell (sidebar + light DNA).
 */
export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <main className="min-h-dvh">{children}</main>;
  }

  return (
    <WalletAccessGate>
      <AppShell>{children}</AppShell>
    </WalletAccessGate>
  );
}
