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
        market: {
          orange: "#E8722A",
          brown: "#3D2B1F",
          cream: "#FDF6EC",
          green: "#2D7D46",
          red: "#D94452",
        },
      },
    },
  },
  plugins: [],
};
