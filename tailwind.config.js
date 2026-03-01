/**
 * Tailwind CSS Configuration — doot-agent-frontend
 *
 * Tailwind v4 CSS-first: all theme tokens, colors, and radius live in
 * src/styles/theme.css  (shared with doot-agent-electron).
 * This file is kept only for content paths and JS plugins.
 *
 * DO NOT add theme.extend here — use src/styles/theme.css instead so both
 * projects stay in sync by copying the src/styles/ folder.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],

  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
    "./agent/**/*.{ts,tsx,js,jsx}",
  ],

  plugins: [
    require("tailwind-scrollbar"),
  ],
};
