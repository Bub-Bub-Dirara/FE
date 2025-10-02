/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary-main": "#113F67",
        "primary-middle": "#34699A",
        "primary-light": "#58A0C8",

        "secondary-yellow_h": "#F3F65F80",
        "secondary-green_h": "#5FF65F80",
        "secondary-red_h": "#FB4D4D80",
        "secondary-great_bg": "#C5DED8",
        "secondary-great_txt": "#40AD73",
        "secondary-iffy_bg": "#DEDDC5",
        "secondary-iffy_txt": "#AD8E40",
        "secondary-bad_bg": "#DEC5C5",
        "secondary-bad_txt": "#8A3333",

        "background-default": "#EAEFF3",
        "background-alt": "#E9ECEF",

        "text-main": "#1E1E1E",
        "text-muted": "#A9A9A9",
        "text-inverse": "#ffffff",

        black: "#000000",
      },
    },
  },
  plugins: [],
}