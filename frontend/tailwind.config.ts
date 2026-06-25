import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./api.ts",
    "./types.ts"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#030201",
        "ink-2": "#080604",
        panel: "#120e09",
        "panel-2": "#191208",
        gold: "#d8cfbf",
        "gold-soft": "#efe4cf",
        "gold-deep": "#8d8274",
        bronze: "#b8afa2",
        marble: "#d8cfbf",
        cream: "#efe4cf",
        muted: "#9b9182",
        dim: "#62584b",
        success: "#75c78a",
        danger: "#d96c5f"
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(216,207,191,0.22), 0 24px 80px rgba(0,0,0,0.45)"
      }
    }
  },
  plugins: []
};

export default config;
