"use client";

/**
 * App shell — sidebar + main. No desktop collapse chrome in the content header.
 */

import React from "react";
import NextLink from "next/link";
import { Drawer, DrawerBody, DrawerContent, useDisclosure } from "@heroui/react";

import AppSidebar from "@/components/app-sidebar";
import BrandIcon from "@/components/brand-icon";
import { WalletConnectHeader } from "@/components/wallet-connect";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <div
      className="app-shell light flex h-dvh w-full bg-[#eef1f8] text-[#0a0a0b]"
      style={{ colorScheme: "light" }}
      data-theme="light"
    >
      {/* Desktop sidebar — always expanded */}
      <div className="sticky top-0 hidden h-dvh w-72 shrink-0 sm:block">
        <AppSidebar isCompact={false} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top bar only */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-black/[0.06] bg-white px-3 sm:hidden">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Open menu"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#0a0a0b] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-black/[0.04] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B7CFA]/50 focus-visible:ring-offset-2"
              onClick={onOpen}
            >
              <span className="flex w-5 flex-col gap-1" aria-hidden="true">
                <span className="h-px w-full rounded-full bg-current" />
                <span className="h-px w-full rounded-full bg-current" />
                <span className="h-px w-full rounded-full bg-current" />
              </span>
            </button>
            <NextLink href="/markets" className="flex items-center gap-2">
              <BrandIcon size={32} />
              <span className="text-small font-bold text-foreground">MultiMarkets</span>
            </NextLink>
          </div>
          <WalletConnectHeader variant="light" />
        </header>

        <main className="relative z-[1] flex-1 overflow-y-auto px-4 py-6 text-[#0a0a0b] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>

      <Drawer
        isOpen={isOpen}
        placement="left"
        size="xs"
        radius="none"
        aria-label="Navigation menu"
        classNames={{
          base: "h-dvh max-w-[85vw] border-r border-divider bg-content1",
          body: "p-0",
          closeButton: "hidden",
        }}
        onOpenChange={(open) => (open ? onOpen() : onClose())}
      >
        <DrawerContent>
          <DrawerBody>
            <AppSidebar
              isCompact={false}
              isMobileDrawer
              onNavigate={onClose}
              className="w-full border-r-0"
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
