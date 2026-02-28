import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      data-radius="radius"
      className={cn("animate-pulse bg-accent", className)}
      {...props}
    />
  );
}

export { Skeleton };
