"use client";

import type { NavbarProps } from "@heroui/react";

import React from "react";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
  Link,
  Divider,
  cn,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

import BrandIcon from "./brand-icon";
import ThemeSwitch from "./theme-switch";

const menuItems = [
  { name: "Markets", href: "/markets" },
  { name: "Arenas", href: "/rooms" },
  { name: "Characters", href: "/agents" },
  { name: "Create", href: "/create" },
];

/**
 * Design ProMax skill - Marketing/hero-sections basic-navbar.tsx
 * Adapted: Argue routes + ThemeSwitch + ConnectButton
 */
const SiteHeader = React.forwardRef<HTMLElement, NavbarProps>(
  ({ classNames = {}, ...props }, ref) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const pathname = usePathname();

    return (
      <Navbar
        ref={ref}
        {...props}
        classNames={{
          base: cn("border-default-100 bg-background", {
            "bg-default-200/50 dark:bg-default-100/50": isMenuOpen,
          }),
          wrapper: "w-full max-w-7xl justify-center",
          item: "hidden md:flex",
          ...classNames,
        }}
        height="60px"
        isMenuOpen={isMenuOpen}
        onMenuOpenChange={setIsMenuOpen}
        maxWidth="full"
        isBordered
      >
        <NavbarBrand as={NextLink} href="/" className="gap-0">
          <BrandIcon size={48} className="shadow-sm" />
          <span className="ml-2.5 text-medium font-semibold text-default-foreground">
            Multi<span className="text-primary">Markets</span>
          </span>
        </NavbarBrand>

        <NavbarContent justify="center">
          {menuItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <NavbarItem key={item.href} isActive={active}>
                <Link
                  as={NextLink}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "text-small",
                    active ? "font-medium text-default-foreground" : "text-default-500",
                  )}
                  size="sm"
                >
                  {item.name}
                </Link>
              </NavbarItem>
            );
          })}
        </NavbarContent>

        {/* Wallet connect always visible (desktop + tablet) */}
        <NavbarContent justify="end" className="gap-2">
          <NavbarItem className="hidden sm:flex">
            <ThemeSwitch />
          </NavbarItem>
          <NavbarItem className="hidden md:flex">
            <NextLink
              href="/create"
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#0a0a0b] px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-[#18181b]"
            >
              <span className="text-white">Create</span>
              <Icon icon="solar:alt-arrow-right-linear" className="text-white" width={16} />
            </NextLink>
          </NavbarItem>
          <NavbarItem>
            <ConnectButton
              chainStatus="icon"
              accountStatus={{
                smallScreen: "avatar",
                largeScreen: "full",
              }}
              showBalance={false}
              label="Connect wallet"
            />
          </NavbarItem>
          <NavbarMenuToggle className="text-default-400 md:hidden" />
        </NavbarContent>

        <NavbarMenu
          className="top-[calc(var(--navbar-height)_-_1px)] max-h-fit bg-default-200/50 pb-6 pt-6 shadow-medium backdrop-blur-md backdrop-saturate-150 dark:bg-default-100/50"
          motionProps={{
            initial: { opacity: 0, y: -20 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -20 },
            transition: { ease: "easeInOut", duration: 0.2 },
          }}
        >
          <NavbarMenuItem className="mb-4 flex justify-center sm:hidden">
            <ThemeSwitch />
          </NavbarMenuItem>
          <NavbarMenuItem className="mb-4">
            <div className="flex w-full justify-center">
              <ConnectButton
                chainStatus="full"
                accountStatus="full"
                showBalance={false}
                label="Connect wallet"
              />
            </div>
          </NavbarMenuItem>
          <NavbarMenuItem className="mb-4">
            <NextLink
              href="/create"
              className="flex h-11 w-full items-center justify-center rounded-full bg-[#0a0a0b] px-4 text-[14px] font-medium text-white transition-colors hover:bg-[#18181b]"
            >
              <span className="text-white">Create</span>
            </NextLink>
          </NavbarMenuItem>
          {menuItems.map((item, index) => (
            <NavbarMenuItem key={item.href}>
              <Link
                as={NextLink}
                className="mb-2 w-full text-default-500"
                href={item.href}
                size="md"
                onPress={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
              {index < menuItems.length - 1 && <Divider className="opacity-50" />}
            </NavbarMenuItem>
          ))}
        </NavbarMenu>
      </Navbar>
    );
  },
);

SiteHeader.displayName = "SiteHeader";

export default SiteHeader;
export { SiteHeader };
