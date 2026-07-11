"use client";

import React from "react";

export type ThemeMode = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: ThemeMode;
  resolved: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function applyLightTheme() {
  // Soft Structuralism UI is light-only — dark class makes text white on white cards
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("dark");
  root.classList.add("light");
  root.style.colorScheme = "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Product stays light; ignore dark/system to prevent white-on-white
  const setTheme = React.useCallback((theme: ThemeMode) => {
    void theme;
    applyLightTheme();
  }, []);

  // Apply once on the client without setState-in-effect
  React.useLayoutEffect(() => {
    applyLightTheme();
    try {
      localStorage.setItem("multimarkets-theme", "light");
    } catch {
      /* ignore */
    }
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme: "light",
      resolved: "light",
      setTheme,
    }),
    [setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
