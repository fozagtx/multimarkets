"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/cn";

export type LandingFeatureCardProps = {
  icon: string;
  title: string;
  description: string;
  className?: string;
  featured?: boolean;
};

const ease = [0.32, 0.72, 0, 1] as const;

/** Double-bezel bento cell with delightful hover + icon pop */
const FeatureCard = React.forwardRef<HTMLDivElement, LandingFeatureCardProps>(
  ({ icon, title, description, className, featured }, ref) => {
    const reduce = useReducedMotion() ?? false;

    return (
      <motion.article
        ref={ref}
        className={cn("lp-bento-shell group h-full cursor-default", className)}
        whileHover={
          reduce
            ? undefined
            : {
                y: -5,
                transition: { duration: 0.55, ease },
              }
        }
        whileTap={reduce ? undefined : { scale: 0.99 }}
      >
        <div
          className={cn(
            "lp-bento-core relative flex h-full flex-col gap-4 overflow-hidden",
            featured && "justify-between gap-8 md:min-h-[280px] md:p-8",
          )}
        >
          {/* Soft sheen on hover */}
          {!reduce && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#5B7CFA]/10 blur-2xl"
              initial={{ opacity: 0, scale: 0.6 }}
              whileHover={{ opacity: 1, scale: 1.15 }}
              transition={{ duration: 0.6, ease }}
            />
          )}

          <motion.span
            className={cn(
              "relative flex h-11 w-11 items-center justify-center rounded-2xl",
              featured ? "bg-[#0a0a0b] text-white" : "bg-[#f4f4f5] text-[#0a0a0b]",
            )}
            whileHover={
              reduce
                ? undefined
                : {
                    scale: 1.08,
                    rotate: featured ? -4 : 4,
                    transition: { type: "spring", stiffness: 400, damping: 18 },
                  }
            }
          >
            <Icon icon={icon} width={featured ? 22 : 20} />
          </motion.span>

          <div className="relative flex flex-col gap-2">
            <h3
              className={cn(
                "font-semibold tracking-tight text-[#0a0a0b] transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:text-[#5B7CFA]",
                featured ? "text-2xl md:text-3xl" : "text-lg",
              )}
            >
              {title}
            </h3>
            <p
              className={cn(
                "leading-relaxed text-[#3f3f46]",
                featured ? "text-[15px] md:text-base" : "text-sm",
              )}
            >
              {description}
            </p>
          </div>
        </div>
      </motion.article>
    );
  },
);

FeatureCard.displayName = "FeatureCard";

export default FeatureCard;
