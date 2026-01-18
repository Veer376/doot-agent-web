import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      data-radius="radius2"
      className={cn("bg-accent animate-pulse", className)}
      {...props}
    />
  );
}

export { Skeleton };
