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
          /*
           * Canonical public API:
           * use surface-*, semantic-*, text-*, and focus for new implementation.
           * Existing shorter keys remain as compatibility aliases for older components.
           */
          background: "var(--rr-color-background)",
          foreground: "var(--rr-color-foreground)",
          muted: "var(--rr-color-muted)",
          "text-primary": "var(--rr-color-text-primary)",
          "text-muted": "var(--rr-color-text-muted)",
          "text-secondary": "var(--rr-text-secondary)",
          "text-muted-canonical": "var(--rr-text-muted-canonical)",
          line: "var(--rr-color-line)",
          "soft-line": "var(--rr-color-soft-line)",
          border: "var(--rr-color-border)",
          "border-subtle": "var(--rr-surface-subtle-border)",
          surface: "var(--rr-color-surface)",
          "surface-background": "var(--rr-surface-background)",
          "surface-warm-background": "var(--rr-surface-warm-background)",
          "surface-card": "var(--rr-surface-card)",
          "surface-panel": "var(--rr-surface-elevated-canonical)",
          "surface-glass": "var(--rr-surface-glass)",
          elevated: "var(--rr-color-surface-elevated)",
          "surface-elevated-canonical": "var(--rr-surface-elevated-canonical)",
          "surface-recessed": "var(--rr-surface-recessed)",
          disabled: "var(--rr-color-disabled-surface)",
          accent: "var(--rr-color-accent)",
          aster: "var(--rr-color-aster)",
          success: "var(--rr-color-success)",
          error: "var(--rr-color-error)",
          recognition: "var(--rr-color-recognition)",
          "recognition-tint": "var(--rr-color-recognition-tint)",
          "recognition-border": "var(--rr-color-recognition-border)",
          reasoning: "var(--rr-color-reasoning)",
          comparison: "var(--rr-color-comparison)",
          memory: "var(--rr-color-memory)",
          pivot: "var(--rr-color-pivot)",
          clue: "var(--rr-color-clue)",
          takeaway: "var(--rr-color-takeaway)",
          correct: "var(--rr-color-correct)",
          incorrect: "var(--rr-color-incorrect)",
          warning: "var(--rr-color-warning)",
          info: "var(--rr-color-info)",
          "info-tint": "var(--rr-color-info-tint)",
          "info-border": "var(--rr-color-info-border)",
          repair: "var(--rr-color-repair)",
          mastery: "var(--rr-color-mastery)",
          observatory: "var(--rr-color-observatory-atmosphere)",
          focus: "var(--rr-color-focus)",
          "semantic-pattern": "var(--rr-semantic-pattern)",
          "semantic-pattern-bg": "var(--rr-semantic-pattern-bg)",
          "semantic-supporting": "var(--rr-semantic-supporting)",
          "semantic-supporting-bg": "var(--rr-semantic-supporting-bg)",
          "semantic-pivot": "var(--rr-semantic-pivot)",
          "semantic-pivot-bg": "var(--rr-semantic-pivot-bg)",
          "semantic-learner": "var(--rr-semantic-learner)",
          "semantic-learner-bg": "var(--rr-semantic-learner-bg)",
          "semantic-expert": "var(--rr-semantic-expert)",
          "semantic-expert-bg": "var(--rr-semantic-expert-bg)",
          "semantic-overlap": "var(--rr-semantic-overlap)",
          "semantic-overlap-bg": "var(--rr-semantic-overlap-bg)",
          "semantic-discriminator": "var(--rr-semantic-discriminator)",
          "semantic-discriminator-bg": "var(--rr-semantic-discriminator-bg)",
          "semantic-repair": "var(--rr-semantic-repair)",
          "semantic-repair-bg": "var(--rr-semantic-repair-bg)",
          "semantic-commit": "var(--rr-semantic-commit)",
          "semantic-noise": "var(--rr-semantic-noise)",
          "semantic-noise-bg": "var(--rr-semantic-noise-bg)"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "Arial", "sans-serif"]
      },
      fontSize: {
        "rr-display": [
          "var(--rr-type-display-size)",
          { lineHeight: "var(--rr-type-display-line-height)", fontWeight: "var(--rr-type-display-weight)" }
        ],
        "rr-title": [
          "var(--rr-type-title-size)",
          { lineHeight: "var(--rr-type-title-line-height)", fontWeight: "var(--rr-type-title-weight)" }
        ],
        "rr-headline": [
          "var(--rr-type-headline-size)",
          { lineHeight: "var(--rr-type-headline-line-height)", fontWeight: "var(--rr-type-headline-weight)" }
        ],
        "rr-section-label": [
          "var(--rr-type-section-label-size)",
          {
            lineHeight: "var(--rr-type-section-label-line-height)",
            fontWeight: "var(--rr-type-section-label-weight)",
            letterSpacing: "var(--rr-type-section-label-tracking)"
          }
        ],
        "rr-body": [
          "var(--rr-type-body-size)",
          { lineHeight: "var(--rr-type-body-line-height)", fontWeight: "var(--rr-type-body-weight)" }
        ],
        "rr-metadata": [
          "var(--rr-type-metadata-size)",
          { lineHeight: "var(--rr-type-metadata-line-height)", fontWeight: "var(--rr-type-metadata-weight)" }
        ],
        "rr-caption": [
          "var(--rr-type-caption-size)",
          { lineHeight: "var(--rr-type-caption-line-height)", fontWeight: "var(--rr-type-caption-weight)" }
        ],
        "rr-chip": [
          "var(--rr-type-chip-size)",
          { lineHeight: "var(--rr-type-chip-line-height)", fontWeight: "var(--rr-type-chip-weight)" }
        ],
        "rr-button": [
          "var(--rr-type-button-size)",
          { lineHeight: "var(--rr-type-button-line-height)", fontWeight: "var(--rr-type-button-weight)" }
        ]
      },
      spacing: {
        "rr-4": "var(--rr-space-4)",
        "rr-8": "var(--rr-space-8)",
        "rr-12": "var(--rr-space-12)",
        "rr-16": "var(--rr-space-16)",
        "rr-20": "var(--rr-space-20)",
        "rr-24": "var(--rr-space-24)",
        "rr-32": "var(--rr-space-32)",
        "rr-40": "var(--rr-space-40)",
        "rr-48": "var(--rr-space-48)",
        "rr-64": "var(--rr-space-64)"
      },
      borderRadius: {
        "rr-xs": "var(--rr-radius-token-xs)",
        "rr-sm": "var(--rr-radius-token-sm)",
        "rr-md": "var(--rr-radius-token-md)",
        "rr-lg": "var(--rr-radius-token-lg)",
        "rr-xl": "var(--rr-radius-token-xl)",
        "rr-pill": "var(--rr-radius-token-pill)"
      },
      boxShadow: {
        "rr-elevation-0": "var(--rr-elevation-0)",
        "rr-elevation-1": "var(--rr-elevation-1)",
        "rr-elevation-2": "var(--rr-elevation-2)",
        "rr-elevation-3": "var(--rr-elevation-3)",
        "rr-elevation-4": "var(--rr-elevation-4)",
        "rr-glass-sm": "var(--rr-shadow-glass-sm)",
        "rr-glass-md": "var(--rr-shadow-glass-md)",
        "rr-glass-lg": "var(--rr-shadow-glass-lg)"
      },
      backdropBlur: {
        "rr-card": "var(--rr-glass-blur-card)",
        "rr-dock": "var(--rr-glass-blur-dock)",
        "rr-popover": "var(--rr-glass-blur-popover)"
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
        standard: "var(--rr-ease-standard)",
        emphasized: "var(--rr-ease-emphasized)"
      }
    }
  },
  plugins: []
};

export default config;
