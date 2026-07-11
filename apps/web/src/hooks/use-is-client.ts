"use client";

import { useSyncExternalStore } from "react";

/** True after hydration — avoids setState-in-effect for client-only UI. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}
