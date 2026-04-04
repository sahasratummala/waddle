import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#E5DECA",
        ocean: "#7E9DA2",
        avocado: "#898433",
        olive: "#45441A",
        forest: "#282C15",
        primary: {
          DEFAULT: "#898433",
          50: "#F5F4E8",
          100: "#E8E6C8",
          200: "#CFCB93",
          300: "#B6B060",
          400: "#898433",
          500: "#6E6A28",
          600: "#555220",
          700: "#3D3A17",
          800: "#28270F",
          900: "#141308",
        },
        secondary: {
          DEFAULT: "#7E9DA2",
          50: "#EEF4F5",
          100: "#D5E5E8",
          200: "#ABCBD1",
          300: "#7E9DA2",
          400: "#6A8A90",
          500: "#56777D",
          600: "#42646A",
          700: "#2E4E54",
          800: "#1E3539",
          900: "#0F1B1D",
        },
        background: {
          DEFAULT: "#E5DECA",
          card: "#ffffff",
          surface: "#F5F2EA",
          muted: "#EDE8DC",
          light: "#ffffff",
        },
        accent: "#7E9DA2",
        success: "#7E9DA2",
        warning: "#898433",
        error: "#C0392B",
        info: "#7E9DA2",
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Nunito", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "1rem",
        md: "0.75rem",
        sm: "0.5rem",
      },
      boxShadow: {
        card: "0 2px 12px rgb(40 44 21 / 0.08)",
        "card-hover": "0 4px 20px rgb(40 44 21 / 0.12)",
      },
      animation: {
        "float": "float 3s ease-in-out infinite",
        "bounce-soft": "bounceSoft 1s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        bounceSoft: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;