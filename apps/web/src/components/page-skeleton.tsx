/**
 * Soft Structuralism page skeleton — used by route loading.tsx files
 */

import { cn } from "@/lib/cn";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-black/[0.06]",
        className,
      )}
    />
  );
}

export type PageSkeletonProps = {
  /** denser card grid (markets / arenas) */
  variant?: "list" | "form" | "detail";
  className?: string;
};

export default function PageSkeleton({
  variant = "list",
  className,
}: PageSkeletonProps) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl", className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Bone className="h-5 w-24 rounded-full" />
          <Bone className="h-9 w-56 sm:w-72" />
          <Bone className="h-4 w-72 max-w-full sm:w-96" />
        </div>
        <Bone className="h-10 w-28 rounded-full" />
      </div>

      {variant === "form" && (
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <Bone className="h-28 w-full rounded-2xl" />
            <Bone className="h-28 w-full rounded-2xl" />
            <Bone className="h-28 w-full rounded-2xl" />
          </div>
          <Bone className="h-[28rem] w-full rounded-3xl" />
        </div>
      )}

      {variant === "detail" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Bone className="hidden h-[32rem] rounded-2xl lg:col-span-3 lg:block" />
          <Bone className="h-[min(52vh,520px)] rounded-2xl lg:col-span-6" />
          <div className="flex flex-col gap-3 lg:col-span-3">
            <Bone className="h-48 rounded-2xl" />
            <Bone className="h-36 rounded-2xl" />
          </div>
        </div>
      )}

      {variant === "list" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_12px_40px_-16px_rgba(20,20,43,0.08)]"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <Bone className="h-5 w-3/5" />
                <Bone className="h-5 w-14 rounded-full" />
              </div>
              <Bone className="mb-2 h-3.5 w-full" />
              <Bone className="mb-4 h-3.5 w-4/5" />
              <div className="flex justify-between">
                <Bone className="h-3.5 w-24" />
                <Bone className="h-3.5 w-12" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
