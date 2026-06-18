/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1B2A4A',
          light: '#243560',
          dark: '#0F1A30',
        },
        amber: {
          DEFAULT: '#E8A838',
          light: '#F0C060',
          dark: '#C08820',
        },
        teal: {
          DEFAULT: '#5BC0BE',
          light: '#7DD8D6',
        },
        canvas: {
          DEFAULT: '#F5F5F0',
          dark: '#1A1A2E',
        },
        danger: '#E85454',
        success: '#4CAF50',
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['DM Sans', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
