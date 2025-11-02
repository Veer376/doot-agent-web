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
 * GLOBAL DEFAULT SIZE: md (24px)
 * - All icons use this size unless explicitly overridden
 * - Change DEFAULT_ICON_SIZE constant to adjust globally
 *
 * AVAILABLE SIZES:
 * - xs: 16px (4) - Small indicators, badges
 * - sm: 20px (5) - Text inline icons, compact UI
 * - md: 24px (6) - DEFAULT - Most common use
 * - lg: 28px (7) - Buttons, prominent actions
 * - xl: 32px (8) - Large buttons, headers
 *
 * Usage:
 * import { DeleteIcon, SendIcon } from '@/components/icons';
 *
 * // Uses global default (md = 24px):
 * <SendIcon />
 * <AgentIcon />
 *
 * // Override for specific needs:
 * <SendIcon size="lg" />    // 28px for buttons
 * <SendIcon size="xl" />    // 32px for headers
 * <SendIcon size={40} />    // Custom pixel size
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
  StopIcon as StopHugeIcon,
  Edit01Icon,
  SentIcon,
  Copy01Icon,
  Copy02Icon as Copy02HugeIcon,
  RepeatIcon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle04Icon,
  GitBranchIcon as GitBranchHugeIcon,
  MoreVerticalCircle01Icon,
  AiBrain04Icon,
  Wrench01Icon,
  SidebarLeft01Icon as SidebarLeft01HugeIcon,
  SidebarRight01Icon as SidebarRight01HugeIcon,
  Menu11Icon as Menu11HugeIcon,
  AiChat01Icon as Chat01HugeIcon,
  Orbit01Icon,
  Note02Icon as Note02HugeIcon,
  Alert02Icon as Alert02HugeIcon,
  TipsIcon as TipsHugeIcon,
  TaskDaily02Icon as TaskDaily02HugeIcon,
  PinIcon as PinHugeIcon,
  PinOffIcon as PinOffHugeIcon,
  PlusSignCircleIcon as PlusSignCircleHugeIcon,
  // Agent icon variations for testing
  AiBrain01Icon,
  AiBrain02Icon,
  AiBrain03Icon,
  AiBrain05Icon,
  MachineRobotIcon,
  RoboticIcon,
  CopilotIcon,
  NeuralNetworkIcon,
  AiChat02Icon,
} from "hugeicons-react";

import { cn } from "@/lib/utils";
// Additional icons
// Note: NoSignal icon isn't available in current hugeicons version; using SignalIcon as a fallback
import { SignalIcon as NoSignalHugeIcon } from "hugeicons-react";

// ============================================
// SIZE SYSTEM
// ============================================

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl" | number;

const DEFAULT_ICON_SIZE: IconSize = "sm";

const SIZE_MAP: Record<string, number> = {
  xs: 16, // size-4
  sm: 20, // size-5
  md: 24, // size-6
  lg: 28, // size-7
  xl: 32, // size-8
};

const getSizeValue = (size?: IconSize): number => {
  if (size === undefined) return getSizeValue(DEFAULT_ICON_SIZE);
  if (typeof size === "number") return size;
  return SIZE_MAP[size] || SIZE_MAP.md;
};

const getSizeClass = (size?: IconSize): string => {
  if (size === undefined) return getSizeClass(DEFAULT_ICON_SIZE);
  if (typeof size === "number") return "";
  const sizeClasses = {
    xs: "size-4",
    sm: "size-5",
    md: "size-6",
    lg: "size-7",
    xl: "size-8",
  };
  return sizeClasses[size] || sizeClasses.md;
};

// Base icon props type with standardized sizing
export interface AppIconProps
  extends Omit<React.SVGProps<SVGSVGElement>, "width" | "height"> {
  size?: IconSize;
  strokeWidth?: number;
}

// ============================================
// ICON WRAPPER COMPONENT
// ============================================

const IconWrapper: React.FC<{
  icon: React.ComponentType<any>;
  size?: IconSize;
  className?: string;
  [key: string]: any;
}> = ({
  icon: IconComponent,
  size, // No default here - handled in getSizeValue
  className,
  ...props
}) => {
  const sizeValue = getSizeValue(size);
  const sizeClass = getSizeClass(size);

  return (
    <IconComponent
      width={sizeValue}
      height={sizeValue}
      className={cn(sizeClass, className)}
      {...props}
    />
  );
};

// Chat icon for segmented control
export const ChatIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Chat01HugeIcon}
    {...props}
  />
);

// ============================================
// SIDEBAR & NAVIGATION ICONS
// ============================================

export const SidebarIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={SidebarLeftIcon}
    {...props}
  />
);

export const RepeatResponseIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={RepeatIcon}
    {...props}
  />
);

export const UnfoldIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={UnfoldMoreIcon}
    {...props}
  />
);

export const FoldIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={UnfoldLessIcon}
    {...props}
  />
);

// ============================================
// FEATURE ICONS
// ============================================

export const AgentIconComplex: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={ChatBotIcon}
    {...props}
  />
);

// Agent Icon Variations for Testing
export const AgentIcon1: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={AiBrain01Icon}
    {...props}
  />
);

export const AgentIcon2: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={AiBrain02Icon}
    {...props}
  />
);

export const AgentIcon3: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={AiBrain03Icon}
    {...props}
  />
);

export const AgentBrainCPU: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={AiBrain05Icon}
    {...props}
  />
);

export const AgentIcon5: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={MachineRobotIcon}
    {...props}
  />
);

export const AgentIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={RoboticIcon}
    {...props}
  />
);

export const AgentIcon7: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={CopilotIcon}
    {...props}
  />
);

export const AgentIcon8: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={NeuralNetworkIcon}
    {...props}
  />
);

export const AgentChat: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={AiChat02Icon}
    {...props}
  />
);

export const SearchIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Search01Icon}
    {...props}
  />
);

export const AttachIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={AttachmentIcon}
    {...props}
  />
);

export const SettingsIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Settings03Icon}
    {...props}
  />
);

export const ToolsIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Wrench01Icon}
    {...props}
  />
);

export const RAGIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={AiBrain04Icon}
    {...props}
  />
);

export const NewThreadIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={PencilEdit02Icon}
    {...props}
  />
);

// ============================================
// THEME ICONS
// ============================================

export const LightThemeIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Sun01Icon}
    {...props}
  />
);

export const DarkThemeIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Moon02Icon}
    {...props}
  />
);

export const SystemThemeIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={ComputerIcon}
    {...props}
  />
);

// ============================================
// ACTION ICONS
// ============================================

export const LogOutIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Logout05Icon}
    {...props}
  />
);

export const SendIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={SentIcon}
    {...props}
  />
);

export const CopyIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Copy01Icon}
    {...props}
  />
);

export const Copy02Icon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Copy02HugeIcon}
    {...props}
  />
);

export const EditIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Edit01Icon}
    {...props}
  />
);

export const CancelIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Cancel01Icon}
    {...props}
  />
);

export const StopIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={StopHugeIcon}
    {...props}
  />
);

// ============================================
// DESTRUCTIVE ICONS (Custom Styled)
// ============================================

export const DeleteIcon: React.FC<AppIconProps> = ({ className, ...props }) => (
  <IconWrapper
    icon={Delete03Icon}
    className={cn("text-destructive", className)}
    {...props}
  />
);

// ============================================
// NAVIGATION & INTERACTION ICONS
// ============================================

export const ArrowDownIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={ArrowDown01Icon}
    {...props}
  />
);

export const ArrowLeftIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={ArrowLeft01Icon}
    {...props}
  />
);

export const ArrowRightIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={ArrowRight01Icon}
    {...props}
  />
);

export const CheckmarkCircleIcon: React.FC<AppIconProps> = ({
  className,
  ...props
}) => (
  <IconWrapper
    icon={CheckmarkCircle04Icon}
    className={cn("text-green-600", className)}
    {...props}
  />
);

export const GitBranchIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={GitBranchHugeIcon}
    {...props}
  />
);

export const MoreVerticalMenuIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={MoreVerticalCircle01Icon}
    {...props}
  />
);

// ============================================
// STATUS / EMPTY STATE ICONS
// ============================================

export const NoSignalIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={NoSignalHugeIcon}
    {...props}
  />
);

// ============================================
// SIDEBAR STATE ICONS (Left/Right/Menu)
// ============================================
export const SidebarLeft01Icon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={SidebarLeft01HugeIcon}
    {...props}
  />
);

export const SidebarRight01Icon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={SidebarRight01HugeIcon}
    {...props}
  />
);

export const Menu11Icon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Menu11HugeIcon}
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

export const OrbitIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Orbit01Icon}
    {...props}
  />
);

// ============================================
// CALLOUT ICONS
// ============================================

export const Note02Icon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Note02HugeIcon}
    {...props}
  />
);

export const Alert02Icon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Alert02HugeIcon}
    {...props}
  />
);

export const TipsIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={TipsHugeIcon}
    {...props}
  />
);

export const TaskDaily02Icon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={TaskDaily02HugeIcon}
    {...props}
  />
);

// ============================================
// PIN ICONS
// ============================================

export const PinIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={PinHugeIcon}
    {...props}
  />
);

export const PinOffIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={PinOffHugeIcon}
    {...props}
  />
);

export const PlusSignIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={PlusSignCircleHugeIcon}
    {...props}
  />
);

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
  Tools: ToolsIcon,
  RAG: RAGIcon,
  NewThread: NewThreadIcon,
  LightTheme: LightThemeIcon,
  DarkTheme: DarkThemeIcon,
  SystemTheme: SystemThemeIcon,
  LogOut: LogOutIcon,
  Send: SendIcon,
  Copy: CopyIcon,
  Copy02: Copy02Icon,
  Edit: EditIcon,
  Cancel: CancelIcon,
  Delete: DeleteIcon,
  MoreVerticalMenu: MoreVerticalMenuIcon,
  NoSignal: NoSignalIcon,
  SidebarLeft01: SidebarLeft01Icon,
  SidebarRight01: SidebarRight01Icon,
  Menu11: Menu11Icon,
  Chat: ChatIcon,
  Orbit: OrbitIcon,
  Note02: Note02Icon,
  Alert02: Alert02Icon,
  Tips: TipsIcon,
  TaskDaily02: TaskDaily02Icon,
  Pin: PinIcon,
  PinOff: PinOffIcon,
};
