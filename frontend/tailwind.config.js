/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Warm Neutrals - Primary Palette (WhatsApp inspired)
        primary: {
          50: "#faf9f7",
          100: "#f4f1ed",
          200: "#e8e3db",
          300: "#ddd4c9",
          400: "#c9b8a8",
          500: "#b5a697",
          600: "#9d8d7e",
          700: "#857567",
          800: "#6d5f52",
          900: "#56483f",
        },
        // Warm Green/Teal - Secondary (Chat highlights)
        accent: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#25c970",
          600: "#1ab85c",
          700: "#16a34a",
          800: "#15803d",
          900: "#166534",
        },
        // Neutral tones
        slate: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e7e7e7",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
        },
      },
      borderRadius: {
        xs: "0.5rem",
        sm: "0.75rem",
        md: "0.875rem",
        lg: "1rem",
        xl: "1.125rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
        full: "9999px",
      },
      fontSize: {
        xs: ["11px", { lineHeight: "14px" }],
        sm: ["13px", { lineHeight: "18px" }],
        base: ["14px", { lineHeight: "20px" }],
        lg: ["16px", { lineHeight: "24px" }],
        xl: ["18px", { lineHeight: "26px" }],
        "2xl": ["20px", { lineHeight: "28px" }],
        "3xl": ["24px", { lineHeight: "32px" }],
        "4xl": ["30px", { lineHeight: "38px" }],
      },
      fontFamily: {
        sans: [
          "Inter",
          "SF Pro Display",
          "system-ui",
          "sans-serif",
        ],
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
      },
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "10px",
        xl: "14px",
        "2xl": "18px",
        "3xl": "24px",
      },
      boxShadow: {
        glass: "0 6px 24px rgba(15, 23, 42, 0.06)",
        "glass-lg": "0 10px 28px rgba(15, 23, 42, 0.08)",
        "glass-xl": "0 14px 36px rgba(15, 23, 42, 0.10)",
        subtle: "0 1px 2px rgba(15, 23, 42, 0.04)",
        smooth: "0 4px 12px rgba(15, 23, 42, 0.06)",
        elevated: "0 10px 30px rgba(15, 23, 42, 0.10)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "mesh-light":
          "radial-gradient(at 40% 20%, rgba(37, 201, 112, 0.12) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(255, 184, 108, 0.10) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(255, 255, 255, 0.08) 0px, transparent 50%)",
        "mesh-dark":
          "radial-gradient(at 40% 20%, rgba(37, 201, 112, 0.18) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(255, 184, 108, 0.12) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(20, 20, 20, 0.35) 0px, transparent 50%)",
      },
      animation: {
        "slide-in": "slideIn 0.3s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        "bounce-light": "bounceLight 2s infinite",
        "pulse-soft": "pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 7s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateX(-10px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        bounceLight: {
          "0%, 100%": { transform: "translateY(-2px)" },
          "50%": { transform: "translateY(2px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        float: {
          "0%, 100%": {
            transform: "translateY(0px)",
          },
          "50%": {
            transform: "translateY(-2px)",
          },
        },
        shimmer: {
          "0%": {
            backgroundPosition: "-200% 0",
          },
          "100%": {
            backgroundPosition: "200% 0",
          },
        },
      },
      transitionDuration: {
        fast: "150ms",
        base: "180ms",
        slow: "240ms",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms")({
      strategy: "class",
    }),
  ],
};
