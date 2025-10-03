/**
 * Design System Tokens
 * 
 * This file contains all design tokens for the Open Agent Platform.
 * These tokens are the single source of truth for colors, spacing, typography, etc.
 * 
 * Purpose:
 * - Centralize all design decisions
 * - Enable consistent theming across light/dark modes
 * - Provide type-safe design tokens
 * - Make global design changes easy (change once, apply everywhere)
 */

export const designTokens = {
  /**
   * COLOR TOKENS
   * 
   * Using OKLCH color space for better perceptual uniformity.
   * Each color is defined for both light and dark themes.
   */
  colors: {
    // Brand colors - Primary identity of the application
    brand: {
      // Main brand color (replacing hardcoded #2F6868)
      primary: {
        light: 'oklch(0.35 0.08 180)',      // Teal/cyan - professional
        dark: 'oklch(0.65 0.12 180)',       // Lighter teal for dark mode
      },
      primaryHover: {
        light: 'oklch(0.30 0.08 180)',      // Darker on hover
        dark: 'oklch(0.70 0.12 180)',       // Lighter on hover (dark mode)
      },
      primaryLight: {
        light: 'oklch(0.95 0.02 180)',      // Very light teal background
        dark: 'oklch(0.25 0.04 180)',       // Dark teal background
      },
      
      // Accent color (replacing hardcoded #CFC8FE)
      accent: {
        light: 'oklch(0.60 0.20 280)',      // Purple accent
        dark: 'oklch(0.70 0.22 280)',       // Lighter purple for dark mode
      },
      accentLight: {
        light: 'oklch(0.92 0.08 280)',      // Light purple background
        dark: 'oklch(0.30 0.10 280)',       // Dark purple background
      },
    },

    // Semantic colors - Convey meaning (success, error, warning, info)
    semantic: {
      success: {
        light: 'oklch(0.55 0.15 145)',      // Green
        dark: 'oklch(0.65 0.18 145)',
      },
      successLight: {
        light: 'oklch(0.93 0.06 145)',
        dark: 'oklch(0.28 0.08 145)',
      },
      
      warning: {
        light: 'oklch(0.65 0.18 65)',       // Orange
        dark: 'oklch(0.70 0.20 65)',
      },
      warningLight: {
        light: 'oklch(0.95 0.08 65)',
        dark: 'oklch(0.30 0.10 65)',
      },
      
      error: {
        light: 'oklch(0.55 0.22 25)',       // Red
        dark: 'oklch(0.65 0.24 25)',
      },
      errorLight: {
        light: 'oklch(0.95 0.10 25)',
        dark: 'oklch(0.30 0.12 25)',
      },
      
      info: {
        light: 'oklch(0.55 0.18 250)',      // Blue
        dark: 'oklch(0.65 0.20 250)',
      },
      infoLight: {
        light: 'oklch(0.93 0.08 250)',
        dark: 'oklch(0.28 0.10 250)',
      },
    },

    // Neutral palette - Grays for text, borders, backgrounds
    neutral: {
      50: {
        light: 'oklch(0.99 0 0)',           // Almost white
        dark: 'oklch(0.15 0 0)',            // Very dark gray
      },
      100: {
        light: 'oklch(0.97 0 0)',
        dark: 'oklch(0.18 0 0)',
      },
      200: {
        light: 'oklch(0.92 0 0)',
        dark: 'oklch(0.22 0 0)',
      },
      300: {
        light: 'oklch(0.85 0 0)',
        dark: 'oklch(0.30 0 0)',
      },
      400: {
        light: 'oklch(0.68 0 0)',
        dark: 'oklch(0.45 0 0)',
      },
      500: {
        light: 'oklch(0.55 0 0)',           // Mid gray
        dark: 'oklch(0.55 0 0)',            // Same for both
      },
      600: {
        light: 'oklch(0.45 0 0)',
        dark: 'oklch(0.68 0 0)',
      },
      700: {
        light: 'oklch(0.35 0 0)',
        dark: 'oklch(0.75 0 0)',
      },
      800: {
        light: 'oklch(0.25 0 0)',
        dark: 'oklch(0.85 0 0)',
      },
      900: {
        light: 'oklch(0.18 0 0)',
        dark: 'oklch(0.92 0 0)',
      },
      950: {
        light: 'oklch(0.12 0 0)',           // Almost black
        dark: 'oklch(0.97 0 0)',            // Almost white
      },
    },
  },

  /**
   * SPACING TOKENS
   * 
   * Consistent spacing scale based on 4px base unit.
   * Used for padding, margin, gaps, etc.
   */
  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem',  // 2px
    1: '0.25rem',     // 4px
    1.5: '0.375rem',  // 6px
    2: '0.5rem',      // 8px
    2.5: '0.625rem',  // 10px
    3: '0.75rem',     // 12px
    3.5: '0.875rem',  // 14px
    4: '1rem',        // 16px - Base unit
    5: '1.25rem',     // 20px
    6: '1.5rem',      // 24px
    7: '1.75rem',     // 28px
    8: '2rem',        // 32px
    9: '2.25rem',     // 36px
    10: '2.5rem',     // 40px
    11: '2.75rem',    // 44px
    12: '3rem',       // 48px
    14: '3.5rem',     // 56px
    16: '4rem',       // 64px
    20: '5rem',       // 80px
    24: '6rem',       // 96px
    28: '7rem',       // 112px
    32: '8rem',       // 128px
    36: '9rem',       // 144px
    40: '10rem',      // 160px
    44: '11rem',      // 176px
    48: '12rem',      // 192px
    52: '13rem',      // 208px
    56: '14rem',      // 224px
    60: '15rem',      // 240px
    64: '16rem',      // 256px
    72: '18rem',      // 288px
    80: '20rem',      // 320px
    96: '24rem',      // 384px
  },

  /**
   * TYPOGRAPHY TOKENS
   * 
   * Font families, sizes, weights, and line heights.
   * Ensures consistent text styling across the app.
   */
  typography: {
    fontFamily: {
      sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
    },
    
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.025em' }],      // 12px
      sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0' }],        // 14px
      base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0' }],           // 16px
      lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],  // 18px
      xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],   // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],    // 24px
      '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }], // 30px
      '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }], // 36px
      '5xl': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],       // 48px
      '6xl': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],    // 60px
      '7xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],     // 72px
    },
    
    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
  },

  /**
   * BORDER RADIUS TOKENS
   * 
   * Consistent rounding for UI elements.
   */
  borderRadius: {
    none: '0',
    sm: '0.25rem',      // 4px - Small elements
    DEFAULT: '0.5rem',   // 8px - Default
    md: '0.625rem',     // 10px - Medium elements (current default)
    lg: '0.75rem',      // 12px - Large cards
    xl: '1rem',         // 16px - Extra large
    '2xl': '1.5rem',    // 24px - Very round
    '3xl': '2rem',      // 32px - Super round
    full: '9999px',     // Pill shape / circles
  },

  /**
   * ELEVATION (BOX SHADOW) TOKENS
   * 
   * Consistent depth and layering through shadows.
   */
  elevation: {
    none: 'none',
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    
    // Dark mode shadows (slightly lighter for visibility)
    dark: {
      xs: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
      sm: '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.5)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)',
      '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.6)',
    },
  },

  /**
   * ANIMATION TOKENS
   * 
   * Consistent timing and easing for transitions and animations.
   */
  animation: {
    duration: {
      instant: '0ms',
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
      slower: '500ms',
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',      // Tailwind default
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',             // Ease in
      out: 'cubic-bezier(0, 0, 0.2, 1)',            // Ease out
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',        // Ease in-out
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',  // Spring effect
    },
  },

  /**
   * BREAKPOINTS
   * 
   * Responsive design breakpoints.
   */
  breakpoints: {
    sm: '640px',    // Small devices (phones in landscape)
    md: '768px',    // Medium devices (tablets)
    lg: '1024px',   // Large devices (laptops)
    xl: '1280px',   // Extra large devices (desktops)
    '2xl': '1536px', // 2X large devices (large desktops)
  },

  /**
   * Z-INDEX SCALE
   * 
   * Consistent layering for overlapping elements.
   */
  zIndex: {
    hide: '-1',
    base: '0',
    dropdown: '1000',
    sticky: '1100',
    fixed: '1200',
    modalBackdrop: '1300',
    modal: '1400',
    popover: '1500',
    tooltip: '1600',
  },

  /**
   * OPACITY SCALE
   * 
   * Consistent transparency values.
   */
  opacity: {
    0: '0',
    5: '0.05',
    10: '0.1',
    20: '0.2',
    25: '0.25',
    30: '0.3',
    40: '0.4',
    50: '0.5',
    60: '0.6',
    70: '0.7',
    75: '0.75',
    80: '0.8',
    90: '0.9',
    95: '0.95',
    100: '1',
  },
} as const;

/**
 * TYPE EXPORTS
 * 
 * TypeScript types for type-safe token usage.
 */
export type ColorToken = keyof typeof designTokens.colors;
export type SpacingToken = keyof typeof designTokens.spacing;
export type FontSizeToken = keyof typeof designTokens.typography.fontSize;
export type FontWeightToken = keyof typeof designTokens.typography.fontWeight;
export type BorderRadiusToken = keyof typeof designTokens.borderRadius;
export type ElevationToken = keyof typeof designTokens.elevation;
export type ZIndexToken = keyof typeof designTokens.zIndex;

/**
 * HELPER FUNCTION
 * 
 * Get color value for current theme (light/dark)
 */
export function getThemeColor(
  colorPath: string,
  theme: 'light' | 'dark' = 'light'
): string {
  const keys = colorPath.split('.');
  let value: any = designTokens.colors;
  
  for (const key of keys) {
    value = value?.[key];
  }
  
  if (typeof value === 'object' && 'light' in value && 'dark' in value) {
    return value[theme];
  }
  
  return value || '';
}
