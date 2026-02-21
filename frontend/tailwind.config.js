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
        "primary": "#135bec",
        "primary-light": "#eef4ff",
        "primary-dark": "#0d43b3",
        "background-light": "#f6f6f8",
        "background-dark": "#101622",
        "slate-850": "#151e2e",
      },
      fontFamily: {
        "display": ["Public Sans", "sans-serif"],
        "sans": ["Public Sans", "sans-serif"],
        "mono": ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "full": "9999px"
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
