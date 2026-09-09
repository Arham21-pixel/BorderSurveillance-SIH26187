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
        netra: {
          bg: "#070B12",
          card: "#0C141C",
          card2: "#101A24",
          line: "#1A343C",
          text: "#F4F8FA",
          muted: "#8B9AA6",
          muted2: "#64727A",
          accent: "#26E5E5",
          normal: "#35D07F",
          suspicious: "#F2C94C",
          high: "#FF922E",
          critical: "#FF4D67",
        },
        sentinel: {
          bg: "#070B12",
          panel: "#0C141C",
          panel2: "#101A24",
          line: "#1A343C",
          accent: "#26E5E5",
          normal: "#35D07F",
          suspicious: "#F2C94C",
          high: "#FF922E",
          critical: "#FF4D67",
          muted: "#8B9AA6",
          muted2: "#64727A",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["Outfit", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["'JetBrains Mono'", "Courier New", "monospace"],
        netra: ["Outfit", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        panel: "16px",
      },
      boxShadow: {
        panel: "0 18px 40px -18px rgba(0,0,0,0.65), 0 0 32px -16px rgba(38,229,229,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
        glow: "0 0 24px -6px rgba(38,229,229,0.45)",
      },
    },
  },
  plugins: [],
};
