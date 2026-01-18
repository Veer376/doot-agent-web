"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LinkedInIcon, GithubIcon, DootLogoIcon } from "@/components/icons";

interface WelcomeModalProps {
  onClose?: () => void;
}

export function WelcomeModal({ onClose }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has seen the video
    const hasSeen = localStorage.getItem("dootagent-demo-seen");
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("dootagent-demo-seen", "true");
    onClose?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden bg-background p-0" 
        data-radius="radius2"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 px-6 py-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <DootLogoIcon className="size-7 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">DootAgent Demo</h2>
            <p className="text-sm text-muted-foreground">Local Runtime Preview</p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Video Container */}
          <div className="px-6 pb-4">
            <div 
              className="relative aspect-video w-full overflow-hidden bg-muted" 
              data-radius="radius2"
            >
              <video 
                src="/dootagent-demo.mp4" 
                className="h-full w-full object-contain"
                autoPlay 
                muted
                controls 
                playsInline
              />
            </div>
          </div>

          {/* Description */}
          <div className="px-6 py-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              This demo showcases <span className="font-medium text-foreground">DootAgent</span> running locally on your machine. 
              The cloud version may have a different interface and enhanced capabilities. 
              Experience the power of agentic AI right from your browser.
            </p>
          </div>
        </div>

        {/* Footer with Social Links - with blur overlay to indicate scrollable content */}
        <div className="relative shrink-0">
          {/* Gradient overlay for scroll indication */}
          <div className="pointer-events-none absolute -top-10 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent" />
          <div className="flex items-center justify-end gap-3 bg-background/80 px-6 py-4 backdrop-blur-md">
          <a
            href="https://www.linkedin.com/posts/aryaveer-aiml_agentic-ai-browseragent-activity-7363970757086875649-uJHN?utm_source=share&utm_medium=member_desktop&rcm=ACoAADT9Sm8BN3I8bmHvcUr7YqjYbBWlvo3VwvQ"
            target="_blank"
            rel="noopener noreferrer"
            data-radius="radius2"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <LinkedInIcon className="size-5 text-[#0A66C2]" />
            <span className="text-muted-foreground">LinkedIn</span>
          </a>
          <a
            href="https://github.com/Veer376/doot-agent-lab"
            target="_blank"
            rel="noopener noreferrer"
            data-radius="radius2"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <GithubIcon className="size-5 text-foreground" />
            <span className="text-muted-foreground">GitHub</span>
          </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
