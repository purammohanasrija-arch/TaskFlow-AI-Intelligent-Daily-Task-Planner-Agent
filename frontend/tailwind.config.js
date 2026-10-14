/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ivory: {
          50: '#FAF8F5',
          100: '#F5F2EB',
          200: '#EBE5D8',
          300: '#DED5C3',
          400: '#C8BB9E',
          500: '#B09E7B',
          600: '#8A7A5D',
          700: '#675A44',
          800: '#463D2E',
          900: '#2A241B',
        },
        brand: {
          primary: '#10B981', // Emerald
          primaryDark: '#059669',
          accent: '#F97316', // Coral/Orange
          purple: '#8B5CF6', // Lavender/Violet
          dark: '#0F172A',
          darkCard: '#1E293B',
          darkBorder: '#334155',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-hover': '0 12px 36px 0 rgba(31, 38, 135, 0.12)',
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
      }
    },
  },
  plugins: [],
}
