"use client";

/**
 * Theme Provider
 *
 * Wraps the application with next-themes ThemeProvider to enable
 * light/dark mode switching across the entire app.
 *
 * Features:
 * - Automatic system theme detection
 * - Persists user preference to localStorage
 * - Prevents theme flash on page load
 * - CSS class-based theme switching (adds 'dark' class to <html>)
 *
 * Usage:
 * Wrap your app in layout.tsx:
 * <ThemeProvider>
 *   {children}
 * </ThemeProvider>
 */

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
