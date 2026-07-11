import type { Config } from "tailwindcss";
import { heroui } from "@heroui/react";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        mm: {
          primary: "#5B7CFA",
          secondary: "#7C6CF5",
          accent: "#00C2A8",
          highlight: "#FFC857",
          surface: "#F7F9FC",
          card: "#FFFFFF",
          text: "#111111",
          muted: "#6B7280",
          border: "#E6EAF2",
        },
      },
      maxWidth: {
        lp: "1280px",
      },
      borderRadius: {
        hero: "36px",
        card: "24px",
        badge: "14px",
      },
      boxShadow: {
        soft: "0 20px 60px rgba(20,20,43,0.08)",
        "soft-lg": "0 28px 70px rgba(20,20,43,0.12)",
      },
      backgroundImage: {
        "lp-gradient": "linear-gradient(165deg, #88A9FF 0%, #6F92F5 100%)",
        "hero-section-title":
          "linear-gradient(91deg, #111111 0%, #111111 55%, rgba(17,17,17,0.55) 100%)",
      },
      keyframes: {
        "scrolling-banner": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-50% - var(--gap) / 2))" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "scrolling-banner": "scrolling-banner var(--duration) linear infinite",
        float: "float 6s ease-in-out infinite",
        rise: "rise 0.7s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            background: "#F7F9FC",
            foreground: "#111111",
            primary: {
              DEFAULT: "#5B7CFA",
              foreground: "#FFFFFF",
            },
            focus: "#5B7CFA",
            content1: "#FFFFFF",
            content2: "#F0F3F9",
            content3: "#E6EAF2",
            content4: "#D8DEEA",
            secondary: {
              DEFAULT: "#7C6CF5",
              foreground: "#FFFFFF",
            },
            success: {
              DEFAULT: "#00C2A8",
              foreground: "#FFFFFF",
            },
          },
        },
        dark: {
          colors: {
            background: "#0B0D14",
            foreground: "#ECEDEE",
            primary: {
              DEFAULT: "#5B7CFA",
              foreground: "#FFFFFF",
            },
            focus: "#5B7CFA",
            content1: "#12151F",
            content2: "#1A1E2B",
            content3: "#242836",
            content4: "#2E3344",
            secondary: {
              DEFAULT: "#7C6CF5",
              foreground: "#FFFFFF",
            },
            success: {
              DEFAULT: "#00C2A8",
              foreground: "#0A0A0A",
            },
          },
        },
      },
    }),
  ],
};

export default config;
