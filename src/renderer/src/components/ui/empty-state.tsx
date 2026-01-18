import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { motion } from "framer-motion";

export interface EmptyStateProps {
  icon: React.ComponentType<any>;
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
        "flex flex-col items-center justify-center px-4 py-12 text-center",
        className,
      )}
    >
      <div className="flex max-w-sm flex-col items-center space-y-4">
        {/* Icon container with subtle background */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
          data-radius="radius2"
          data-elevation="1"
          className="bg-muted/50 mb-2 p-6"
        >
          <Icon
            className="text-muted-foreground h-12 w-12"
            strokeWidth={1.5}
          />
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
          className="space-y-2"
        >
          <h3 className="text-foreground text-lg font-semibold">{title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
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
