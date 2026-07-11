"use client";

import React from "react";
import { cn } from "@heroui/react";

export type BrandIconProps = {
  size?: number;
  className?: string;
  alt?: string;
};

/**
 * MultiMarkets brand mark — /public/logo.png
 */
export const BrandIcon = React.forwardRef<HTMLImageElement, BrandIconProps>(
  ({ size = 48, className, alt = "MultiMarkets" }, ref) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      className={cn("inline-block shrink-0 rounded-[22%] object-cover", className)}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      draggable={false}
    />
  ),
);

BrandIcon.displayName = "BrandIcon";

export default BrandIcon;
