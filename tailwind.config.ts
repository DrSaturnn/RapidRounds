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
          line: "var(--rr-color-line)",
          "soft-line": "var(--rr-color-soft-line)",
          surface: "var(--rr-color-surface)",
          success: "var(--rr-color-success)",
          error: "var(--rr-color-error)",
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
