"use client";

/**
 * App sidebar — brand, nav, wallet. Collapse chrome removed from desktop.
 */

import React from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ScrollShadow, Spacer, cn } from "@heroui/react";
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
    if (pathname.startsWith("/dashboard")) return "dashboard";
    if (pathname.startsWith("/rooms")) return "rooms";
    if (pathname.startsWith("/markets")) return "markets";
    if (pathname.startsWith("/agents")) return "agents";
    if (pathname.startsWith("/create")) return "create";
    return "dashboard";
  }, [pathname]);

  const hrefByKey: Record<string, string> = {
    dashboard: "/dashboard",
    markets: "/markets",
    rooms: "/rooms",
    agents: "/agents",
    create: "/create",
  };

  return (
    <div
      className={cn(
        "relative flex h-full w-72 flex-col border-r border-black/[0.06] bg-white p-6",
        {
          "w-[83px] items-center px-[6px] py-6": isCompact,
        },
        className,
      )}
    >
      {/* Brand row */}
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

        {/* Expanded: close only on mobile drawer */}
        {!isCompact && isMobileDrawer && onNavigate && (
          <button
            type="button"
            aria-label="Close menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-default-500 transition-colors hover:bg-default-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B7CFA]/50 focus-visible:ring-offset-2"
            onClick={() => onNavigate()}
          >
            <Icon
              className="[&>g]:stroke-[1px]"
              icon="solar:round-alt-arrow-left-line-duotone"
              width={24}
            />
          </button>
        )}

        {!isMobileDrawer && onToggle && (
          <button
            type="button"
            aria-label={isCompact ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-default-500 transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-default-100 hover:text-foreground active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B7CFA]/50 focus-visible:ring-offset-2"
            onClick={onToggle}
          >
            <Icon
              className="[&>g]:stroke-[1px]"
              icon={
                isCompact
                  ? "solar:round-alt-arrow-right-line-duotone"
                  : "solar:round-alt-arrow-left-line-duotone"
              }
              width={24}
            />
          </button>
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
            base: "px-3 rounded-large data-[selected=true]:!bg-foreground data-[selected=true]:!text-white",
            title: "group-data-[selected=true]:!text-white",
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
