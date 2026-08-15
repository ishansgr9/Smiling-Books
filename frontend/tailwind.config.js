/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#e5d1cb',
          300: '#d4b3aa',
          400: '#ba8f82',
          500: '#a17162',
          600: '#8e5d4e',
          700: '#764c3f',
          800: '#634035',
          900: '#52372e',
          950: '#2c1c17',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Outfit', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
