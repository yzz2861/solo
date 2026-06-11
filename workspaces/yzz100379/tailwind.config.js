/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./shared/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {},
  },
  plugins: [],
};
