import type { Config } from "tailwindcss";

/**
 * A takeaway should look appetising, not administrative.
 *
 * Warm paper rather than white, a tomato red that carries the brand, a deep
 * green that means halal and "ready", and an amber for anything in progress.
 * Colour still means something — it is just no longer only ever grey.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#FBF7F0",
        card: "#FFFFFF",
        surface: "#F5EFE4",
        line: { DEFAULT: "#E9DECD", strong: "#D6C6AC" },
        ink: { DEFAULT: "#241C16", soft: "#6B5D4F", muted: "#A0917F" },

        brand: {
          50: "#FEF3F0", 100: "#FDE4DC", 200: "#FAC6B6",
          400: "#EE7C5C", 500: "#E1543A", 600: "#C63F28",
          700: "#A23120", DEFAULT: "#E1543A",
        },
        accent: { DEFAULT: "#1E6F5C", bg: "#E4F0EB" },
        ok: { DEFAULT: "#2F7D4F", bg: "#E3F2E7" },
        warn: { DEFAULT: "#B26A08", bg: "#FCEFD8" },
        bad: { DEFAULT: "#C23A2B", bg: "#FBE7E3" },
        sun: { DEFAULT: "#E9A23B", bg: "#FDF1DC" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
      },
      boxShadow: {
        // Warm shadows. A grey shadow on a warm page looks like dirt.
        soft: "0 1px 2px rgba(80, 54, 34, 0.05), 0 8px 24px -12px rgba(80, 54, 34, 0.18)",
        lift: "0 2px 4px rgba(80, 54, 34, 0.06), 0 18px 36px -18px rgba(80, 54, 34, 0.32)",
      },
      backgroundImage: {
        "warm-glow": "radial-gradient(60% 55% at 50% 0%, #FDE4DC 0%, #FBF7F0 62%)",
        "brand-fade": "linear-gradient(135deg, #E1543A 0%, #E9A23B 100%)",
      },
      keyframes: {
        rise: { "0%": { opacity: "0", transform: "translateY(10px)" },
                "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: { rise: "rise 0.4s ease-out both" },
    },
  },
  plugins: [],
} satisfies Config;
