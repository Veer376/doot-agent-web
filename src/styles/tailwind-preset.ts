/**
 * Tailwind CSS Design System Preset
 * 
 * PURPOSE:
 * This file acts as a bridge between our design tokens and Tailwind CSS.
 * It transforms our design tokens into a Tailwind configuration that can be
 * used throughout the application.
 * 
 * WHY A PRESET?
 * - Separates design system config from project-specific Tailwind config
 * - Can be reused across multiple projects
 * - Makes the main tailwind.config.js cleaner and more maintainable
 * - Allows for easy design system updates without touching project config
 * 
 * HOW IT WORKS:
 * 1. Imports design tokens from tokens.ts
 * 2. Transforms tokens into Tailwind's expected format
 * 3. Exports as a preset that extends Tailwind's default theme
 * 4. Main tailwind.config.js imports and uses this preset
 */

import type { Config } from 'tailwindcss';
import { designTokens } from './tokens';

/**
 * Helper function to convert theme-aware colors to CSS variables
 * This allows us to switch between light/dark mode using CSS variables
 */
function _createColorScale(colorObject: any, prefix: string = '') {
  const colors: Record<string, string> = {};

  for (const [key, value] of Object.entries(colorObject)) {
    const colorKey = prefix ? `${prefix}-${key}` : key;

    if (typeof value === 'object' && value !== null) {
      if ('light' in value && 'dark' in value) {
        // This is a theme-aware color, use CSS variable
        colors[key] = `var(--color-${colorKey.replace(/\./g, '-')})`;
      } else {
        // This is a nested object, recurse
        Object.assign(colors, _createColorScale(value, colorKey));
      }
    }
  }

  return colors;
}

/**
 * Design System Preset Configuration
 * 
 * This preset extends Tailwind's default theme with our design tokens.
 * It follows Tailwind's convention of using the 'extend' key to add to
 * (rather than replace) the default theme.
 */
export const designSystemPreset: Partial<Config> = {
  theme: {
    extend: {
      /**
       * COLORS
       * 
       * These will be available as utilities like:
       * - bg-brand-primary, text-brand-primary
       * - bg-semantic-success, border-semantic-error
       * - bg-neutral-100, text-neutral-700
       * 
       * Also maintains compatibility with existing shadcn/ui colors
       * (background, foreground, primary, etc.)
       */
      colors: {
        // Brand colors - Your app's identity
        brand: {
          primary: 'var(--color-brand-primary)',
          'primary-hover': 'var(--color-brand-primary-hover)',
          'primary-light': 'var(--color-brand-primary-light)',
          accent: 'var(--color-brand-accent)',
          'accent-light': 'var(--color-brand-accent-light)',
        },

        // Semantic colors - Meaning-based colors
        semantic: {
          success: 'var(--color-semantic-success)',
          'success-light': 'var(--color-semantic-success-light)',
          warning: 'var(--color-semantic-warning)',
          'warning-light': 'var(--color-semantic-warning-light)',
          error: 'var(--color-semantic-error)',
          'error-light': 'var(--color-semantic-error-light)',
          info: 'var(--color-semantic-info)',
          'info-light': 'var(--color-semantic-info-light)',
          pending: 'var(--color-semantic-pending)',
          'pending-light': 'var(--color-semantic-pending-light)',
          processing: 'var(--color-semantic-processing)',
          'processing-light': 'var(--color-semantic-processing-light)',
        },

        // Neutral scale - Grays for everything else
        neutral: {
          50: 'var(--color-neutral-50)',
          100: 'var(--color-neutral-100)',
          200: 'var(--color-neutral-200)',
          300: 'var(--color-neutral-300)',
          400: 'var(--color-neutral-400)',
          500: 'var(--color-neutral-500)',
          600: 'var(--color-neutral-600)',
          700: 'var(--color-neutral-700)',
          800: 'var(--color-neutral-800)',
          900: 'var(--color-neutral-900)',
          950: 'var(--color-neutral-950)',
        },

        // Interactive state colors
        interactive: {
          hover: 'var(--color-interactive-hover)',
          active: 'var(--color-interactive-active)',
          disabled: 'var(--color-interactive-disabled)',
          focus: 'var(--color-interactive-focus)',
        },

        // Keep existing shadcn/ui colors for compatibility
        // These are still using HSL format from globals.css
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          primary: 'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent: 'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)',
        },
      },

      /**
       * SPACING
       * 
       * Available as: p-4, m-8, gap-12, space-x-6, etc.
       * Uses 4px base unit for consistent spacing
       */
      spacing: designTokens.spacing,

      /**
       * TYPOGRAPHY
       * 
       * Font families: font-sans, font-mono
       * Font sizes: text-xs, text-sm, text-base, text-lg, etc.
       * Font weights: font-normal, font-medium, font-semibold, font-bold
       */
      fontFamily: designTokens.typography.fontFamily as any,
      fontSize: designTokens.typography.fontSize as any,
      fontWeight: designTokens.typography.fontWeight,
      lineHeight: designTokens.typography.lineHeight,

      /**
       * BORDER RADIUS
       * 
       * Available as: rounded-sm, rounded, rounded-md, rounded-lg, etc.
       * Creates consistent corner rounding
       */
      borderRadius: {
        ...designTokens.borderRadius,
        // Override Tailwind defaults to match our tokens
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      /**
       * BORDER WIDTH
       * 
       * Available as: border, border-2, border-1.5, etc.
       * Creates consistent border weights
       */
      borderWidth: designTokens.borderWidth,

      /**
       * BOX SHADOW (Elevation)
       * 
       * Available as: shadow-xs, shadow-sm, shadow-md, shadow-lg, etc.
       * Creates consistent depth and layering
       */
      boxShadow: {
        xs: designTokens.elevation.xs,
        sm: designTokens.elevation.sm,
        md: designTokens.elevation.md,
        lg: designTokens.elevation.lg,
        xl: designTokens.elevation.xl,
        '2xl': designTokens.elevation['2xl'],
        inner: designTokens.elevation.inner,
        none: designTokens.elevation.none,
      },

      /**
       * SCREENS (Breakpoints)
       * 
       * Available as: sm:, md:, lg:, xl:, 2xl:
       * For responsive design
       */
      screens: designTokens.breakpoints,

      /**
       * Z-INDEX
       * 
       * Available as: z-dropdown, z-modal, z-tooltip, etc.
       * Consistent layering for overlapping elements
       */
      zIndex: designTokens.zIndex,

      /**
       * OPACITY
       * 
       * Available as: opacity-0, opacity-50, opacity-100, etc.
       * Consistent transparency values
       */
      opacity: designTokens.opacity,

      /**
       * ANIMATION
       * 
       * Transition durations: duration-fast, duration-normal, duration-slow
       * Easing functions: Applied via custom utilities
       */
      transitionDuration: designTokens.animation.duration,
      transitionTimingFunction: designTokens.animation.easing,

      /**
       * KEYFRAMES & ANIMATIONS
       * 
       * Custom animations for the design system
       */
      keyframes: {
        // Fade in animation
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // Fade out animation
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        // Slide in from bottom
        'slide-in-bottom': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        // Slide in from top
        'slide-in-top': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        // Scale up
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        // Subtle pulse for loading states
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        // Shimmer effect for skeleton loaders
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 250ms ease-out',
        'fade-out': 'fade-out 250ms ease-in',
        'slide-in-bottom': 'slide-in-bottom 250ms ease-out',
        'slide-in-top': 'slide-in-top 250ms ease-out',
        'scale-in': 'scale-in 200ms ease-out',
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
};

/**
 * USAGE EXAMPLES:
 * 
 * // Brand colors
 * <button className="bg-brand-primary hover:bg-brand-primary-hover text-white">
 *   Click me
 * </button>
 * 
 * // Semantic colors
 * <div className="bg-semantic-success-light border border-semantic-success">
 *   Success message
 * </div>
 * 
 * // Neutral colors
 * <div className="bg-neutral-50 text-neutral-900 border-neutral-200">
 *   Card content
 * </div>
 * 
 * // Spacing
 * <div className="p-4 m-8 gap-6">Content</div>
 * 
 * // Typography
 * <h1 className="text-4xl font-bold">Heading</h1>
 * <p className="text-base font-normal">Body text</p>
 * 
 * // Elevation
 * <div className="shadow-md rounded-lg">Elevated card</div>
 * 
 * // Animations
 * <div className="animate-fade-in">Fading in content</div>
 */
