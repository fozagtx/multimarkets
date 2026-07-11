"use client";

/**
 * WalletConnect missing-id notice is intentionally NOT a persistent banner.
 * Injected wallets (MetaMask extension) still work. WC QR needs a real project id.
 * Dev warning stays in console via wagmi.ts only.
 */
export default function WalletGuardBanner() {
  return null;
}
