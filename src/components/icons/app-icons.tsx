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
  CheckmarkCircle02Icon,
  Tick02Icon,
  GitBranchIcon as GitBranchHugeIcon,
  MoreHorizontalIcon,
  AiBrain04Icon,
  Wrench01Icon,
  SidebarLeft01Icon as SidebarLeft01HugeIcon,
  SidebarRight01Icon as SidebarRight01HugeIcon,
  Menu11Icon as Menu11HugeIcon,
  AiChat01Icon as Chat01HugeIcon,
  Orbit01Icon as Doot01Icon,
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
  Download02Icon,
  Pdf01Icon,
  Loading03Icon,
  ArrowUp01Icon,
  PlusSignIcon as PlusSignHugeIcon,
  MultiplicationSignIcon,
  AlertCircleIcon as AlertCircleHugeIcon,
  File02Icon,
  Image02Icon,
  UserIcon,
  Delete02Icon,
  ViewIcon,
  ViewOffSlashIcon,
  StarIcon as StarHugeIcon,
  Home01Icon,
  LinkSquare02Icon,
  MessageNotification02Icon,
  Layers01Icon,
  TriangleIcon,
  CircleIcon as CircleHugeIcon,
  Resize01Icon,
  ElectricPlugsIcon,
  Idea01Icon,
  CancelCircleIcon,
  DocumentCodeIcon,
  MoreVerticalIcon as MoreVerticalHugeIcon,
  InboxIcon as InboxHugeIcon,
  ZapIcon,
  Clock01Icon,
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
    icon={CheckmarkCircle02Icon}
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
    icon={MoreHorizontalIcon}
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

// ============================================
// CUSTOM DOOT ICONS
// ============================================

/**
 * Static Doot Logo Icon (for sidebar header)
 * Two overlapping circles representing "oo" - theme-aware styling
 */
export const DootLogoIcon: React.FC<AppIconProps> = ({
  size,
  className,
  ...props
}) => {
  const sizeValue = getSizeValue(size || 24); // Default to larger size for sidebar

  return (
    <svg
      width={sizeValue}
      height={sizeValue}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="DootAgent"
      className={cn(getSizeClass(size), className)}
      {...props}
    >
      {/* Left circle - overlapping circle with stroke to create gap */}
      <circle
        className="fill-foreground dark:fill-foreground stroke-background dark:stroke-background"
        strokeWidth="3"
        cx="43"
        cy="60"
        r="26"
      />
      {/* Right circle - base circle */}
      <circle
        className="fill-foreground dark:fill-foreground stroke-background dark:stroke-background"
        strokeWidth="3"
        cx="78"
        cy="60"
        r="26"
      />
    </svg>
  );
};

/**
 * Animated Doot Loader Icon (for loading states)
 * Two overlapping circles with left circle orbiting around the right - theme-aware styling
 */
export const DootLoaderIcon: React.FC<AppIconProps> = ({
  size,
  className,
  ...props
}) => {
  const sizeValue = getSizeValue(size);

  return (
    <svg
      width={sizeValue}
      height={sizeValue}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Doot Loader"
      className={cn(getSizeClass(size), className)}
      {...props}
    >
      <style>{`
        @keyframes doot-rotation {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .doot-satellite-group {
          transform-origin: 78px 60px;
          animation: doot-rotation 1.2s cubic-bezier(0.85, 0.07, 0.15, 0.93) infinite;
        }
      `}</style>

      {/* Left circle - orbiting satellite with stroke to create separation */}
      <g className="doot-satellite-group">
        <circle
          className="fill-foreground dark:fill-foreground stroke-background dark:stroke-background"
          strokeWidth="3"
          cx="43"
          cy="60"
          r="26"
        />
        {/* Right circle - stationary base circle */}
        <circle
          className="fill-foreground dark:fill-foreground"
          strokeWidth="3"
          cx="78"
          cy="60"
          r="26"
        />
      </g>
    </svg>
  );
};

// Keep the HugeIcons orbit icon for backwards compatibility
export const DootIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Doot01Icon}
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

export const DownloadIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Download02Icon}
    {...props}
  />
);

export const PdfIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Pdf01Icon}
    {...props}
  />
);

// ============================================
// COMMON ICONS (Lucide Replacements)
// ============================================

/**
 * Loader Icon - replaces lucide Loader2 and LoaderCircle
 * Animated spinning loader
 */
export const LoaderIcon: React.FC<AppIconProps> = ({ className, ...props }) => (
  <IconWrapper
    icon={Loading03Icon}
    className={cn("animate-spin", className)}
    {...props}
  />
);

/**
 * Chevron Icons - for dropdowns, accordions, navigation
 */
export const ChevronUpIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={ArrowUp01Icon}
    {...props}
  />
);

export const ChevronDownIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={ArrowDown01Icon}
    {...props}
  />
);

export const ChevronLeftIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={ArrowLeft01Icon}
    {...props}
  />
);

export const ChevronRightIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={ArrowRight01Icon}
    {...props}
  />
);

/**
 * Plus Icon - for adding items
 */
export const PlusIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={PlusSignHugeIcon}
    {...props}
  />
);

/**
 * PlusCircle Icon - for add buttons
 */
export const PlusCircleIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={PlusSignCircleHugeIcon}
    {...props}
  />
);

/**
 * X/Close Icon - for closing dialogs, removing items
 */
export const XIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={MultiplicationSignIcon}
    {...props}
  />
);

export const CloseIcon: React.FC<AppIconProps> = XIcon;

/**
<<<<<<< Updated upstream
=======
 * Alert/Warning Icons
 */
export const AlertCircleIconHuge: React.FC<AppIconProps> = ({
  className,
  ...props
}) => (
  <IconWrapper
    icon={AlertCircleHugeIcon}
    className={cn("text-yellow-600", className)}
    {...props}
  />
);

export const TriangleAlertIcon: React.FC<AppIconProps> = ({
  className,
  ...props
}) => (
  <IconWrapper
    icon={TriangleIcon}
    className={cn("text-yellow-600", className)}
    {...props}
  />
);

/**
>>>>>>> Stashed changes
 * File & Image Icons
 */
export const FileIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={File02Icon}
    {...props}
  />
);

export const FileTextIcon: React.FC<AppIconProps> = FileIcon;

export const ImageIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Image02Icon}
    {...props}
  />
);

/**
 * User Icon
 */
export const UserIconHuge: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={UserIcon}
    {...props}
  />
);

/**
 * Trash Icon - additional delete icon
 */
export const TrashIcon: React.FC<AppIconProps> = ({ className, ...props }) => (
  <IconWrapper
    icon={Delete02Icon}
    className={cn("text-destructive", className)}
    {...props}
  />
);

/**
 * Eye Icons - for password visibility toggle
 */
export const EyeIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={ViewIcon}
    {...props}
  />
);

export const EyeOffIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={ViewOffSlashIcon}
    {...props}
  />
);

/**
 * Star Icon - for favorites/ratings
 */
export const StarIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={StarHugeIcon}
    {...props}
  />
);

/**
 * Home Icon
 */
export const HomeIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Home01Icon}
    {...props}
  />
);

/**
 * External Link Icon
 */
export const ExternalLinkIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={LinkSquare02Icon}
    {...props}
  />
);

/**
 * Message Icon
 */
export const MessageSquareIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={MessageNotification02Icon}
    {...props}
  />
);

/**
 * Layers Icon
 */
export const LayersIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Layers01Icon}
    {...props}
  />
);

/**
 * Circle Icon
 */
export const CircleIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={CircleHugeIcon}
    {...props}
  />
);

/**
 * GripVertical Icon - for resizable handles
 */
export const GripVerticalIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Resize01Icon}
    {...props}
  />
);

/**
 * Plug Icon - for integrations/plugins
 */
export const Plug2Icon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={ElectricPlugsIcon}
    {...props}
  />
);

/**
 * Lightbulb Icon - for ideas/tips
 */
export const LightbulbIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Idea01Icon}
    {...props}
  />
);

/**
 * MoreVertical Icon - vertical ellipsis menu
 */
export const MoreVerticalIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={MoreVerticalHugeIcon}
    {...props}
  />
);

export const EllipsisVerticalIcon: React.FC<AppIconProps> = MoreVerticalIcon;

/**
 * MoreHorizontal Icon - horizontal ellipsis menu
 */
export const MoreHorizontalIconWrapper: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={MoreHorizontalIcon}
    {...props}
  />
);

/**
 * ChevronsUpDown Icon - for sorting/combo boxes
 */
export const ChevronsUpDownIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={UnfoldMoreIcon}
    {...props}
  />
);

export const ChevronsDownUpIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={UnfoldLessIcon}
    {...props}
  />
);

/**
 * CircleX Icon - circle with X
 */
export const CircleXIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={CancelCircleIcon}
    {...props}
  />
);

/**
 * FileJson Icon - JSON file
 */
export const FileJsonIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={DocumentCodeIcon}
    {...props}
  />
);

/**
 * Inbox Icon
 */
export const InboxIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={InboxHugeIcon}
    {...props}
  />
);

/**
 * Clock Icon
 */
export const ClockIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Clock01Icon}
    {...props}
  />
);

/**
 * CheckCircle Icon - checkmark in circle
 */
export const CheckCircleIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={CheckmarkCircle02Icon}
    {...props}
  />
);

/**
 * Check Icon - for checkboxes
 */
export const CheckIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Tick02Icon}
    {...props}
  />
);

/**
 * Copy Icons
 */
export const CopyIconAlt: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={Copy01Icon}
    {...props}
  />
);

export const CopyCheckIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={CheckmarkCircle02Icon}
    {...props}
  />
);

/**
 * ZapOff Icon - lightning crossed out
 */
export const ZapOffIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={ZapIcon}
    className={cn("opacity-50", props.className)}
    {...props}
  />
);

/**
 * Undo Icon
 */
export const Undo2Icon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={RepeatIcon}
    {...props}
  />
);

/**
 * Trash2 Icon - alternative trash
 */
export const Trash2Icon: React.FC<AppIconProps> = TrashIcon;

/**
 * Save Icon - uses Sent/Check icon
 */
export const SaveIcon: React.FC<AppIconProps> = (props) => (
  <IconWrapper
    icon={SentIcon}
    {...props}
  />
);

/**
 * House Icon - home alternative
 */
export const HouseIcon: React.FC<AppIconProps> = HomeIcon;

// Named exports for individual icon components (used with import { IconName })
export // These are already exported above as component definitions, just listing here for clarity
// LoaderIcon, ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon,
// PlusIcon, PlusCircleIcon, XIcon, CloseIcon, AlertCircleIconHuge, TriangleAlertIcon,
// FileIcon, FileTextIcon, ImageIcon, UserIconHuge, TrashIcon, EyeIcon, EyeOffIcon,
// StarIcon, HomeIcon, ExternalLinkIcon, MessageSquareIcon, LayersIcon, CircleIcon
 {};

// Default export object for convenient access
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
  Orbit: DootIcon,
  OrbitLogo: DootLogoIcon,
  OrbitLoader: DootLoaderIcon,
  Note02: Note02Icon,
  Alert02: Alert02Icon,
  Tips: TipsIcon,
  TaskDaily02: TaskDaily02Icon,
  Pin: PinIcon,
  PinOff: PinOffIcon,
};
