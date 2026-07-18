/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./**/*.html",
    "./assets/js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)"
        },
        surface: {
          DEFAULT: "var(--color-bg-primary)",
          secondary: "var(--color-bg-secondary)",
          card: "var(--color-bg-card)",
        },
        content: "var(--color-text)",
        muted: "var(--color-text-muted)",
        accent: "var(--color-accent)"
      }
    },
  },
  plugins: [],
  darkMode: ['class', '[data-theme="dark"]'],
}
