import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        zambian: {
          green: {
            50: "#f0fdf4",
            100: "#dcfce7",
            200: "#bbf7d0",
            300: "#86efac",
            400: "#4ade80",
            500: "#198754",
            600: "#157347",
            700: "#0f5132",
            800: "#0a3622",
            900: "#052e16",
          },
          copper: {
            50: "#fdf4ef",
            100: "#fbe6d4",
            200: "#f5c9a8",
            300: "#eda56e",
            400: "#e8883f",
            500: "#b8602a",
            600: "#9c4a1e",
            700: "#7d3718",
            800: "#652d16",
            900: "#4a2010",
          },
          orange: {
            50: "#fff7ed",
            100: "#ffedd5",
            200: "#fed7aa",
            300: "#fdba74",
            400: "#fb923c",
            500: "#f97316",
            600: "#ea580c",
            700: "#c2410c",
            800: "#9a3412",
            900: "#7c2d12",
          },
        },
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#198754",
          600: "#157347",
          700: "#0f5132",
          800: "#0a3622",
          900: "#052e16",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
