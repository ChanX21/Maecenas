import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#050503",
        "ink-2": "#080704",
        panel: "#11100b",
        "panel-2": "#15130e",
        gold: "#f2c14e",
        "gold-soft": "#d9a92f",
        "gold-deep": "#8f6b1f",
        cream: "#f4efe2",
        muted: "#8f8a7c",
        dim: "#5d584d",
        success: "#75c78a",
        danger: "#d96c5f"
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(242,193,78,0.16), 0 24px 80px rgba(0,0,0,0.45)"
      }
    }
  },
  plugins: []
};

export default config;
