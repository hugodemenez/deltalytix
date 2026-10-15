"use client";

import { Badge } from "@/components/ui/badge";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
import { cn } from "@/lib/utils";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  DotIcon,
  LoaderCircleIcon,
  type LucideIcon,
} from "lucide-react";
import type { ComponentProps } from "react";
import { createContext, memo, useCallback, useContext, useState } from "react";

type ChainOfThoughtContextValue = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};

const ChainOfThoughtContext = createContext<ChainOfThoughtContextValue | null>(
  null
);

const useChainOfThought = () => {
  const context = useContext(ChainOfThoughtContext);
  if (!context) {
    throw new Error(
      "ChainOfThought components must be used within ChainOfThought"
    );
  }
  return context;
};

export type ChainOfThoughtProps = ComponentProps<"div"> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const ChainOfThought = memo(
  ({
    className,
    open,
    defaultOpen = false,
    onOpenChange,
    children,
    ...props
  }: ChainOfThoughtProps) => {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
    const isOpen = open ?? uncontrolledOpen;

    const setIsOpen = useCallback(
      (next: boolean) => {
        setUncontrolledOpen(next);
        onOpenChange?.(next);
      },
      [onOpenChange]
    );

    return (
      <ChainOfThoughtContext.Provider value={{ isOpen, setIsOpen }}>
        <Trace className={cn("not-prose", className)} {...props}>
          <TraceCollapsible open={isOpen} onOpenChange={setIsOpen}>
            {children}
          </TraceCollapsible>
        </Trace>
      </ChainOfThoughtContext.Provider>
    );
  }
);

type StepStatus = "running" | "error" | "pending";

function StatusIcon({ status }: { status?: StepStatus }) {
  if (status === "running") {
    return <LoaderCircleIcon className="animate-spin" />;
  }
  if (status === "error") {
    return <CircleAlertIcon />;
  }
  return <CircleCheckIcon />;
}

export type ChainOfThoughtHeaderProps = ComponentProps<
  typeof TraceCollapsibleTrigger
> & {
  status?: StepStatus;
};

export const ChainOfThoughtHeader = memo(
  ({ className, children, status, ...props }: ChainOfThoughtHeaderProps) => {
    useChainOfThought();

    return (
      <TraceCollapsibleTrigger className={className} {...props}>
        <TraceLine status={status}>
          <TraceIcon>
            <StatusIcon status={status} />
          </TraceIcon>
          <TraceTitle>{children ?? "Chain of Thought"}</TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
    );
  }
);

export type ChainOfThoughtStepProps = ComponentProps<"div"> & {
  icon?: LucideIcon;
  label: string;
  description?: string;
  status?: "complete" | "active" | "pending" | "error";
};

const stepStatus = {
  complete: undefined,
  active: "running",
  pending: "pending",
  error: "error",
} as const;

export const ChainOfThoughtStep = memo(
  ({
    className,
    icon: Icon = DotIcon,
    label,
    description,
    status = "complete",
    children,
    ...props
  }: ChainOfThoughtStepProps) => (
    <div className={cn("flex min-w-0 flex-col gap-2", className)} {...props}>
      <TraceLine status={stepStatus[status]}>
        <TraceIcon>
          <Icon />
        </TraceIcon>
        <TraceTitle>{label}</TraceTitle>
        {description && <TraceDescription>{description}</TraceDescription>}
      </TraceLine>
      {children && <div className="min-w-0 pl-6">{children}</div>}
    </div>
  )
);

export type ChainOfThoughtSearchResultsProps = ComponentProps<"div">;

export const ChainOfThoughtSearchResults = memo(
  ({ className, ...props }: ChainOfThoughtSearchResultsProps) => (
    <div className={cn("flex flex-wrap gap-1.5", className)} {...props} />
  )
);

export type ChainOfThoughtSearchResultProps = ComponentProps<typeof Badge>;

export const ChainOfThoughtSearchResult = memo(
  ({ className, children, ...props }: ChainOfThoughtSearchResultProps) => (
    <Badge className={className} variant="secondary" {...props}>
      {children}
    </Badge>
  )
);

export type ChainOfThoughtContentProps = ComponentProps<
  typeof TraceCollapsibleContent
>;

export const ChainOfThoughtContent = memo(
  ({ className, children, ...props }: ChainOfThoughtContentProps) => {
    useChainOfThought();

    return (
      // forceMount keeps the steps' own open state while the summary is closed.
      <TraceCollapsibleContent forceMount className={className} {...props}>
        <Trace>{children}</Trace>
      </TraceCollapsibleContent>
    );
  }
);

export type ChainOfThoughtImageProps = ComponentProps<"div"> & {
  caption?: string;
};

export const ChainOfThoughtImage = memo(
  ({ className, children, caption, ...props }: ChainOfThoughtImageProps) => (
    <div className={cn("mt-2 space-y-2", className)} {...props}>
      <div className="relative flex max-h-88 items-center justify-center overflow-hidden rounded-lg bg-muted p-3">
        {children}
      </div>
      {caption && <p className="text-muted-foreground text-xs">{caption}</p>}
    </div>
  )
);

ChainOfThought.displayName = "ChainOfThought";
ChainOfThoughtHeader.displayName = "ChainOfThoughtHeader";
ChainOfThoughtStep.displayName = "ChainOfThoughtStep";
ChainOfThoughtSearchResults.displayName = "ChainOfThoughtSearchResults";
ChainOfThoughtSearchResult.displayName = "ChainOfThoughtSearchResult";
ChainOfThoughtContent.displayName = "ChainOfThoughtContent";
ChainOfThoughtImage.displayName = "ChainOfThoughtImage";
