/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './docs/.vitepress/**/*.{js,ts,vue}',
    './docs/**/*.md',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ustc: {
          DEFAULT: '#004191',
          light: '#1a5ba3',
          dark: '#002f6c'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    }
  },
  plugins: [],
}
