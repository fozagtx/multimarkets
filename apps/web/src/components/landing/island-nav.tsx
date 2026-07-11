"use client";

/**
 * Fluid island nav — high-end visual design + Design ProMax structure
 * Detached glass pill, morph hamburger, staggered overlay links
 */

import React from "react";
import NextLink from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";

import BrandIcon from "@/components/brand-icon";
import { WalletConnectHeader } from "@/components/wallet-connect";
import { navLinks } from "@/data/landing";
import { cn } from "@/lib/cn";

const ease = [0.32, 0.72, 0, 1] as const;

const IslandNav = React.forwardRef<HTMLElement>(function IslandNav(_, ref) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header ref={ref} className="lp-island">
        <div className="lp-island-inner">
          <NextLink
            href="/"
            className="flex shrink-0 items-center gap-2 pl-1"
            onClick={() => setOpen(false)}
          >
            <BrandIcon size={48} className="shadow-sm" />
            <span className="hidden text-[15px] font-semibold tracking-tight text-[#0a0a0b] sm:inline">
              MultiMarkets
            </span>
          </NextLink>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {navLinks.map((l) => (
              <NextLink
                key={l.href}
                href={l.href}
                className="rounded-full px-3 py-1.5 text-[13px] font-medium text-[#3f3f46] transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-black/[0.04] hover:text-[#0a0a0b]"
              >
                {l.name}
              </NextLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <div className="scale-90 sm:scale-100">
              <WalletConnectHeader />
            </div>
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.04] md:hidden"
            >
              <span className="sr-only">Menu</span>
              <span
                className={cn(
                  "absolute h-[1.5px] w-4 bg-[#0a0a0b] transition-transform duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
                  open ? "translate-y-0 rotate-45" : "-translate-y-[3.5px]",
                )}
              />
              <span
                className={cn(
                  "absolute h-[1.5px] w-4 bg-[#0a0a0b] transition-transform duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
                  open ? "translate-y-0 -rotate-45" : "translate-y-[3.5px]",
                )}
              />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[35] flex flex-col bg-white/80 backdrop-blur-3xl md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease }}
          >
            <div className="flex items-center justify-between px-5 pt-5">
              <span className="text-[13px] font-semibold text-[#0a0a0b]">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.05]"
                aria-label="Close"
              >
                <Icon icon="solar:close-circle-linear" width={22} />
              </button>
            </div>
            <nav className="flex flex-1 flex-col justify-center gap-2 px-6 pb-16">
              {navLinks.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.55, ease, delay: 0.08 + i * 0.06 }}
                >
                  <NextLink
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block py-3 text-3xl font-semibold tracking-tight text-[#0a0a0b]"
                  >
                    {l.name}
                  </NextLink>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease, delay: 0.35 }}
                className="pt-6"
              >
                <NextLink
                  href="/create"
                  onClick={() => setOpen(false)}
                  className="group lp-btn lp-btn-primary lp-btn-full"
                >
                  Create
                  <span className="lp-btn-icon">
                    <Icon icon="solar:arrow-right-up-linear" width={16} />
                  </span>
                </NextLink>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

IslandNav.displayName = "IslandNav";

export default IslandNav;
