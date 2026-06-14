import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        app: {
          bg: "#071018",
          panel: "#101d2b",
          line: "rgba(164,188,217,0.18)",
          muted: "#a7b4c4"
        }
      },
      boxShadow: {
        panel: "0 20px 70px rgba(0,0,0,0.35)"
      }
    }
  },
  plugins: []
};

export default config;
