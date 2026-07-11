"use client";

/**
 * Design ProMax: Layouts (2)__App + sidebars (19)
 * Collapse next to brand; expand at TOP when compact (not buried under wallet)
 */

import React from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Button,
  ScrollShadow,
  Spacer,
  Tooltip,
  cn,
} from "@heroui/react";
import { Icon } from "@iconify/react";

import BrandIcon from "@/components/brand-icon";
import Sidebar from "@/components/sidebar";
import { appSidebarItems } from "@/components/sidebar-items";
import { WalletConnectHeader } from "@/components/wallet-connect";

export type AppSidebarProps = {
  isCompact?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
  isMobileDrawer?: boolean;
  className?: string;
};

export default function AppSidebar({
  isCompact = false,
  onToggle,
  onNavigate,
  isMobileDrawer = false,
  className,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const selectedKey = React.useMemo(() => {
    if (pathname.startsWith("/rooms")) return "rooms";
    if (pathname.startsWith("/markets")) return "markets";
    if (pathname.startsWith("/agents")) return "agents";
    if (pathname.startsWith("/create")) return "create";
    if (pathname.startsWith("/dashboard")) return "markets";
    return "markets";
  }, [pathname]);

  const hrefByKey: Record<string, string> = {
    markets: "/markets",
    rooms: "/rooms",
    agents: "/agents",
    create: "/create",
  };

  return (
    <div
      className={cn(
        "relative flex h-full w-72 flex-col border-r border-divider bg-content1 p-6 transition-[width,padding] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        {
          "w-[83px] items-center px-[6px] py-6": isCompact,
        },
        className,
      )}
    >
      {/* Brand row — collapse (expanded) or expand (compact) always next to logo */}
      <div
        className={cn("flex w-full items-center gap-2 pl-1", {
          "flex-col gap-3 pl-0": isCompact,
        })}
      >
        <div
          className={cn("flex min-w-0 flex-1 items-center gap-2.5", {
            "flex-1 flex-col gap-2": isCompact,
          })}
        >
          <NextLink
            href="/markets"
            onClick={onNavigate}
            className="flex shrink-0 items-center"
            aria-label="MultiMarkets home"
          >
            <BrandIcon size={isCompact ? 36 : 40} className="shadow-sm" />
          </NextLink>
          <span
            className={cn(
              "truncate text-small font-bold uppercase tracking-tight text-foreground",
              { "sr-only": isCompact },
            )}
          >
            MultiMarkets
          </span>
        </div>

        {/* Expanded: collapse / close */}
        {!isCompact && (onToggle || onNavigate) && (
          <button
            type="button"
            aria-label={isMobileDrawer ? "Close menu" : "Collapse sidebar"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-default-500 transition-colors hover:bg-default-100 hover:text-foreground"
            onClick={() => {
              if (isMobileDrawer) onNavigate?.();
              else onToggle?.();
            }}
          >
            <Icon
              className="[&>g]:stroke-[1px]"
              icon="solar:round-alt-arrow-left-line-duotone"
              width={24}
            />
          </button>
        )}

        {/* Compact: large expand at TOP (ProMax) */}
        {isCompact && onToggle && (
          <Tooltip content="Expand sidebar" placement="right">
            <Button
              isIconOnly
              className="h-11 w-11 min-w-11 text-default-600"
              size="sm"
              variant="flat"
              radius="full"
              onPress={onToggle}
              aria-label="Expand sidebar"
            >
              <Icon
                className="[&>g]:stroke-[1px]"
                height={24}
                icon="solar:round-alt-arrow-right-line-duotone"
                width={24}
              />
            </Button>
          </Tooltip>
        )}
      </div>

      <Spacer y={isCompact ? 4 : 6} />

      <ScrollShadow
        className={cn("h-full max-h-full flex-1 py-2", isCompact ? "pr-0" : "-mr-4 pr-4")}
      >
        <Sidebar
          defaultSelectedKey={selectedKey}
          selectedKeys={[selectedKey]}
          isCompact={isCompact}
          items={appSidebarItems}
          iconClassName="group-data-[selected=true]:text-default-50"
          itemClasses={{
            base: "px-3 rounded-large data-[selected=true]:!bg-foreground",
            title: "group-data-[selected=true]:text-default-50",
          }}
          onSelect={(key) => {
            const href = hrefByKey[key];
            if (href) {
              router.push(href);
              onNavigate?.();
            }
          }}
        />
      </ScrollShadow>

      <div
        className={cn("mt-auto flex flex-col gap-2 pt-3", {
          "items-center": isCompact,
        })}
      >
        <div
          className={cn("w-full rounded-large bg-default-100 p-2", {
            "flex justify-center bg-transparent p-0": isCompact,
          })}
        >
          {!isCompact && (
            <p className="mb-1.5 px-1 text-tiny font-semibold uppercase tracking-wide text-default-400">
              Wallet
            </p>
          )}
          <WalletConnectHeader variant="light" />
        </div>
      </div>
    </div>
  );
}

export { appSidebarItems as appNavItems };
