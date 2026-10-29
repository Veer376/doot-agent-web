import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";
import { LoaderIcon } from "@/components/icons";

export type LoaderProps = HTMLAttributes<HTMLDivElement> & {
  size?: number;
};

export const Loader = ({ className, size = 16, ...props }: LoaderProps) => (
  <div
    className={cn(
      "inline-flex animate-spin items-center justify-center",
      className,
    )}
    {...props}
  >
    <LoaderIcon size={size} />
  </div>
);
