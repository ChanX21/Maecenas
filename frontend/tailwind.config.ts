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
        ink: "#090b0a",
        "ink-2": "#101311",
        panel: "#151815",
        "panel-2": "#1b1f1c",
        gold: "#8dd8a8",
        "gold-soft": "#c8f0d5",
        "gold-deep": "#47785a",
        bronze: "#b8b2a8",
        marble: "#e3e7e2",
        cream: "#f3f4ef",
        muted: "#a5aca6",
        dim: "#69716b",
        success: "#75c78a",
        danger: "#e4776b"
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(141,216,168,0.28)"
      }
    }
  },
  plugins: []
};

export default config;
