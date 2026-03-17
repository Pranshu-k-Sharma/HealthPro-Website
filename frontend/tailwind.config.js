/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#1E3A8A",
          green: "#10B981",
          heading: "#1E3A8A",
          body: "#374151",
          muted: "#6B7280",
          border: "#E5E7EB",
          bg: "#FFFFFF",
          alt: "#F8FAFC",
        },
      },
      backgroundImage: {
        "soft-highlight": "linear-gradient(135deg, #F0F7FF 0%, #E6F9F4 100%)",
        "brand-gradient": "linear-gradient(90deg, #1E3A8A 0%, #10B981 100%)",
        "brand-gradient-hover": "linear-gradient(90deg, #2446A6 0%, #16C7A0 100%)",
      },
      boxShadow: {
        card: "0 8px 24px rgba(17, 24, 39, 0.06)",
        button: "0 8px 20px rgba(16, 185, 129, 0.20)",
        "button-hover": "0 10px 24px rgba(16, 185, 129, 0.24)",
      },
      borderRadius: {
        brand: "12px",
      },
    },
  },
  plugins: [],
}
