import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { CircleHelp } from "lucide-react";

export function InlineContextTooltip({
  cardContentClassName,
  children,
}: {
  cardContentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span className="ml-1 inline-flex items-center">
          <CircleHelp className="h-3 w-3 text-gray-600" />
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        className={cn(cardContentClassName, "w-[300px] text-wrap")}
      >
        <p className="font-medium text-black">What&apos;s this?</p>
        {children}
      </HoverCardContent>
    </HoverCard>
  );
}
