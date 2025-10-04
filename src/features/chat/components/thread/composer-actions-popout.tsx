"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CirclePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AttachIcon } from "@/components/icons";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { IconAgentSelector } from "./icon-agent-selector";

interface ComposerActionsPopOutProps {
  onFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export function ComposerActionsPopOut({
  onFileUpload,
  className,
}: ComposerActionsPopOutProps) {
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const containerVariants = {
    collapsed: {
      width: "43px",
      transition: {
        type: "spring" as const,
        stiffness: 500,
        damping: 30,
      },
    },
    expanded: {
      width: "86px",
      transition: {
        type: "spring" as const,
        stiffness: 500,
        damping: 30,
      },
    },
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <motion.div //container-action_popout-radius
      className={cn(
        "bg-background border-border flex h-10 items-center justify-start overflow-hidden rounded-3xl border",
        className,
      )}
      variants={containerVariants}
      initial="collapsed"
      animate={isHovered ? "expanded" : "collapsed"}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="flex h-full items-center"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
      >
        {/* Agent Selector - always visible */}
        <div className="flex h-10 w-10 flex-shrink-10 items-center justify-center">
          <IconAgentSelector />
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onFileUpload}
          accept="image/*,.pdf,.txt,.doc,.docx,.csv,.json"
        />

        {/* File attach button - appears on hover */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{
                type: "spring" as const,
                stiffness: 500,
                damping: 30,
              }}
            >
              <TooltipIconButton
                tooltip="Attach file"
                onClick={handleFileClick}
                className=""
              >
                <AttachIcon />
              </TooltipIconButton>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
