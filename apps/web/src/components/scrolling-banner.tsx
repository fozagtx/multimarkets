"use client";

import React from "react";
import { cn } from "@heroui/react";

interface ScrollingBannerProps {
  className?: string;
  isReverse?: boolean;
  shouldPauseOnHover?: boolean;
  isVertical?: boolean;
  gap?: string;
  duration?: number;
  showShadow?: boolean;
  children?: React.ReactNode;
}

/**
 * Lightweight marquee - plain overflow + CSS animation only.
 * No ScrollShadow masks / blur (those tank scroll performance).
 */
const ScrollingBanner = React.forwardRef<HTMLDivElement, ScrollingBannerProps>(
  (
    {
      className,
      isReverse,
      isVertical = false,
      gap = "1rem",
      shouldPauseOnHover = true,
      duration = 40,
      children,
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full overflow-hidden",
          isVertical ? "overflow-y-hidden" : "overflow-x-hidden",
          className,
        )}
        style={
          {
            "--gap": gap,
            "--duration": `${duration}s`,
          } as React.CSSProperties
        }
      >
        <div
          className={cn("flex w-max items-center gap-[--gap]", {
            "flex-col": isVertical,
            "flex-row": !isVertical,
            "animate-scrolling-banner": !isVertical,
            "animate-scrolling-banner-vertical": isVertical,
            "[animation-direction:reverse]": isReverse,
            "hover:[animation-play-state:paused]": shouldPauseOnHover,
          })}
        >
          {React.Children.map(children, (child) => child)}
          {React.Children.map(children, (child) => child)}
        </div>
      </div>
    );
  },
);

ScrollingBanner.displayName = "ScrollingBanner";

export default ScrollingBanner;
