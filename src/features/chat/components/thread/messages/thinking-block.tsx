"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown01Icon } from "hugeicons-react";
import { AiBrain03Icon, CheckmarkSquare01Icon } from "hugeicons-react";
import { CheckmarkCircleIcon } from "@/components/icons"

interface ThinkingStep {
  heading: string;
  content: string;
}

interface ThinkingBlockProps {
  thinkingBlocks: ThinkingStep[];
  usageMetadata?: any; // For showing token count
}

export function ThinkingBlock({ thinkingBlocks, usageMetadata }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get thinking token count from usage metadata
  const thinkingTokens = usageMetadata?.output_token_details?.reasoning || 0;
  
  // Get summary from last thinking block heading
  const summary = thinkingBlocks.length > 0 
    ? thinkingBlocks[thinkingBlocks.length - 1].heading 
    : "Thinking...";

  return (
    <div className="w-full pb-2">
      {/* Minimal header - just icon, text, token count, dropdown */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex w-full items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
      >
        {/* Icon */}
        <AiBrain03Icon 
          className="h-5 w-5 flex-shrink-0"
        />

        {/* Title TODO: Only if isThinking */}
        <span className="text-left font-normal">
          {summary}
        </span>

        {/* Token count */}
        {thinkingTokens > 0 && (
          <span className="text-xs font-mono flex-shrink-0">
            ({thinkingTokens} Tokens)
          </span>
        )}

        {/* Dropdown chevron */}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ArrowDown01Icon className="h-4 w-4" />
        </motion.div>
      </button>

      {/* Collapsible Content - Chain of Thoughts Timeline */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 ml-2">
              {/* Chain of thoughts timeline */}
              <div className="relative">
                {thinkingBlocks.map((block, index) => {
                  const isLast = index === thinkingBlocks.length - 1;
                  
                  return (
                    <div key={index} className="relative flex gap-3 pb-2">
                      {/* Vertical line and dot */}
                      <div className="relative flex flex-col items-center">
                        {/* Unicode dot character */}
                        <div className="relative z-10 flex items-center justify-center text-muted-foreground leading-none">
                          •
                        </div>
                        
                        {/* Vertical line (only if not last) */}
                        {!isLast && (
                          <div className="absolute top-3 h-full w-px bg-border" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 -mt-0.5">
                        {/* Heading and Content together without gap */}
                        <div className="font-normal text-xs text-muted-foreground">
                          {block.heading}
                        </div>
                        {block.content && block.content.length > 0 && (
                          <div className="text-xs text-muted-foreground/70 leading-relaxed whitespace-pre-wrap">
                            {block.content}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Final "Done" indicator */}
                <div className="relative flex gap-3">
                  <div className="relative flex flex-col items-center">
                    {/* Unicode checkmark */}
                    <CheckmarkCircleIcon className="h-3 w-3" />
                  </div>
                  
                  <div className="flex-1 -mt-0.5">
                    <div className="font-normal text-xs text-muted-foreground/70">
                      Done
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
