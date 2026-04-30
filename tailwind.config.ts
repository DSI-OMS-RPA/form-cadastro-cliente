import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#155892",
          blueDark: "#0f4c82",
          cyan: "#20aeb8",
          red: "#ed2c19",
        },
      },
      boxShadow: {
        form: "0 22px 60px rgba(21, 88, 146, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
