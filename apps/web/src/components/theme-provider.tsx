"use client";

import React from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "multimarkets-theme";

type ThemeContextValue = {
  theme: ThemeMode;
  resolved: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function applyTheme(_resolved: "light" | "dark") {
  // Soft Structuralism UI is light-only — dark class makes text white on white cards
  const root = document.documentElement;
  root.classList.remove("dark");
  root.classList.add("light");
  root.style.colorScheme = "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeMode>("light");
  const [resolved] = React.useState<"light" | "dark">("light");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setThemeState("light");
    setMounted(true);
    applyTheme("light");
    localStorage.setItem(STORAGE_KEY, "light");
    localStorage.removeItem("personapit-theme");
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    applyTheme("light");
    localStorage.setItem(STORAGE_KEY, "light");
  }, [theme, mounted]);

  const setTheme = React.useCallback((_value: ThemeMode) => {
    // Product stays light; ignore dark/system to prevent white-on-white
    setThemeState("light");
    applyTheme("light");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
