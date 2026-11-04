/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        campus: {
          navy: '#0f172a',
          indigo: '#4f46e5',
          blue: '#1e40af',
          light: '#f8fafc',
          card: '#ffffff',
          accent: '#06b6d4'
        }
      }
    },
  },
  plugins: [],
}

