/**
 * Tailwind CSS Configuration
 * 
 * PURPOSE:
 * This is the main Tailwind configuration file for the Open Agent Platform.
 * It imports our design system preset and adds any project-specific customizations.
 * 
 * STRUCTURE:
 * 1. Import design system preset (contains all design tokens)
 * 2. Configure dark mode strategy
 * 3. Specify content paths (where Tailwind looks for class names)
 * 4. Add project-specific theme extensions
 * 5. Include necessary plugins
 * 
 * WHY THIS APPROACH?
 * - Separation of concerns: Design system vs. project config
 * - Easier maintenance: Update design tokens in one place
 * - Better organization: Project-specific utilities separate from design tokens
 * - Scalability: Can easily add more presets or configurations
 */

const { designSystemPreset } = require('./src/renderer/src/styles/tailwind-preset.ts');

/** @type {import('tailwindcss').Config} */
module.exports = {
  /**
   * DARK MODE
   * 
   * Strategy: "class" - Dark mode is toggled by adding "dark" class to <html> element
   * This gives us full control over when dark mode is active (vs. prefers-color-scheme)
   * 
   * Usage: <html class="dark"> to enable dark mode
   */
  darkMode: ["class"],

  /**
   * CONTENT PATHS
   * 
   * Tells Tailwind where to look for class names to generate CSS for.
   * It scans these files and only includes CSS for classes actually used.
   * This keeps the final CSS bundle small.
   */
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{ts,tsx,js,jsx}",
  ],

  /**
   * PRESETS
   * 
   * Import our design system preset which contains all the design tokens.
   * This preset extends Tailwind's default theme with our custom values.
   */
  presets: [designSystemPreset],

  /**
   * THEME EXTENSIONS
   * 
   * Project-specific theme customizations that don't belong in the design system.
   * These are additions specific to this project.
   */
  theme: {
    extend: {
      /**
       * FONT FAMILIES
       * 
       * Roobert font family variables configured in layout.tsx
       * - sans: Roobert for body text and UI
       * - mono: Roobert Mono for code blocks
       */
      fontFamily: {
        sans: ["var(--font-roobert)"],
        mono: ["var(--font-roobert-mono)"],
      },

      /**
       * CUSTOM UTILITIES
       * 
       * Project-specific utility classes.
       * These are one-off utilities that don't belong in the global design system.
       */
      components: {
        // Custom scrollbar styling
        ".scrollbar-pretty":
          "overflow-y-scroll [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent",
      },

      /**
       * BORDER RADIUS OVERRIDE
       * 
       * These use CSS variables for dynamic radius values.
       * The --radius variable is defined in globals.css and can be changed at runtime.
       */
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },

  /**
   * PLUGINS
   * 
   * Additional Tailwind plugins for extended functionality:
   * - tailwindcss-animate: Pre-built animations and transitions
   * - tailwind-scrollbar: Custom scrollbar styling utilities
   */
  plugins: [
    require("tailwindcss-animate"),
    require("tailwind-scrollbar")
  ],
};

/**
 * HOW TO USE:
 * 
 * 1. DESIGN SYSTEM COLORS:
 *    <button className="bg-brand-primary text-white">Brand Button</button>
 *    <div className="bg-semantic-success text-semantic-success">Success</div>
 * 
 * 2. EXISTING SHADCN COLORS (still work):
 *    <button className="bg-primary text-primary-foreground">Primary</button>
 *    <div className="bg-background text-foreground">Content</div>
 * 
 * 3. SPACING:
 *    <div className="p-4 m-8 gap-6">Consistent spacing</div>
 * 
 * 4. TYPOGRAPHY:
 *    <h1 className="text-4xl font-bold">Heading</h1>
 *    <p className="text-base font-normal">Body</p>
 * 
 * 5. ELEVATION:
 *    <div className="shadow-md rounded-lg">Card with shadow</div>
 * 
 * 6. DARK MODE:
 *    Colors automatically adapt based on dark class on <html>
 *    <div className="bg-neutral-50 dark:bg-neutral-900">Auto-theming</div>
 */

