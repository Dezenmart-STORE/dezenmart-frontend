// @type {import('tailwindcss').Config} 
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Background: linear-gradient("#ff0000", "#6b0505"),
        Dark: "#212428",
        Red: "#ff343f",
      },
      flex: {
        full: "0 0 100%",
      },
    },
  },
  plugins: [],
}