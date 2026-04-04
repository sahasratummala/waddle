import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Waddle brand palette
        cream:   "#E5DECA",
        ocean:   "#7E9DA2",
        avocado: "#898433",
        olive:   "#45441A",
        forest:  "#282C15",

        primary: {
          DEFAULT: "#898433",  // Avocado
          50:  "#F5F4E8",
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
          DEFAULT: "#7E9DA2",  // Ocean Blue
          50:  "#EEF4F5",
          100: "#D5E5E8",
          200: "#ABCBD1",
          300: "#7E9DA2",  // ← base
          400: "#6A8A90",
          500: "#56777D",
          600: "#42646A",
          700: "#2E4E54",
          800: "#1E3539",
          900: "#0F1B1D",
        },
        background: {
          DEFAULT: "#282C15",  // Dark Green
          card:    "#45441A",  // Olive
          surface: "#343618",  // between olive & forest
          muted:   "#3A3C1C",
        },

        // Semantic aliases
        success: "#7E9DA2",
        warning: "#898433",
        error:   "#C0392B",
        info:    "#7E9DA2",
      },
      textColor: {
        DEFAULT: "#E5DECA",
      },
      fontFamily: {
        sans:    ["Inter", "system-ui", "sans-serif"],
        display: ["Nunito", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "waddle":       "waddle 0.5s ease-in-out infinite alternate",
        "float":        "float 3s ease-in-out infinite",
        "pulse-glow":   "pulseGlow 2s ease-in-out infinite",
        "bounce-soft":  "bounceSoft 1s ease-in-out infinite",
      },
      keyframes: {
        waddle: {
          "0%":   { transform: "rotate(-5deg)" },
          "100%": { transform: "rotate(5deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-10px)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 5px #898433" },
          "50%":      { boxShadow: "0 0 20px #898433, 0 0 40px #45441A" },
        },
        bounceSoft: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-6px)" },
        },
      },
      backgroundImage: {
        "gradient-waddle":  "linear-gradient(135deg, #282C15 0%, #45441A 60%, #343618 100%)",
        "gradient-primary": "linear-gradient(135deg, #898433 0%, #6E6A28 100%)",
        "gradient-ocean":   "linear-gradient(135deg, #7E9DA2 0%, #56777D 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
