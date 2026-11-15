/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        inferno: {
          dark: '#000004',
          purple: '#420a68',
          magenta: '#932667',
          red: '#dd513a',
          orange: '#fca50a',
          yellow: '#fcffa4'
        }
      }
    },
  },
  plugins: [],
}
