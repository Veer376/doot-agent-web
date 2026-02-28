"use client";

import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/icons";
import {
  type ComponentProps,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// Extract clean hostname from URL (remove www., .com, .org, etc.)
const getCleanHostname = (url: string): string => {
  try {
    const hostname = new URL(url).hostname;
    return hostname
      .replace(/^www\./, "") // Remove www.
      .replace(
        /\.(com|org|net|io|dev|app|ai|co|gov|edu|mil)(\.[a-z]{2})?$/i,
        "",
      ); // Remove common TLDs
  } catch {
    return "unknown";
  }
};

// Context to share hover state between components
type HoverStateContextType = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};

const HoverStateContext = createContext<HoverStateContextType | undefined>(
  undefined,
);

const useHoverState = () => {
  const context = useContext(HoverStateContext);
  return context;
};

export type InlineCitationProps = ComponentProps<"span">;

export const InlineCitation = ({
  className,
  ...props
}: InlineCitationProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <HoverStateContext.Provider value={{ isOpen, setIsOpen }}>
      <span
        className={cn("group inline items-center gap-1", className)}
        data-state={isOpen ? "open" : "closed"}
        {...props}
      />
    </HoverStateContext.Provider>
  );
};

export type InlineCitationTextProps = ComponentProps<"span">;

export const InlineCitationText = ({
  className,
  ...props
}: InlineCitationTextProps) => (
  <span
    className={cn("transition-colors group-hover:bg-accent", className)}
    {...props}
  />
);

export type InlineCitationCardProps = ComponentProps<typeof HoverCard>;

export const InlineCitationCard = (props: InlineCitationCardProps) => {
  const hoverState = useHoverState();

  return (
    <HoverCard
      closeDelay={200}
      openDelay={430}
      open={hoverState?.isOpen}
      onOpenChange={hoverState?.setIsOpen}
      {...props}
    />
  );
};

export type InlineCitationCardTriggerProps = ComponentProps<typeof Badge> & {
  sources: string[];
};

export const InlineCitationCardTrigger = ({
  sources,
  className,
  ...props
}: InlineCitationCardTriggerProps) => {
  const hoverState = useHoverState();

  return (
    <HoverCardTrigger asChild>
      <Badge
        data-radius="radius"
        className={cn(
          "bg-muted/20 hover:bg-muted/40 border-muted/20 ml-1 cursor-pointer border opacity-60 transition-all hover:opacity-100",
          hoverState?.isOpen && "scale-105 opacity-100",
          !hoverState?.isOpen && "hover:scale-105",
          className,
        )}
        variant="outline"
        {...props}
      >
        {sources[0] ? (
          <>
            {getCleanHostname(sources[0])}{" "}
            {sources.length > 1 && `+${sources.length - 1}`}
          </>
        ) : (
          "unknown"
        )}
      </Badge>
    </HoverCardTrigger>
  );
};

export type InlineCitationCardBodyProps = ComponentProps<"div">;

export const InlineCitationCardBody = ({
  className,
  ...props
}: InlineCitationCardBodyProps) => (
  <HoverCardContent
    data-radius="radius"
    className={cn("relative w-80 select-text border p-0", className)}
    {...props}
  />
);

const CarouselApiContext = createContext<CarouselApi | undefined>(undefined);

const useCarouselApi = () => {
  const context = useContext(CarouselApiContext);
  return context;
};

export type InlineCitationCarouselProps = ComponentProps<typeof Carousel>;

export const InlineCitationCarousel = ({
  className,
  children,
  ...props
}: InlineCitationCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();

  return (
    <CarouselApiContext.Provider value={api}>
      <Carousel
        className={cn("w-full", className)}
        setApi={setApi}
        opts={{ watchDrag: false }}
        {...props}
      >
        {children}
      </Carousel>
    </CarouselApiContext.Provider>
  );
};

export type InlineCitationCarouselContentProps = ComponentProps<"div">;

export const InlineCitationCarouselContent = ({
  className,
  ...props
}: InlineCitationCarouselContentProps) => (
  <CarouselContent
    className={cn("pointer-events-none ml-0", className)}
    {...props}
  />
);

export type InlineCitationCarouselItemProps = ComponentProps<"div">;

export const InlineCitationCarouselItem = ({
  className,
  ...props
}: InlineCitationCarouselItemProps) => (
  <CarouselItem
    className={cn("pointer-events-auto w-full space-y-2 px-4 py-3", className)}
    {...props}
  />
);

export type InlineCitationCarouselHeaderProps = ComponentProps<"div">;

export const InlineCitationCarouselHeader = ({
  className,
  ...props
}: InlineCitationCarouselHeaderProps) => (
  <div
    className={cn(
      "bg-muted/30 flex items-center justify-between gap-2 border-b px-3 py-1.5",
      className,
    )}
    {...props}
  />
);

export type InlineCitationCarouselIndexProps = ComponentProps<"div">;

export const InlineCitationCarouselIndex = ({
  children,
  className,
  ...props
}: InlineCitationCarouselIndexProps) => {
  const api = useCarouselApi();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <div
      className={cn(
        "flex flex-1 items-center justify-end px-3 py-1 text-xs text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children ?? `${current}/${count}`}
    </div>
  );
};

export type InlineCitationCarouselPrevProps = ComponentProps<"button">;

export const InlineCitationCarouselPrev = ({
  className,
  ...props
}: InlineCitationCarouselPrevProps) => {
  const api = useCarouselApi();
  const [canScrollPrev, setCanScrollPrev] = useState(false);

  useEffect(() => {
    if (!api) return;

    const updateScrollState = () => {
      setCanScrollPrev(api.canScrollPrev());
    };

    updateScrollState();
    api.on("select", updateScrollState);

    return () => {
      api.off("select", updateScrollState);
    };
  }, [api]);

  const handleClick = useCallback(() => {
    if (api) {
      api.scrollPrev();
    }
  }, [api]);

  return (
    <button
      aria-label="Previous"
      data-radius="small-radius"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center p-1 transition-colors",
        canScrollPrev && "hover:bg-accent",
        className,
      )}
      onClick={handleClick}
      type="button"
      disabled={!canScrollPrev}
      {...props}
    >
      <ArrowLeftIcon
        size="sm"
        className={cn(
          "transition-colors",
          canScrollPrev
            ? "text-muted-foreground hover:text-foreground"
            : "text-muted-foreground/40",
        )}
      />
    </button>
  );
};

export type InlineCitationCarouselNextProps = ComponentProps<"button">;

export const InlineCitationCarouselNext = ({
  className,
  ...props
}: InlineCitationCarouselNextProps) => {
  const api = useCarouselApi();
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!api) return;

    const updateScrollState = () => {
      setCanScrollNext(api.canScrollNext());
    };

    updateScrollState();
    api.on("select", updateScrollState);

    return () => {
      api.off("select", updateScrollState);
    };
  }, [api]);

  const handleClick = useCallback(() => {
    if (api) {
      api.scrollNext();
    }
  }, [api]);

  return (
    <button
      aria-label="Next"
      data-radius="small-radius"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center p-1 transition-colors",
        canScrollNext && "hover:bg-accent",
        className,
      )}
      onClick={handleClick}
      type="button"
      disabled={!canScrollNext}
      {...props}
    >
      <ArrowRightIcon
        size="sm"
        className={cn(
          "transition-colors",
          canScrollNext
            ? "text-muted-foreground hover:text-foreground"
            : "text-muted-foreground/40",
        )}
      />
    </button>
  );
};

export type InlineCitationSourceProps = ComponentProps<"div"> & {
  title?: string;
  url?: string;
  description?: string;
};

export const InlineCitationSource = ({
  title,
  url,
  description,
  className,
  children,
  ...props
}: InlineCitationSourceProps) => (
  <div
    className={cn("space-y-1.5", className)}
    {...props}
  >
    {title && (
      <h4 className="truncate text-sm font-medium leading-tight text-foreground">
        {title}
      </h4>
    )}
    {url && (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block cursor-pointer truncate break-all text-xs leading-relaxed text-muted-foreground underline transition-colors hover:text-blue-600 dark:hover:text-blue-400"
      >
        {url}
      </a>
    )}
    {description && (
      <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    )}
    {children}
  </div>
);

export type InlineCitationQuoteProps = ComponentProps<"blockquote">;

export const InlineCitationQuote = ({
  children,
  className,
  ...props
}: InlineCitationQuoteProps) => (
  <blockquote
    className={cn(
      "border-l-2 border-muted pl-3 text-sm italic text-muted-foreground",
      className,
    )}
    {...props}
  >
    {children}
  </blockquote>
);
