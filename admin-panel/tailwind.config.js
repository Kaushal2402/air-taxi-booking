/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand tokens — overridden per deployment via CSS variables
        primary: {
          50: "var(--color-primary-50, #eff6ff)",
          100: "var(--color-primary-100, #dbeafe)",
          500: "var(--color-primary-500, #3b82f6)",
          600: "var(--color-primary-600, #2563eb)",
          700: "var(--color-primary-700, #1d4ed8)",
          900: "var(--color-primary-900, #1e3a8a)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

