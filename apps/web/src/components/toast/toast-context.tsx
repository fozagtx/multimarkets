"use client";

import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Icon } from "@iconify/react";
import { cn } from "@heroui/react";

export type ToastTone = "default" | "success" | "danger" | "warning" | "primary";

export type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
  icon?: string;
};

type ToastItem = ToastInput & {
  id: string;
  tone: ToastTone;
  duration: number;
};

type ToastContextValue = {
  toast: (input: ToastInput | string) => string;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

let externalToast: ToastContextValue["toast"] | null = null;

/** Call from anywhere after provider mounts */
export function toast(input: ToastInput | string) {
  if (!externalToast) {
    console.warn("[toast] ToastProvider not mounted yet");
    return "";
  }
  return externalToast(input);
}

const toneStyles: Record<
  ToastTone,
  { bar: string; icon: string; iconName: string; ring: string }
> = {
  default: {
    bar: "bg-default-400",
    icon: "text-default-500",
    iconName: "solar:info-circle-bold",
    ring: "border-default-200",
  },
  success: {
    bar: "bg-success",
    icon: "text-success",
    iconName: "solar:check-circle-bold",
    ring: "border-success/30",
  },
  danger: {
    bar: "bg-danger",
    icon: "text-danger",
    iconName: "solar:danger-circle-bold",
    ring: "border-danger/30",
  },
  warning: {
    bar: "bg-warning",
    icon: "text-warning",
    iconName: "solar:danger-triangle-bold",
    ring: "border-warning/30",
  },
  primary: {
    bar: "bg-primary",
    icon: "text-primary",
    iconName: "solar:bolt-circle-bold",
    ring: "border-primary/30",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const reduce = useReducedMotion() ?? false;

  const dismiss = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = React.useCallback(
    (input: ToastInput | string) => {
      const payload: ToastInput = typeof input === "string" ? { title: input } : input;
      const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const item: ToastItem = {
        id,
        title: payload.title,
        description: payload.description,
        tone: payload.tone ?? "default",
        duration: payload.duration ?? 3600,
        icon: payload.icon,
      };
      setItems((prev) => [item, ...prev].slice(0, 5));
      if (item.duration > 0) {
        window.setTimeout(() => dismiss(id), item.duration);
      }
      return id;
    },
    [dismiss],
  );

  React.useEffect(() => {
    externalToast = push;
    return () => {
      externalToast = null;
    };
  }, [push]);

  const value = React.useMemo(() => ({ toast: push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:right-4 sm:items-end sm:top-4"
      >
        <AnimatePresence mode="popLayout">
          {items.map((item) => {
            const style = toneStyles[item.tone];
            return (
              <motion.div
                key={item.id}
                layout
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reduce
                    ? { opacity: 0 }
                    : { opacity: 0, y: -8, scale: 0.96, transition: { duration: 0.15 } }
                }
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className={cn(
                  "pointer-events-auto relative flex w-full max-w-sm overflow-hidden rounded-2xl border bg-content1 shadow-large",
                  style.ring,
                )}
              >
                <span className={cn("w-1 shrink-0", style.bar)} />
                <div className="flex flex-1 items-start gap-3 px-3.5 py-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-content2",
                      style.icon,
                    )}
                  >
                    <Icon icon={item.icon ?? style.iconName} width={18} />
                  </span>
                  <div className="min-w-0 flex-1 pr-6">
                    <p className="text-small font-semibold text-default-800">{item.title}</p>
                    {item.description ? (
                      <p className="mt-0.5 text-tiny leading-relaxed text-default-500">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label="Dismiss"
                    onClick={() => dismiss(item.id)}
                    className="absolute right-2 top-2 rounded-full p-1 text-default-400 motion-safe:transition-colors motion-safe:duration-150 hover:bg-default-100 hover:text-default-700 active:scale-95"
                  >
                    <Icon icon="solar:close-circle-linear" width={16} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
