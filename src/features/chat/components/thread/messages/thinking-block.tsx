"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown01Icon } from "hugeicons-react";
import { NeuralNetworkIcon } from "hugeicons-react";
import { CheckmarkCircleIcon } from "@/components/icons";
import { ToolContainer } from "@/components/ai-elements/tool-container";

interface ThinkingStep {
  heading: string;
  content: string;
}

interface ThinkingBlockProps {
  thinkingBlocks: ThinkingStep[];
  usageMetadata?: unknown; // For showing token count
}

export function ThinkingBlock({ thinkingBlocks }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get summary from last thinking block heading
  const summary =
    thinkingBlocks.length > 0
      ? thinkingBlocks[thinkingBlocks.length - 1].heading
      : "Thinking...";

  return (
    <div className="w-full pb-2">
      <ToolContainer
        header={
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="group text-muted-foreground hover:text-foreground flex w-full items-center gap-2 text-sm transition-colors focus:outline-none"
          >
            {/* Icon */}
            <NeuralNetworkIcon className="h-5 w-5 flex-shrink-0" />

            {/* Text + Chevron grouped to stay adjacent */}
            <span className="inline-flex items-center gap-1">
              <span className="text-left font-normal">{summary}</span>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0"
              >
                <ArrowDown01Icon className="h-4 w-4" />
              </motion.div>
            </span>

            {/* Spacer pushes any trailing content to far right */}
            <span className="flex-1" />
          </button>
        }
        contentClassName="bg-gray-100"
      >
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
              <div className="mt-1 ml-2">
                {/* Chain of thoughts timeline */}
                <div className="relative">
                  {thinkingBlocks.map((block, index) => {
                    const isLast = index === thinkingBlocks.length - 1;

                    return (
                      <div
                        key={index}
                        className="relative flex gap-3 pb-1"
                      >
                        {/* Vertical line and dot */}
                        <div className="relative flex flex-col items-center">
                          {/* Unicode dot character */}
                          <div className="text-muted-foreground relative z-10 flex items-center justify-center leading-none">
                            •
                          </div>

                          {/* Vertical line (only if not last) */}
                          {!isLast && (
                            <div className="bg-border absolute top-3 h-full w-px" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="-mt-0.5 flex-1">
                          {/* Heading and Content together without gap */}
                          <div className="text-muted-foreground text-xs font-normal">
                            {block.heading}
                          </div>
                          {block.content && block.content.length > 0 && (
                            <div className="text-muted-foreground/70 text-xs leading-relaxed whitespace-pre-wrap">
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

                    <div className="-mt-0.5 flex-1">
                      <div className="text-muted-foreground/70 text-xs font-normal">
                        Done
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ToolContainer>
    </div>
  );
}
