/**
 * Agent Icon Registry
 * 
 * Manages icon resolution for agents, supporting both:
 * 1. Featured/custom icons (pre-wrapped for performance)
 * 2. Full HugeIcons library (future: dynamic loading)
 */

import {
    AgentIcon,
    DootLogoIcon,
    type AppIconProps,
} from "@/components/icons";

// ============================================
// FEATURED AGENT ICONS
// ============================================

/**
 * Curated list of featured agent icons.
 * These are pre-wrapped with AppIconProps for optimal performance.
 * 
 * To add more icons:
 * 1. Import from @/components/icons (add to app-icons.tsx if needed)
 * 2. Add to this registry with a unique key
 */
export const FEATURED_AGENT_ICONS = {
    // Custom Orbit brand icon
    "doot": DootLogoIcon,

    // Default fallback icon
    "default": AgentIcon,

    // TODO: Add more featured icons as needed
    // "ai-brain": AgentBrainCPU,
    // "robot": AgentIcon5,
    // "copilot": AgentIcon7,
    // "neural-network": AgentIcon8,
} as const satisfies Record<string, React.FC<AppIconProps>>;

export type FeaturedIconName = keyof typeof FEATURED_AGENT_ICONS;

// ============================================
// ICON RESOLUTION
// ============================================

/**
 * Resolves an agent icon by name.
 * 
 * Resolution order:
 * 1. Check FEATURED_AGENT_ICONS registry
 * 2. TODO: Check full HugeIcons library (future implementation)
 * 3. Fallback to default icon
 * 
 * @param iconName - Icon identifier from agent.metadata.icon
 * @returns Icon component with AppIconProps support
 * 
 * @example
 * ```tsx
 * const IconComponent = getAgentIcon(agent.metadata?.icon);
 * <IconComponent size="md" />
 * ```
 */
export function getAgentIcon(iconName?: string | null): React.FC<AppIconProps> {
    // Handle null/undefined/empty string
    if (!iconName) {
        return FEATURED_AGENT_ICONS.default;
    }

    // Check featured icons first
    if (iconName in FEATURED_AGENT_ICONS) {
        return FEATURED_AGENT_ICONS[iconName as FeaturedIconName];
    }

    /*
     * TODO: Full HugeIcons Library Support (Phase 2)
     * 
     * When implementing icon picker with full library access:
     * 
     * 1. Import HugeIcons library:
     *    import { icons } from "hugeicons-react"; // or generate icon list
     * 
     * 2. Check if icon exists in library:
     *    if (iconName in icons) {
     *      const HugeIconComponent = icons[iconName];
     *      return (props: AppIconProps) => (
     *        <IconWrapper icon={HugeIconComponent} {...props} />
     *      );
     *    }
     * 
     * 3. This allows users to select from 4,000+ icons while maintaining
     *    consistent styling via IconWrapper from app-icons.tsx
     * 
     * Benefits:
     * - Only loads icons that are actually selected
     * - Tree-shaking works (no bundle bloat)
     * - Consistent AppIconProps interface
     * - No performance penalty
     */

    // Fallback to default if icon not found
    console.warn(
        `Agent icon "${iconName}" not found in registry. Using default icon.`
    );
    return FEATURED_AGENT_ICONS.default;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all available featured icons with metadata.
 * Useful for building icon pickers or displaying available options.
 * 
 * @returns Array of icon metadata objects
 */
export function getFeaturedIcons() {
    return Object.keys(FEATURED_AGENT_ICONS).map((name) => ({
        name,
        displayName: formatIconName(name),
        component: FEATURED_AGENT_ICONS[name as FeaturedIconName],
        isFeatured: true,
    }));
}

/**
 * Format icon name for display.
 * Converts kebab-case to Title Case.
 * 
 * @example
 * formatIconName("doot-loader") // "Doot Loader"
 * formatIconName("ai-brain") // "Ai Brain"
 */
function formatIconName(name: string): string {
    return name
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

/*
 * TODO: Full Icon Library Support (Phase 2)
 * 
 * export function getAllSelectableIcons() {
 *   // Get featured icons
 *   const featured = getFeaturedIcons();
 *   
 *   // Get all HugeIcons
 *   const allHugeIcons = Object.keys(icons).map(name => ({
 *     name,
 *     displayName: formatIconName(name),
 *     isFeatured: false,
 *     category: inferCategory(name),
 *   }));
 *   
 *   // Combine and deduplicate
 *   return [...featured, ...allHugeIcons];
 * }
 * 
 * function inferCategory(iconName: string): string {
 *   if (iconName.toLowerCase().includes('brain') || 
 *       iconName.toLowerCase().includes('ai')) return 'AI';
 *   if (iconName.toLowerCase().includes('robot')) return 'Robots';
 *   if (iconName.toLowerCase().includes('chat')) return 'Communication';
 *   return 'Other';
 * }
 */
