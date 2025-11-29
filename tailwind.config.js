export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Sora", "sans-serif"], // Default Sora
        sora: ["Sora", "sans-serif"], // Optional custom class
      },
    },
  },
  plugins: [],
};
