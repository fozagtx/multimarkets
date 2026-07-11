"use client";

/**
 * App chrome footer — brand + CTA only (no product/stack link columns)
 */

import React from "react";
import NextLink from "next/link";
import { Icon } from "@iconify/react";

import BrandIcon from "./brand-icon";

const SiteFooter = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => {
    return (
      <footer
        ref={ref}
        className={`w-full border-t border-black/[0.06] bg-white ${className ?? ""}`}
        {...props}
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-3">
              <NextLink href="/" className="inline-flex w-fit items-center gap-2.5">
                <BrandIcon size={52} className="shadow-sm" />
                <span className="text-[17px] font-semibold text-[#0a0a0b]">Argue</span>
              </NextLink>
              <p className="max-w-sm text-[14px] font-medium leading-relaxed text-[#3f3f46]">
                Live character matches. Trade yes or no on the finish.
              </p>
            </div>
            <NextLink
              href="/create"
              className="inline-flex h-10 w-fit items-center gap-2 rounded-full bg-[#0a0a0b] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#18181b]"
            >
              <span className="text-white">Create</span>
              <Icon icon="solar:arrow-right-linear" width={16} className="text-white" />
            </NextLink>
          </div>

          <div className="mt-10 flex flex-col gap-2 border-t border-black/[0.06] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] font-medium text-[#71717a]">© 2026 Argue</p>
            <p className="text-[12px] font-medium text-[#71717a]">Live debates. Live markets.</p>
          </div>
        </div>
      </footer>
    );
  },
);

SiteFooter.displayName = "SiteFooter";

export default SiteFooter;
