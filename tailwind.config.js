/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f1f5f9",
          100: "#e2eaf1",
          200: "#bad0e0",
          300: "#8bb3cf",
          400: "#578db8",
          500: "#235079",
          600: "#1c4061",
          700: "#153049",
          800: "#0d2031",
          900: "#061018",
        },
        gold: {
          50: "#fefdf3",
          100: "#fbf8e1",
          200: "#f6efb5",
          300: "#f1e689",
          400: "#ecdd5d",
          500: "#e1b941",
          600: "#b49434",
          700: "#876f27",
          800: "#5a4a1a",
          900: "#2d250d",
        },
        // Brand aliases for graceful migration
        brand: {
          50: "#f1f5f9",
          100: "#e2eaf1",
          200: "#f6efb5", // Map light brand to light gold
          300: "#8bb3cf",
          400: "#578db8",
          500: "#235079", // Map main brand to Navy
          600: "#1c4061",
          700: "#876f27", // Map dark brand to dark gold
          800: "#153049",
          900: "#061018",
        },
        ink: "#0e2031",
        cream: "#faf9f6",
      },
      boxShadow: {
        float: "0 24px 60px rgba(14, 32, 49, 0.08)",
        gold: "0 0 20px rgba(225, 185, 65, 0.2)",
      },
      backgroundImage: {
        "mesh-premium":
          "radial-gradient(circle at top left, rgba(35, 80, 121, 0.08), transparent 40%), radial-gradient(circle at top right, rgba(225, 185, 65, 0.06), transparent 35%), linear-gradient(135deg, #ffffff, #faf9f6)",
      },
    },
  },
  plugins: [],
};
