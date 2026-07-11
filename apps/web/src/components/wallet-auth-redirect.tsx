"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";

/**
 * On fresh wallet connect, send the user into the app.
 * Skips the first render so already-connected visitors are not force-redirected.
 */
export default function WalletAuthRedirect({
  to = "/markets",
  enabled = true,
}: {
  to?: string;
  enabled?: boolean;
}) {
  const router = useRouter();
  const { isConnected } = useAccount();
  const prev = React.useRef<boolean | null>(null);

  React.useEffect(() => {
    if (!enabled) return;

    if (prev.current === null) {
      prev.current = isConnected;
      return;
    }

    if (!prev.current && isConnected) {
      router.push(to);
    }

    prev.current = isConnected;
  }, [enabled, isConnected, router, to]);

  return null;
}
