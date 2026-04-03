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
        primary: {
          DEFAULT: "#F5C842",  // Goose yellow
          50: "#FFFBEA",
          100: "#FFF3C4",
          200: "#FCE589",
          300: "#FAD34D",
          400: "#F5C842",
          500: "#E0AC14",
          600: "#B8880D",
          700: "#8A640A",
          800: "#5C4207",
          900: "#2E2104",
        },
        secondary: {
          DEFAULT: "#4A90D9",  // Pond blue
          50: "#EBF4FF",
          100: "#CCE4FF",
          200: "#99C9FF",
          300: "#66ADFF",
          400: "#4A90D9",
          500: "#2D72BE",
          600: "#1F579A",
          700: "#164075",
          800: "#0D2A50",
          900: "#061428",
        },
        accent: {
          DEFAULT: "#5CB85C",  // Grass green
          50: "#EDFAED",
          100: "#D5F4D5",
          200: "#AAEAAA",
          300: "#7FDF7F",
          400: "#5CB85C",
          500: "#44A044",
          600: "#337833",
          700: "#225022",
          800: "#112811",
          900: "#051005",
        },
        background: {
          DEFAULT: "#1A1A2E",  // Dark background
          light: "#16213E",
          card: "#0F3460",
          surface: "#1E1E3A",
        },
        // Semantic
        success: "#5CB85C",
        warning: "#F5C842",
        error: "#E74C3C",
        info: "#4A90D9",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Nunito", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "waddle": "waddle 0.5s ease-in-out infinite alternate",
        "float": "float 3s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "bounce-soft": "bounceSoft 1s ease-in-out infinite",
      },
      keyframes: {
        waddle: {
          "0%": { transform: "rotate(-5deg)" },
          "100%": { transform: "rotate(5deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 5px #F5C842" },
          "50%": { boxShadow: "0 0 20px #F5C842, 0 0 40px #F5C842" },
        },
        bounceSoft: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      backgroundImage: {
        "gradient-waddle": "linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)",
        "gradient-primary": "linear-gradient(135deg, #F5C842 0%, #E0AC14 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
