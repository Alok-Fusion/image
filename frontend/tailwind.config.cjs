/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#09111a",
        mist: "#dce8f4",
        flare: "#ffb84d",
        signal: "#73f0ff",
        ember: "#ff7b54",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(115, 240, 255, 0.2), 0 24px 80px rgba(9, 17, 26, 0.35)",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'IBM Plex Sans'", "sans-serif"],
      },
    },
  },
  plugins: [],
};

