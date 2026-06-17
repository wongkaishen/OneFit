import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FAF6F0",
        charcoal: "#1F1D1B",
        "charcoal-deep": "#2D2A26",
        "warm-red": "#B94838",
        coral: "#E85D4A",
        muted: "#8A857D",
        subtle: "#5C5852",
        border: "#D8D0C2",
        good: "#1F8A5B",
        "good-border": "#BFE0CC",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-garamond)", "Georgia", "serif"],
      },
      letterSpacing: { label: "1.5px", button: "2px" },
    },
  },
  plugins: [],
};
export default config;
