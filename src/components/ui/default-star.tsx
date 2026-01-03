import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StarIcon } from "@/components/icons";

export function DefaultStar({ className }: { className?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <StarIcon className={className} />
        </TooltipTrigger>
        <TooltipContent>
          <p>Primary agent</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * @deprecated Use DefaultStar instead (which now shows "Primary agent")
 */
export const PrimaryStar = DefaultStar;
