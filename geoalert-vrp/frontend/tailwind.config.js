/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        coer: {
          900: '#0B132B',
          800: '#1C2541',
          700: '#3A506B',
          accent: '#5BC0BE',
          hazard: '#E71D36',
          warning: '#FF9F1C',
          safe: '#2EC4B6'
        }
      }
    },
  },
  plugins: [],
}
