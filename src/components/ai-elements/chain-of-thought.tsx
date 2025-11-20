"use client";

import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  BrainIcon,
  ChevronDownIcon,
  DotIcon,
  type LucideIcon,
} from "lucide-react";
import type { ComponentProps } from "react";
import { createContext, memo, useContext, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ChainOfThoughtContextValue = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};

const ChainOfThoughtContext = createContext<ChainOfThoughtContextValue | null>(
  null
);

const useChainOfThought = () => {
  const context = useContext(ChainOfThoughtContext);
  if (!context) {
    throw new Error(
      "ChainOfThought components must be used within ChainOfThought"
    );
  }
  return context;
};

export type ChainOfThoughtProps = ComponentProps<"div"> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const ChainOfThought = memo(
  ({
    className,
    open,
    defaultOpen = false,
    onOpenChange,
    children,
    ...props
  }: ChainOfThoughtProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      prop: open,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });

    const chainOfThoughtContext = useMemo(
      () => ({ isOpen, setIsOpen }),
      [isOpen, setIsOpen]
    );

    return (
      <ChainOfThoughtContext.Provider value={chainOfThoughtContext}>
        <div
          className={cn("not-prose max-w-prose py-1", className)}
          {...props}
        >
          {children}
        </div>
      </ChainOfThoughtContext.Provider>
    );
  }
);

export type ChainOfThoughtHeaderProps = ComponentProps<
  typeof CollapsibleTrigger
>;

export const ChainOfThoughtHeader = memo(
  ({ className, children, ...props }: ChainOfThoughtHeaderProps) => {
    const { isOpen, setIsOpen } = useChainOfThought();

    return (
      <Collapsible onOpenChange={setIsOpen} open={isOpen}>
        <CollapsibleTrigger
          className={cn(
            "flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground",
            className
          )}
          {...props}
        >
          <BrainIcon className="size-4" />
          {/* Group text and chevron together so arrow stays next to text */}
          <span className="inline-flex items-center gap-2">
            <span className="text-left">{children ?? "Chain of Thought"}</span>
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform",
                isOpen ? "rotate-180" : "rotate-0"
              )}
            />
          </span>
        </CollapsibleTrigger>
      </Collapsible>
    );
  }
);

export type ChainOfThoughtStepProps = ComponentProps<"div"> & {
  icon?: LucideIcon | React.ComponentType<any>;
  label: string;
  description?: string;
  status?: "complete" | "active" | "pending";
  isPreview?: boolean; // Hide connecting line in preview mode
};

export const ChainOfThoughtStep = memo(
  ({
    className,
    icon: Icon = DotIcon,
    label,
    description,
    status = "complete",
    isPreview = false,
    children,
    ...props
  }: ChainOfThoughtStepProps) => {
    const statusStyles = {
      complete: "text-muted-foreground",
      active: "text-foreground",
      pending: "text-muted-foreground/50",
    };

    return (
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ 
          opacity: 1, 
          x: 0,
          transition: { 
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1]
          }
        }}
        className={cn(
          "flex gap-2 text-sm",
          statusStyles[status],
          className
        )}
        {...props}
      >
        <div className="relative mt-0.5">
          <Icon className="size-4" />
          {/* Hide connecting line in preview mode */}
          {!isPreview && (
            <div className="-mx-px absolute top-7 bottom-0 left-1/2 w-px bg-border" />
          )}
        </div>
        <div className="flex-1">
          <div>{label}</div>
          {description && (
            <div className="text-muted-foreground text-xs">{description}</div>
          )}
          {children}
        </div>
      </motion.div>
    );
  }
);

export type ChainOfThoughtSearchResultsProps = ComponentProps<"div">;

export const ChainOfThoughtSearchResults = memo(
  ({ className, ...props }: ChainOfThoughtSearchResultsProps) => (
    <div className={cn("flex items-center gap-2", className)} {...props} />
  )
);

export type ChainOfThoughtSearchResultProps = ComponentProps<typeof Badge>;

export const ChainOfThoughtSearchResult = memo(
  ({ className, children, ...props }: ChainOfThoughtSearchResultProps) => (
    <Badge
      className={cn("gap-1 px-2 py-0.5 font-normal text-xs", className)}
      variant="secondary"
      {...props}
    >
      {children}
    </Badge>
  )
);

export type ChainOfThoughtContentProps = ComponentProps<
  typeof CollapsibleContent
>;

export const ChainOfThoughtContent = memo(
  ({ className, children, ...props }: ChainOfThoughtContentProps) => {
    const { isOpen } = useChainOfThought();

    return (
      <Collapsible open={isOpen}>
        <CollapsibleContent
          className={cn(
            "mt-2 space-y-1",
            "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
            className
          )}
          {...props}
        >
          {children}
        </CollapsibleContent>
      </Collapsible>
    );
  }
);

export type ChainOfThoughtPreviewProps = ComponentProps<"div"> & {
  showPreview?: boolean; // Explicitly control preview visibility from parent
  contentKey?: string; // Key to trigger smooth transitions when content changes
};

export const ChainOfThoughtPreview = memo(
  ({ className, children, showPreview = false, contentKey, ...props }: ChainOfThoughtPreviewProps) => {
    const { isOpen } = useChainOfThought();

    // Hide preview if user manually expands or if parent says not to show
    if (isOpen || !showPreview) return null;

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={contentKey || "preview"}
          initial={{ opacity: 0, y: -12, scale: 0.96 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            scale: 1,
            transition: { 
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1] // Smooth easeOutExpo
            }
          }}
          exit={{
            opacity: 0,
            y: -12,
            scale: 0.96,
            transition: { 
              duration: 0.4,
              ease: [0.7, 0, 0.84, 0] // Smooth easeInExpo
            }
          }}
          className={cn("mt-2 space-y-1 overflow-hidden", className)}
        >
          <div {...props}>
            {children}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }
);

export type ChainOfThoughtImageProps = ComponentProps<"div"> & {
  caption?: string;
};

export const ChainOfThoughtImage = memo(
  ({ className, children, caption, ...props }: ChainOfThoughtImageProps) => (
    <div className={cn("mt-2 space-y-2", className)} {...props}>
      <div className="relative flex max-h-[22rem] items-center justify-center overflow-hidden rounded-lg bg-muted p-3">
        {children}
      </div>
      {caption && <p className="text-muted-foreground text-xs">{caption}</p>}
    </div>
  )
);

ChainOfThought.displayName = "ChainOfThought";
ChainOfThoughtHeader.displayName = "ChainOfThoughtHeader";
ChainOfThoughtStep.displayName = "ChainOfThoughtStep";
ChainOfThoughtSearchResults.displayName = "ChainOfThoughtSearchResults";
ChainOfThoughtSearchResult.displayName = "ChainOfThoughtSearchResult";
ChainOfThoughtContent.displayName = "ChainOfThoughtContent";
ChainOfThoughtPreview.displayName = "ChainOfThoughtPreview";
ChainOfThoughtImage.displayName = "ChainOfThoughtImage";
