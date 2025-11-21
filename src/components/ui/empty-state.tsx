import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { motion } from "framer-motion";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  className?: string;
}

/**
 * EmptyState Component
 * 
 * A reusable component for displaying empty states throughout the application.
 * Uses data-radius="radius2" for consistent border radius and proper elevation.
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   icon={MessageCircleIcon}
 *   title="No messages yet"
 *   description="Start a conversation to see messages appear here"
 *   action={{
 *     label: "Start conversation",
 *     onClick: () => console.log('Start'),
 *   }}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="flex flex-col items-center space-y-4 max-w-sm">
        {/* Icon container with subtle background */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
          data-radius="radius2"
          data-elevation="1"
          className="bg-muted/50 p-6 mb-2"
        >
          <Icon className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
          className="space-y-2"
        >
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </motion.div>

        {/* Optional action button */}
        {action && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
          >
            <Button
              variant={action.variant || "default"}
              onClick={action.onClick}
              className="mt-4"
            >
              {action.label}
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
