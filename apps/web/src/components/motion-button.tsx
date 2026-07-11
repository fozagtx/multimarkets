"use client";

import React from "react";
import { Button, type ButtonProps } from "@heroui/react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@heroui/react";

/**
 * HeroUI Button with press / hover micro-interactions.
 * Wraps in motion.span to avoid prop clash with DOM animation events.
 */
const MotionButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, fullWidth, isDisabled, ...props }, ref) => {
    const reduce = useReducedMotion() ?? false;

    if (reduce || isDisabled) {
      return (
        <Button
          ref={ref}
          fullWidth={fullWidth}
          isDisabled={isDisabled}
          className={cn(
            "motion-safe:transition-transform motion-safe:duration-150 active:scale-[0.97]",
            className,
          )}
          {...props}
        />
      );
    }

    return (
      <motion.span
        className={cn("inline-flex", fullWidth && "w-full")}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
      >
        <Button ref={ref} fullWidth={fullWidth} className={className} {...props} />
      </motion.span>
    );
  },
);

MotionButton.displayName = "MotionButton";

export default MotionButton;
