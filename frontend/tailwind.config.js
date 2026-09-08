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
          bg: "#080D11",
          panel: "#101820",
          panel2: "#141E28",
          line: "#1F2B38",
          accent: "#20D5C5",
          emerald: "#39D98A",
          critical: "#ff4d4d",
          high: "#ff5a5a",
          medium: "#f5b942",
          low: "#39D98A",
          muted: "#94a3b8",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["'JetBrains Mono'", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
