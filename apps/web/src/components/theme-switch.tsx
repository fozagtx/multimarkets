"use client";

import React from "react";
import { cn } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme, type ThemeMode } from "./theme-provider";

const options: { value: ThemeMode; icon: string; label: string }[] = [
  { value: "light", icon: "solar:sun-2-linear", label: "Light" },
  { value: "dark", icon: "solar:moon-linear", label: "Dark" },
  { value: "system", icon: "solar:monitor-linear", label: "System" },
];

/** Design ProMax theme switch - animated light / dark / system */
const ThemeSwitch = React.forwardRef<HTMLDivElement, { className?: string }>(
  ({ className }, ref) => {
    const { theme, setTheme, resolved } = useTheme();

    return (
      <div
        ref={ref}
        role="radiogroup"
        aria-label="Select a theme"
        className={cn(
          "relative inline-flex items-center gap-0 rounded-full border border-default-200 bg-content2 p-0.5 shadow-small",
          className,
        )}
      >
        {options.map((opt) => {
          const selected = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={opt.label}
              onClick={() => {
                if (theme === opt.value) return;
                setTheme(opt.value);
              }}
              className={cn(
                "relative z-10 flex h-8 w-8 items-center justify-center rounded-full motion-safe:transition-colors motion-safe:duration-150 active:scale-90",
                selected ? "text-default-900" : "text-default-400 hover:text-default-600",
              )}
            >
              {selected && (
                <motion.span
                  layoutId="theme-pill"
                  className="absolute inset-0 rounded-full bg-default-100 shadow-small dark:bg-default-50"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={`${opt.value}-${selected}-${resolved}`}
                  initial={{ opacity: 0, scale: 0.7, rotate: -20 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.7, rotate: 20 }}
                  transition={{ duration: 0.18 }}
                  className="relative z-10"
                >
                  <Icon icon={opt.icon} width={16} />
                </motion.span>
              </AnimatePresence>
            </button>
          );
        })}
      </div>
    );
  },
);

ThemeSwitch.displayName = "ThemeSwitch";

export default ThemeSwitch;
