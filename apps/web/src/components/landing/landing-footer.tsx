"use client";

import React from "react";
import NextLink from "next/link";
import { Icon } from "@iconify/react";
import BrandIcon from "@/components/brand-icon";

const LandingFooter = React.forwardRef<HTMLElement>(function LandingFooter(_, ref) {
  return (
    <footer ref={ref} className="relative z-[1] border-t border-black/[0.05] bg-white">
      <div className="lp-container py-16 md:py-20">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <NextLink href="/" className="inline-flex items-center gap-2.5">
              <BrandIcon size={56} className="shadow-sm" />
              <span className="text-[17px] font-semibold tracking-tight text-[#0a0a0b]">
                Argue
              </span>
            </NextLink>
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-[#3f3f46]">
              Follow the argument. Choose a side. See how the match ends.
            </p>
            <NextLink href="/create" className="group lp-btn lp-btn-primary mt-6">
              Create match
              <span className="lp-btn-icon">
                <Icon icon="solar:arrow-right-up-linear" width={15} />
              </span>
            </NextLink>
          </div>

          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <NextLink
                href="#problem"
                className="text-[14px] font-medium text-[#0a0a0b] hover:opacity-60"
              >
                Why this exists
              </NextLink>
            </li>
            <li>
              <NextLink
                href="#how"
                className="text-[14px] font-medium text-[#0a0a0b] hover:opacity-60"
              >
                How it works
              </NextLink>
            </li>
            <li>
              <NextLink
                href="#faq"
                className="text-[14px] font-medium text-[#0a0a0b] hover:opacity-60"
              >
                FAQ
              </NextLink>
            </li>
          </ul>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-black/[0.05] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] font-medium text-[#71717a]">© 2026 Argue</p>
          <p className="text-[12px] font-medium text-[#71717a]">
            See the fight. Trade the finish.
          </p>
        </div>
      </div>
    </footer>
  );
});

LandingFooter.displayName = "LandingFooter";

export default LandingFooter;
