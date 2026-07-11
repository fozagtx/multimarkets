"use client";

/**
 * Design ProMax — Layouts (2)__App shell
 * Collapse / expand always reachable; desktop mini header when rail is compact
 */

import React from "react";
import NextLink from "next/link";
import { Button, useDisclosure, cn } from "@heroui/react";
import { Icon } from "@iconify/react";

import AppSidebar from "@/components/app-sidebar";
import BrandIcon from "@/components/brand-icon";
import { WalletConnectHeader } from "@/components/wallet-connect";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const onToggle = React.useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  return (
    <div
      className="app-shell light flex h-dvh w-full bg-[#eef1f8] text-[#0a0a0b]"
      style={{ colorScheme: "light" }}
      data-theme="light"
    >
      {/* Desktop sidebar */}
      <div
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:block",
          isCollapsed ? "w-[83px]" : "w-72",
        )}
      >
        <AppSidebar isCompact={isCollapsed} onToggle={onToggle} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-divider bg-content1 px-3 sm:hidden">
          <div className="flex items-center gap-1.5">
            <Button
              isIconOnly
              variant="light"
              radius="full"
              aria-label="Open menu"
              className="text-foreground"
              onPress={onOpen}
            >
              <Icon icon="solar:hamburger-menu-linear" width={24} />
            </Button>
            <NextLink href="/markets" className="flex items-center gap-2">
              <BrandIcon size={32} />
              <span className="text-small font-bold text-foreground">MultiMarkets</span>
            </NextLink>
          </div>
          <WalletConnectHeader variant="light" />
        </header>

        {/* Desktop mini bar — expand when collapsed (not buried under wallet) */}
        <header className="sticky top-0 z-10 hidden h-12 shrink-0 items-center border-b border-divider/70 bg-content1/90 px-4 backdrop-blur-md sm:flex">
          <div className="flex w-full items-center gap-2">
            <Button
              isIconOnly
              size="sm"
              variant={isCollapsed ? "flat" : "light"}
              radius="full"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="text-default-600"
              onPress={onToggle}
            >
              <Icon
                icon={
                  isCollapsed
                    ? "solar:sidebar-minimalistic-linear"
                    : "solar:sidebar-minimalistic-bold"
                }
                width={20}
              />
            </Button>
            {isCollapsed && (
              <button
                type="button"
                onClick={onToggle}
                className="inline-flex items-center gap-1.5 rounded-full bg-default-100 px-3 py-1.5 text-[12px] font-semibold text-default-700 transition-colors hover:bg-default-200"
              >
                <Icon
                  icon="solar:round-alt-arrow-right-line-duotone"
                  width={18}
                  className="text-default-600"
                />
                Expand menu
              </button>
            )}
          </div>
        </header>

        <main className="relative z-[1] flex-1 overflow-y-auto px-4 py-6 text-[#0a0a0b] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={onClose}
          />
          <div className="absolute inset-y-0 left-0 flex h-full w-[288px] max-w-[85vw] bg-content1 shadow-large duration-300">
            <AppSidebar
              isCompact={false}
              isMobileDrawer
              onNavigate={onClose}
              onToggle={onClose}
              className="w-full border-r-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}
