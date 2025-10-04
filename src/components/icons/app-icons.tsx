/**
 * Application Icons - Centralized Icon System
 *
 * All application icons are defined here using HugeIcons.
 * This provides:
 * - Single source of truth for all icons
 * - Consistent styling and sizing
 * - Custom variants (e.g., red delete icon)
 * - Easy maintenance and updates
 *
 * Usage:
 * import { DeleteIcon, SendIcon } from '@/components/icons';
 */

import React from "react";
import {
  SidebarLeftIcon,
  UnfoldMoreIcon,
  UnfoldLessIcon,
  ChatBotIcon,
  Search01Icon,
  AttachmentIcon,
  Settings03Icon,
  Sun01Icon,
  Moon02Icon,
  Logout05Icon,
  ComputerIcon,
  PencilEdit02Icon,
  Delete03Icon,
  Cancel01Icon,
  Edit01Icon,
  SentIcon,
  Copy01Icon,
  Add01Icon,
} from "hugeicons-react";
import { cn } from "@/lib/utils";

// Base icon props type
export interface AppIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  strokeWidth?: number;
}

// ============================================
// SIDEBAR & NAVIGATION ICONS
// ============================================

export const SidebarIcon: React.FC<AppIconProps> = (props) => (
  <SidebarLeftIcon {...props} />
);

export const UnfoldIcon: React.FC<AppIconProps> = (props) => (
  <UnfoldMoreIcon {...props} />
);

export const FoldIcon: React.FC<AppIconProps> = (props) => (
  <UnfoldLessIcon {...props} />
);

// ============================================
// FEATURE ICONS
// ============================================

export const AgentIcon: React.FC<AppIconProps> = (props) => (
  <ChatBotIcon {...props} />
);

export const SearchIcon: React.FC<AppIconProps> = (props) => (
  <Search01Icon {...props} />
);

export const AttachIcon: React.FC<AppIconProps> = (props) => (
  <AttachmentIcon {...props} />
);

export const SettingsIcon: React.FC<AppIconProps> = (props) => (
  <Settings03Icon {...props} />
);

export const NewThreadIcon: React.FC<AppIconProps> = (props) => (
  <PencilEdit02Icon {...props} />
);

// ============================================
// THEME ICONS
// ============================================

export const LightThemeIcon: React.FC<AppIconProps> = (props) => (
  <Sun01Icon {...props} />
);

export const DarkThemeIcon: React.FC<AppIconProps> = (props) => (
  <Moon02Icon {...props} />
);

export const SystemThemeIcon: React.FC<AppIconProps> = (props) => (
  <ComputerIcon {...props} />
);

// ============================================
// ACTION ICONS
// ============================================

export const LogOutIcon: React.FC<AppIconProps> = (props) => (
  <Logout05Icon {...props} />
);

export const SendIcon: React.FC<AppIconProps> = (props) => (
  <SentIcon {...props} />
);

export const CopyIcon: React.FC<AppIconProps> = (props) => (
  <Copy01Icon {...props} />
);

export const EditIcon: React.FC<AppIconProps> = (props) => (
  <Edit01Icon {...props} />
);

export const CancelIcon: React.FC<AppIconProps> = (props) => (
  <Cancel01Icon {...props} />
);

// ============================================
// DESTRUCTIVE ICONS (Custom Styled)
// ============================================

export const DeleteIcon: React.FC<AppIconProps> = ({ className, ...props }) => (
  <Delete03Icon
    className={cn("text-destructive", className)}
    {...props}
  />
);

// ============================================
// ICON VARIANTS
// ============================================

/**
 * Toggle Icon Component
 * Switches between UnfoldMore and UnfoldLess based on state
 *
 * @param isExpanded - Whether the section is expanded
 */
export const ToggleIcon: React.FC<AppIconProps & { isExpanded?: boolean }> = ({
  isExpanded,
  ...props
}) => {
  return isExpanded ? <FoldIcon {...props} /> : <UnfoldIcon {...props} />;
};

// ============================================
// EXPORTS
// ============================================

export default {
  Sidebar: SidebarIcon,
  Unfold: UnfoldIcon,
  Fold: FoldIcon,
  Toggle: ToggleIcon,
  Agent: AgentIcon,
  Search: SearchIcon,
  Attach: AttachIcon,
  Settings: SettingsIcon,
  NewThread: NewThreadIcon,
  LightTheme: LightThemeIcon,
  DarkTheme: DarkThemeIcon,
  SystemTheme: SystemThemeIcon,
  LogOut: LogOutIcon,
  Send: SendIcon,
  Copy: CopyIcon,
  Edit: EditIcon,
  Cancel: CancelIcon,
  Delete: DeleteIcon,
};
