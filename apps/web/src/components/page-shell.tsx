"use client";

import React from "react";
import { cn } from "@heroui/react";

type PageShellProps = {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
  wide?: boolean;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

/**
 * Consistent app page frame: same horizontal padding + vertical rhythm everywhere.
 */
export default function PageShell({
  children,
  className,
  narrow,
  wide,
  title,
  subtitle,
  actions,
}: PageShellProps) {
  return (
    <div
      className={cn(
        "mm-page",
        narrow && "mm-page-narrow",
        wide && "mm-page-wide",
        className,
      )}
    >
      {(title || actions) && (
        <header
          className="flex flex-wrap items-end justify-between gap-4"
          style={{ marginBottom: "var(--mm-header)" }}
        >
          <div className="min-w-0">
            {title ? <h1 className="mm-title">{title}</h1> : null}
            {subtitle ? <p className="mm-subtitle">{subtitle}</p> : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>
          ) : null}
        </header>
      )}
      {children}
    </div>
  );
}
