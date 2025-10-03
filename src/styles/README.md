# Design System Documentation

## 📁 File Structure

```
src/styles/
├── tokens.ts              # Design tokens (single source of truth)
└── tailwind-preset.ts     # Tailwind configuration preset

src/app/
└── globals.css            # CSS variables & base styles

tailwind.config.js         # Main Tailwind configuration
```

---

## 🎯 What Each File Does

### **1. `src/styles/tokens.ts`**

**Purpose:** Single source of truth for all design values.

**Contains:**

- Color definitions (brand, semantic, neutral) for light/dark themes
- Spacing scale (based on 4px grid)
- Typography (fonts, sizes, weights)
- Border radius values
- Elevation (shadows)
- Animation timings
- Z-index scale
- Opacity values
- Breakpoints

**Why it exists:**

- Centralized design decisions
- Type-safe token access in TypeScript
- Easy to update globally
- Enables design system consistency

**Example usage in TypeScript:**

```typescript
import { designTokens } from "@/styles/tokens";

const primaryColor = designTokens.colors.brand.primary.light;
const spacing = designTokens.spacing[4]; // 16px
```

---

### **2. `src/styles/tailwind-preset.ts`**

**Purpose:** Bridges design tokens to Tailwind CSS.

**What it does:**

- Imports design tokens from `tokens.ts`
- Transforms tokens into Tailwind's expected format
- Provides CSS variable mappings
- Defines custom animations and keyframes
- Extends Tailwind's default theme

**Why it's a preset:**

- Keeps design system separate from project config
- Can be reused across multiple projects
- Makes `tailwind.config.js` cleaner
- Easier to maintain and update

**How it works:**

```
Design Tokens (tokens.ts)
         ↓
Tailwind Preset (tailwind-preset.ts)
         ↓
Tailwind Config (tailwind.config.js)
         ↓
CSS Output
```

---

### **3. `src/app/globals.css`**

**Purpose:** Global CSS variables and base styles.

**Contains:**

- CSS variables for both light and dark themes
- Existing shadcn/ui variables (compatibility)
- New design system variables
- Base styles (@layer base)
- Custom utility classes (@layer utilities)

**Why CSS variables:**

- Runtime theme switching (light/dark)
- No JavaScript needed for theming
- Works with Tailwind utilities
- Browser-native solution

**Variable naming convention:**

```css
/* Existing shadcn/ui */
--background
--primary
--border

/* New design system */
--color-brand-primary
--color-semantic-success
--color-neutral-500
```

---

### **4. `tailwind.config.js`**

**Purpose:** Main Tailwind CSS configuration.

**Contains:**

- Dark mode strategy (`class` based)
- Content paths (where to scan for classes)
- Design system preset import
- Project-specific customizations
- Plugin configurations

**Configuration hierarchy:**

```
Tailwind Defaults
    ↓
Design System Preset (from tailwind-preset.ts)
    ↓
Project-specific Extensions (in tailwind.config.js)
    ↓
Final Tailwind Theme
```

---

## 🎨 How to Use the Design System

### **Brand Colors**

```tsx
// Primary brand color
<button className="bg-brand-primary hover:bg-brand-primary-hover text-white">
  Click me
</button>

// Accent color
<div className="bg-brand-accent-light border border-brand-accent">
  Accent box
</div>
```

### **Semantic Colors**

```tsx
// Success state
<div className="bg-semantic-success-light border border-semantic-success">
  ✓ Success message
</div>

// Error state
<div className="bg-semantic-error-light text-semantic-error">
  ✗ Error message
</div>

// Warning state
<div className="bg-semantic-warning-light text-semantic-warning">
  ⚠ Warning message
</div>

// Info state
<div className="bg-semantic-info-light text-semantic-info">
  ℹ Info message
</div>
```

### **Neutral Colors**

```tsx
// Light backgrounds
<div className="bg-neutral-50 text-neutral-900">
  Light card
</div>

// Borders
<div className="border border-neutral-200">
  Subtle border
</div>

// Text colors
<h1 className="text-neutral-900">Heading</h1>
<p className="text-neutral-600">Body text</p>
<span className="text-neutral-400">Muted text</span>
```

### **Spacing**

```tsx
// Padding
<div className="p-4 px-6 py-8">Padded content</div>

// Margin
<div className="m-4 mx-auto my-8">Centered with margin</div>

// Gap (for flexbox/grid)
<div className="flex gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

### **Typography**

```tsx
// Font sizes
<h1 className="text-4xl font-bold">Large Heading</h1>
<h2 className="text-2xl font-semibold">Medium Heading</h2>
<p className="text-base font-normal">Body text</p>
<small className="text-sm text-neutral-600">Small text</small>

// Font families
<code className="font-mono text-sm">const code = true;</code>
```

### **Elevation (Shadows)**

```tsx
// Card with shadow
<div className="shadow-md rounded-lg p-6">
  Card content
</div>

// Dropdown with larger shadow
<div className="shadow-lg rounded-md">
  Dropdown menu
</div>
```

### **Dark Mode**

All colors automatically adapt when dark mode is active:

```tsx
// This works for both light and dark mode
<div className="bg-neutral-50 text-neutral-900">Content</div>

// In light mode: bg is almost white, text is almost black
// In dark mode: bg is dark gray, text is light gray
```

---

## 🔄 Theme Switching

The design system supports light/dark mode through the `dark` class on the `<html>` element:

```tsx
// Toggle dark mode
const toggleDarkMode = () => {
  document.documentElement.classList.toggle("dark");
};
```

Using `next-themes` (recommended):

```tsx
import { ThemeProvider } from "next-themes";

// In layout.tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
>
  {children}
</ThemeProvider>;

// In component
import { useTheme } from "next-themes";

const { theme, setTheme } = useTheme();
<button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
  Toggle
</button>;
```

---

## 🚀 Migration Path (Next Steps)

### **Phase 1: Setup** ✅ (COMPLETE)

- Created design tokens
- Created Tailwind preset
- Updated globals.css
- Updated Tailwind config

### **Phase 2: Migration** (TODO)

1. Create migration codemod script
2. Find all hardcoded colors
3. Replace with design system tokens
4. Test in both light/dark mode

### **Phase 3: Enforcement** (TODO)

1. Add ESLint rule to prevent hardcoded colors
2. Update component library
3. Create Storybook documentation
4. Add visual regression tests

---

## 📊 Color Reference

### **Brand Colors**

| Token           | Light Mode     | Dark Mode    | Usage                     |
| --------------- | -------------- | ------------ | ------------------------- |
| `brand-primary` | Teal `#1A5F5F` | Light Teal   | Primary actions, links    |
| `brand-accent`  | Purple         | Light Purple | Highlights, notifications |

### **Semantic Colors**

| Token              | Usage                         |
| ------------------ | ----------------------------- |
| `semantic-success` | Success states, confirmations |
| `semantic-warning` | Warnings, cautions            |
| `semantic-error`   | Errors, destructive actions   |
| `semantic-info`    | Informational messages        |

### **Neutral Scale**

| Token         | Light Mode      | Dark Mode    | Usage       |
| ------------- | --------------- | ------------ | ----------- |
| `neutral-50`  | Almost white    | Very dark    | Backgrounds |
| `neutral-100` | Very light gray | Dark gray    | Cards       |
| `neutral-200` | Light gray      | Gray         | Borders     |
| `neutral-500` | Mid gray        | Mid gray     | Disabled    |
| `neutral-900` | Almost black    | Almost white | Text        |

---

## ✅ Benefits of This Design System

1. **Consistency:** All colors defined in one place
2. **Maintainability:** Change once, update everywhere
3. **Type Safety:** TypeScript ensures valid tokens
4. **Accessibility:** Proper contrast ratios in both themes
5. **Scalability:** Easy to add new tokens
6. **Performance:** Only generates CSS for used classes
7. **Developer Experience:** Clear naming, autocomplete support

---

## 🔧 Troubleshooting

### **Colors not applying?**

1. Check if CSS variables are defined in `globals.css`
2. Verify Tailwind is scanning the file
3. Run `npm run build` to regenerate CSS

### **Dark mode not working?**

1. Ensure `<html class="dark">` is present
2. Check `darkMode: ["class"]` in `tailwind.config.js`
3. Verify CSS variables are defined in `.dark { }` block

### **TypeScript errors?**

1. Import tokens: `import { designTokens } from '@/styles/tokens'`
2. Use type helpers: `ColorToken`, `SpacingToken`, etc.

---

## 📝 Notes

- The CSS linter warnings for `@apply`, `@theme`, etc. are expected (Tailwind v4 syntax)
- All existing shadcn/ui components remain compatible
- New components should use design system tokens
- Gradual migration is recommended (not big bang)
