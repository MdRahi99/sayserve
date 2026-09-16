import type { Config } from "tailwindcss";

/**
 * The palette from the wireframes, so what was drawn and what ships match.
 * Colour carries meaning only: required, warning, sold out. The rest is
 * paper and ink.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#EFEEE9",
        card: "#FFFFFF",
        surface: "#F6F5F1",
        line: { DEFAULT: "#E1DFD8", strong: "#C9C7BF" },
        ink: { DEFAULT: "#1F1E1C", soft: "#6B6A65", muted: "#9D9B95" },
        accent: { DEFAULT: "#185FA5", bg: "#E6F1FB" },
        ok: { DEFAULT: "#3B6D11", bg: "#EAF3DE" },
        warn: { DEFAULT: "#854F0B", bg: "#FAEEDA" },
        bad: { DEFAULT: "#A32D2D", bg: "#FCEBEB" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
