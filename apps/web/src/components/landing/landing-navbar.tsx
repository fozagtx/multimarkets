"use client";

/**
 * Design ProMax basic-navbar — high-contrast white type on blue gradient
 */

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
import NextLink from "next/link";
import { Icon } from "@iconify/react";

import BrandIcon from "@/components/brand-icon";
import ThemeSwitch from "@/components/theme-switch";
import { WalletConnectHeader } from "@/components/wallet-connect";
import { navLinks } from "@/data/landing";

const LandingNavbar = React.forwardRef<HTMLElement, NavbarProps>(
  ({ classNames = {}, ...props }, ref) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    return (
      <Navbar
        ref={ref}
        {...props}
        maxWidth="full"
        height="60px"
        isMenuOpen={isMenuOpen}
        onMenuOpenChange={setIsMenuOpen}
        isBlurred={false}
        classNames={{
          base: cn("bg-transparent", {
            "bg-[#5B7CFA] backdrop-blur-md": isMenuOpen,
          }),
          wrapper: "lp-container w-full max-w-[1280px] px-3 sm:px-6",
          item: "hidden md:flex",
          ...classNames,
        }}
      >
        <NavbarBrand as={NextLink} href="/" className="max-w-fit gap-0">
          <BrandIcon size={48} className="shadow-sm" />
          <span className="ml-2.5 text-medium font-bold text-white drop-shadow-sm">
            Argue
          </span>
        </NavbarBrand>

        <NavbarContent justify="center" className="hidden md:flex">
          {navLinks.map((item) => (
            <NavbarItem key={item.href}>
              <Link
                as={NextLink}
                href={item.href}
                className="text-small font-semibold text-white drop-shadow-sm hover:text-white"
                size="sm"
              >
                {item.name}
              </Link>
            </NavbarItem>
          ))}
        </NavbarContent>

        <NavbarContent justify="end" className="gap-1.5 sm:gap-2">
          <NavbarItem className="hidden sm:flex">
            {/* Solid white control so icons never wash into blue */}
            <ThemeSwitch className="border-white/40 bg-white/95 shadow-small [&_button]:text-[#0F172A] [&_button[aria-checked=true]]:text-[#0F172A]" />
          </NavbarItem>
          <NavbarItem className="!flex">
            <WalletConnectHeader />
          </NavbarItem>
          <NavbarMenuToggle
            className="text-white md:hidden"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          />
        </NavbarContent>

        <NavbarMenu
          className="top-[calc(var(--navbar-height)_-_1px)] max-h-fit gap-0 bg-[#5B7CFA] px-4 pb-6 pt-4 shadow-medium"
          motionProps={{
            initial: { opacity: 0, y: -12 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -12 },
            transition: { ease: "easeInOut", duration: 0.2 },
          }}
        >
          <NavbarMenuItem className="mb-4 flex justify-center sm:hidden">
            <ThemeSwitch className="border-[#E6EAF2] bg-white [&_button]:text-[#0F172A]" />
          </NavbarMenuItem>
          {navLinks.map((item, index) => (
            <NavbarMenuItem key={item.href}>
              <Link
                as={NextLink}
                className="mb-2 w-full font-semibold text-white"
                href={item.href}
                size="md"
                onPress={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
              {index < navLinks.length - 1 && <Divider className="bg-white/40" />}
            </NavbarMenuItem>
          ))}
          <NavbarMenuItem className="mt-4">
            <Link
              as={NextLink}
              href="/create"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-small font-bold text-[#5B7CFA]"
              onPress={() => setIsMenuOpen(false)}
            >
              Create
              <Icon icon="solar:arrow-right-linear" width={16} />
            </Link>
          </NavbarMenuItem>
        </NavbarMenu>
      </Navbar>
    );
  },
);

LandingNavbar.displayName = "LandingNavbar";

export default LandingNavbar;
