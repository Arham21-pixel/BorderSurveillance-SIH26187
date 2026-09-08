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
          bg: "#071011",
          panel: "#0D171B",
          panel2: "#111E23",
          line: "#203239",
          accent: "#19D3C5",
          normal: "#35D07F",
          suspicious: "#F2C94C",
          high: "#FF8A2A",
          critical: "#FF4D67",
          muted: "#8B9AA3",
          muted2: "#617079",
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
