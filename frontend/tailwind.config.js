/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        sentinel: {
          bg: "#070b10",
          panel: "#101820",
          panel2: "#16202b",
          line: "#243140",
          accent: "#3dd6c6",
          high: "#ff5a5a",
          medium: "#f5b942",
          low: "#5ad67a",
          muted: "#8fa3b8",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
