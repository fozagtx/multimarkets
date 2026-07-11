"use client";

import React from "react";
import { HeroUIProvider } from "@heroui/react";
import { useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { config } from "@/lib/wagmi";
import { ThemeProvider, useTheme } from "./theme-provider";
import { ToastProvider } from "./toast/toast-context";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
    },
  },
});

function RainbowKitThemed({ children }: { children: React.ReactNode }) {
  const { resolved } = useTheme();
  const theme =
    resolved === "light"
      ? lightTheme({
          accentColor: "#5B7CFA",
          accentColorForeground: "#ffffff",
          borderRadius: "medium",
          fontStack: "system",
        })
      : darkTheme({
          accentColor: "#5B7CFA",
          accentColorForeground: "#ffffff",
          borderRadius: "medium",
          fontStack: "system",
        });

  return (
    <RainbowKitProvider theme={theme} modalSize="compact">
      {children}
    </RainbowKitProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <HeroUIProvider navigate={router.push} className="flex min-h-full flex-col">
            <RainbowKitThemed>
              <ToastProvider>{children}</ToastProvider>
            </RainbowKitThemed>
          </HeroUIProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
