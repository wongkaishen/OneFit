import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FAF6F0",
        "cream-deep": "#F2ECE1",
        paper: "#FFFFFF",
        charcoal: "#1F1D1B",
        "charcoal-deep": "#2D2A26",
        "warm-red": "#B94838",
        coral: "#E85D4A",
        "coral-soft": "#FBE7E2",
        muted: "#8A857D",
        subtle: "#5C5852",
        border: "#E2DBCD",
        "border-strong": "#D2C9B8",
        good: "#1F8A5B",
        "good-border": "#BFE0CC",
        "good-soft": "#E7F2EC",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-garamond)", "Georgia", "serif"],
      },
      letterSpacing: { label: "1.5px", button: "2px" },
      boxShadow: {
        card: "0 1px 2px rgba(31,29,27,0.04), 0 6px 20px -12px rgba(31,29,27,0.14)",
        raised: "0 2px 6px rgba(31,29,27,0.06), 0 14px 34px -16px rgba(31,29,27,0.22)",
        pop: "0 10px 40px -12px rgba(31,29,27,0.30)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: { "fade-in": "fade-in 0.25s ease-out both" },
    },
  },
  plugins: [],
};
export default config;
