import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        rr: {
          background: "var(--rr-color-background)",
          foreground: "var(--rr-color-foreground)",
          muted: "var(--rr-color-muted)",
          "text-primary": "var(--rr-color-text-primary)",
          "text-muted": "var(--rr-color-text-muted)",
          line: "var(--rr-color-line)",
          "soft-line": "var(--rr-color-soft-line)",
          border: "var(--rr-color-border)",
          surface: "var(--rr-color-surface)",
          elevated: "var(--rr-color-surface-elevated)",
          disabled: "var(--rr-color-disabled-surface)",
          aster: "var(--rr-color-aster)",
          success: "var(--rr-color-success)",
          error: "var(--rr-color-error)",
          correct: "var(--rr-color-correct)",
          incorrect: "var(--rr-color-incorrect)",
          warning: "var(--rr-color-warning)",
          info: "var(--rr-color-info)",
          "info-tint": "var(--rr-color-info-tint)",
          "info-border": "var(--rr-color-info-border)",
          repair: "var(--rr-color-repair)",
          mastery: "var(--rr-color-mastery)",
          observatory: "var(--rr-color-observatory-atmosphere)",
          focus: "var(--rr-color-focus)"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "Arial", "sans-serif"]
      },
      maxWidth: {
        practice: "45rem",
        tutor: "51.25rem",
        dashboard: "60rem",
        analytics: "65rem"
      },
      transitionDuration: {
        fast: "var(--rr-motion-fast)",
        standard: "var(--rr-motion-standard)",
        slow: "var(--rr-motion-slow)"
      },
      transitionTimingFunction: {
        standard: "var(--rr-ease-standard)"
      }
    }
  },
  plugins: []
};

export default config;
