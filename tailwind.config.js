/** Every color is a CSS variable (see src/index.css), so light and dark themes share one set of classes. */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        sunken: token("sunken"),
        ink: token("ink"),
        muted: token("muted"),
        line: token("line"),
        brand: { DEFAULT: token("brand"), ink: token("brand-ink"), soft: token("brand-soft"), deep: token("brand-deep") },
        saffron: { DEFAULT: token("saffron"), soft: token("saffron-soft") },
        tomato: { DEFAULT: token("tomato"), soft: token("tomato-soft") },
        fresh: { DEFAULT: token("fresh"), soft: token("fresh-soft") },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"Avenir Next"', "system-ui", "sans-serif"],
        sans: ['"Plus Jakarta Sans"', '"Segoe UI"', "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(var(--shadow) / 0.05), 0 6px 20px -6px rgb(var(--shadow) / 0.12)",
        lift: "0 2px 4px rgb(var(--shadow) / 0.06), 0 18px 40px -12px rgb(var(--shadow) / 0.22)",
      },
      borderRadius: { "4xl": "2rem" },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        pop: { "0%": { transform: "scale(.96)", opacity: ".6" }, "100%": { transform: "scale(1)", opacity: "1" } },
        shimmer: { from: { backgroundPosition: "-200% 0" }, to: { backgroundPosition: "200% 0" } },
      },
      animation: {
        "fade-up": "fade-up .45s cubic-bezier(.2,.7,.2,1) both",
        float: "float 6s ease-in-out infinite",
        pop: "pop .25s ease-out both",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};
