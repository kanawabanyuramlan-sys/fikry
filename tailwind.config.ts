import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // legacy names remapped onto the Linen & Moss tokens (see src/app/tokens.css)
        brand: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          dark: "oklch(var(--accent-deep) / <alpha-value>)",
          lime: "oklch(var(--sage) / <alpha-value>)",
          light: "oklch(var(--accent-soft) / <alpha-value>)",
          off: "oklch(var(--surface) / <alpha-value>)",
        },
        ink: { DEFAULT: "oklch(var(--ink) / <alpha-value>)", soft: "oklch(var(--ink-soft) / <alpha-value>)" },
        paper: "oklch(var(--paper) / <alpha-value>)",
        card: "oklch(var(--card) / <alpha-value>)",
        surface: { DEFAULT: "oklch(var(--surface) / <alpha-value>)", 2: "oklch(var(--surface-2) / <alpha-value>)" },
        rule: "oklch(var(--rule) / <alpha-value>)",
        sale: "oklch(var(--sale) / <alpha-value>)",
        warn: { DEFAULT: "oklch(var(--warn) / <alpha-value>)", soft: "oklch(var(--warn-soft) / <alpha-value>)" },
      },
      fontFamily: {
        serif: ["\"Instrument Serif\"", "Georgia", "serif"],
        sans: ["\"Plus Jakarta Sans\"", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px oklch(25% 0.01 70 / .04), 0 10px 30px -18px oklch(25% 0.01 70 / .18)",
        lift: "0 2px 6px oklch(25% 0.01 70 / .05), 0 24px 48px -24px oklch(25% 0.01 70 / .28)",
      },
      borderRadius: { "4xl": "2rem" },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
      animation: {
        "fade-up": "fade-up .45s cubic-bezier(.2,.7,.2,1) both",
        marquee: "marquee 40s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
