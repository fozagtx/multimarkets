"use client";

import type { CardProps } from "@heroui/react";

import React from "react";
import { Card, CardBody, cn } from "@heroui/react";
import { Icon } from "@iconify/react";

export type BentoCardProps = CardProps & {
  icon: string;
  title: string;
  description: string;
  /** Larger hero cell in the bento */
  featured?: boolean;
};

/**
 * Bento tile built from Design ProMax tokens:
 * bg-content2 / border-default-200 / text-medium + text-small hierarchy
 * Same icon treatment as Application action-card
 */
const BentoCard = React.forwardRef<HTMLDivElement, BentoCardProps>(
  ({ icon, title, description, featured, className, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          "h-full border-small border-default-200 bg-content2",
          featured && "bg-content1",
          className,
        )}
        shadow="none"
        {...props}
      >
        <CardBody
          className={cn(
            "flex h-full flex-col gap-3 p-5",
            featured && "justify-between gap-6 p-6 sm:p-8",
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex rounded-medium border border-primary-100 bg-primary-50 p-2">
              <Icon className="text-primary" icon={icon} width={featured ? 28 : 24} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p
              className={cn(
                "font-semibold text-default-900",
                featured ? "text-large sm:text-xl" : "text-medium",
              )}
            >
              {title}
            </p>
            <p className={cn("text-default-500", featured ? "text-medium" : "text-small")}>
              {description}
            </p>
          </div>
          {featured && (
            <div className="mt-auto flex flex-col gap-2">
              {["Eliza character files", "Master turn control", "Live SSE stream"].map((line) => (
                <div
                  key={line}
                  className="flex min-h-[44px] items-center rounded-medium bg-content3 px-3 py-2 text-content3-foreground"
                >
                  <p className="text-small">{line}</p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    );
  },
);

BentoCard.displayName = "BentoCard";

export default BentoCard;
