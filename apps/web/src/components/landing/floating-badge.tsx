"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/cn";

type FloatingBadgeProps = {
  icon: string;
  label: string;
  color?: string;
  className?: string;
  floatClass?: string;
  compact?: boolean;
};

const FloatingBadge = React.forwardRef<HTMLDivElement, FloatingBadgeProps>(
  (
    { icon, label, color = "#5B7CFA", className, floatClass = "lp-float", compact },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        "pointer-events-none absolute z-20 flex items-center gap-1.5 rounded-[12px] border border-[#E6EAF2] bg-white px-2 py-1.5 shadow-small sm:gap-2 sm:rounded-[14px] sm:px-3 sm:py-2 sm:shadow-medium",
        floatClass,
        className,
      )}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl sm:h-8 sm:w-8"
        style={{ backgroundColor: `${color}22`, color }}
      >
        <Icon icon={icon} width={16} className="sm:hidden" />
        <Icon icon={icon} width={18} className="hidden sm:block" />
      </span>
      <span
        className={cn(
          "text-[11px] font-semibold text-[#0F172A] sm:text-[13px]",
          compact && "hidden sm:inline",
        )}
      >
        {label}
      </span>
    </div>
  ),
);

FloatingBadge.displayName = "FloatingBadge";

export default FloatingBadge;
