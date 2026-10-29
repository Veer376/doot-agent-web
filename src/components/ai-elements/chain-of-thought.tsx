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
  CursorProgress01Icon,
  ChevronDownIcon,
  DotIcon,
  type AppIconComponent as LucideIcon,
} from "@/components/icons";
import {
  createContext,
  memo,
  useContext,
  useMemo,
  useEffect,
  useRef,
  type ComponentProps,
} from "react";
import { motion, AnimatePresence, type HTMLMotionProps } from "framer-motion";

interface ChainOfThoughtContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const ChainOfThoughtContext = createContext<ChainOfThoughtContextValue | null>(
  null,
);

const useChainOfThought = () => {
  const context = useContext(ChainOfThoughtContext);
  if (!context) {
    throw new Error(
      "ChainOfThought components must be used within ChainOfThought",
    );
  }
  return context;
};

export type ChainOfThoughtProps = ComponentProps<"div"> & {
  processing?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const ChainOfThought = memo(
  ({
    className,
    open,
    defaultOpen = false,
    processing,
    onOpenChange,
    children,
    ...props
  }: ChainOfThoughtProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      prop: open,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });
    const wasProcessing = useRef(processing);

    useEffect(() => {
      if (processing === true) {
        setIsOpen(true);
      } else if (wasProcessing.current === true && processing === false) {
        setIsOpen(false);
      }
      wasProcessing.current = processing;
    }, [processing, setIsOpen]);

    const chainOfThoughtContext = useMemo(
      () => ({
        isOpen: processing || isOpen,
        setIsOpen: (value: boolean) => {
          if (!processing) setIsOpen(value);
        },
      }),
      [isOpen, setIsOpen, processing],
    );

    return (
      <ChainOfThoughtContext.Provider value={chainOfThoughtContext}>
        <div
          className={cn("doot-worked not-prose max-w-prose py-1", className)}
          {...props}
        >
          {children}
        </div>
      </ChainOfThoughtContext.Provider>
    );
  },
);

export type ChainOfThoughtHeaderProps = ComponentProps<
  typeof CollapsibleTrigger
>;

export const ChainOfThoughtHeader = memo(
  ({ className, children, ...props }: ChainOfThoughtHeaderProps) => {
    const { isOpen, setIsOpen } = useChainOfThought();

    return (
      <Collapsible
        onOpenChange={setIsOpen}
        open={isOpen}
      >
        <CollapsibleTrigger
          className={cn(
            "group/worked text-muted-foreground hover:text-foreground flex w-full items-center gap-2 text-sm transition-colors",
            className,
          )}
          {...props}
        >
          {/* Work-progress icon by default, disclosure arrow on hover. */}
          <div className="relative size-4">
            <CursorProgress01Icon
              className={cn(
                "absolute inset-0 size-4 transition-opacity",
                "opacity-100 group-hover/worked:opacity-0",
              )}
            />
            <ChevronDownIcon
              className={cn(
                "absolute inset-0 size-4 transition-all",
                "opacity-0 group-hover/worked:opacity-100",
                isOpen ? "rotate-180" : "rotate-0",
              )}
            />
          </div>
          <span className="text-left">{children ?? "Worked"}</span>
        </CollapsibleTrigger>
      </Collapsible>
    );
  },
);

export type ChainOfThoughtStepProps = Omit<
  HTMLMotionProps<"div">,
  "children"
> & {
  icon?: LucideIcon | React.ComponentType<any>;
  label: string;
  description?: string;
  status?: "complete" | "active" | "pending";
  isPreview?: boolean; // Hide connecting line in preview mode
  children?: React.ReactNode;
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
            ease: [0.16, 1, 0.3, 1],
          },
        }}
        className={cn("flex gap-2 text-sm", statusStyles[status], className)}
        {...props}
      >
        <div className="relative mt-1">
          {Icon === DotIcon ? (
            <span className="flex size-4 items-center justify-center">
              <span className="size-1 rounded-full bg-current" />
            </span>
          ) : (
            <Icon className="size-4" />
          )}
          {/* Hide connecting line in preview mode */}
          {!isPreview && (
            <div className="bg-border absolute top-7 bottom-0 left-1/2 -mx-px w-px" />
          )}
        </div>
        <div className="flex-1">
          {label && <div>{label}</div>}
          {description && (
            <div className="text-muted-foreground text-xs">{description}</div>
          )}
          {children}
        </div>
      </motion.div>
    );
  },
);

export type ChainOfThoughtSearchResultsProps = ComponentProps<"div">;

export const ChainOfThoughtSearchResults = memo(
  ({ className, ...props }: ChainOfThoughtSearchResultsProps) => (
    <div
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  ),
);

export type ChainOfThoughtSearchResultProps = ComponentProps<typeof Badge>;

export const ChainOfThoughtSearchResult = memo(
  ({ className, children, ...props }: ChainOfThoughtSearchResultProps) => (
    <Badge
      className={cn("gap-1 px-2 py-0.5 text-xs font-normal", className)}
      variant="secondary"
      {...props}
    >
      {children}
    </Badge>
  ),
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
            "text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 outline-none",
            className,
          )}
          {...props}
        >
          {children}
        </CollapsibleContent>
      </Collapsible>
    );
  },
);

export type ChainOfThoughtPreviewProps = ComponentProps<"div"> & {
  showPreview?: boolean; // Explicitly control preview visibility from parent
  contentKey?: string; // Key to trigger smooth transitions when content changes
};

export const ChainOfThoughtPreview = memo(
  ({
    className,
    children,
    showPreview = false,
    contentKey,
    ...props
  }: ChainOfThoughtPreviewProps) => {
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
              ease: [0.16, 1, 0.3, 1], // Smooth easeOutExpo
            },
          }}
          exit={{
            opacity: 0,
            y: -12,
            scale: 0.96,
            transition: {
              duration: 0.4,
              ease: [0.7, 0, 0.84, 0], // Smooth easeInExpo
            },
          }}
          className={cn("mt-2 space-y-1 overflow-hidden", className)}
        >
          <div {...props}>{children}</div>
        </motion.div>
      </AnimatePresence>
    );
  },
);

export type ChainOfThoughtImageProps = ComponentProps<"div"> & {
  caption?: string;
};

export const ChainOfThoughtImage = memo(
  ({ className, children, caption, ...props }: ChainOfThoughtImageProps) => (
    <div
      className={cn("mt-2 space-y-2", className)}
      {...props}
    >
      <div
        data-radius="surface"
        className="bg-muted relative flex max-h-[22rem] items-center justify-center overflow-hidden p-3"
      >
        {children}
      </div>
      {caption && <p className="text-muted-foreground text-xs">{caption}</p>}
    </div>
  ),
);

ChainOfThought.displayName = "ChainOfThought";
ChainOfThoughtHeader.displayName = "ChainOfThoughtHeader";
ChainOfThoughtStep.displayName = "ChainOfThoughtStep";
ChainOfThoughtSearchResults.displayName = "ChainOfThoughtSearchResults";
ChainOfThoughtSearchResult.displayName = "ChainOfThoughtSearchResult";
ChainOfThoughtContent.displayName = "ChainOfThoughtContent";
ChainOfThoughtPreview.displayName = "ChainOfThoughtPreview";
ChainOfThoughtImage.displayName = "ChainOfThoughtImage";
