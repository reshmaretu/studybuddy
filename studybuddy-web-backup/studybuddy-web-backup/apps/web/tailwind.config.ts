import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          dark: "var(--bg-dark)",
          sidebar: "var(--bg-sidebar)",
          card: "var(--bg-card)",
        },
        border: "var(--border-color)",
        text: {
          main: "var(--text-main)",
          muted: "var(--text-muted)",
        },
        accent: {
          teal: "var(--accent-teal)",
          cyan: "var(--accent-cyan)",
          yellow: "var(--accent-yellow)",
        },
      },
    },
  },
  plugins: [],
};
export default config;