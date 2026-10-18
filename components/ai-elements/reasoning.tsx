"use client";

import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
import { cn } from "@/lib/utils";
import { BrainIcon, LoaderCircleIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Response } from "./response";

type ReasoningContextValue = {
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  duration: number;
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

export const useReasoning = () => {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning");
  }
  return context;
};

export type ReasoningProps = Omit<
  ComponentProps<typeof TraceCollapsible>,
  "open" | "onOpenChange" | "defaultOpen"
> & {
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  disableAutoClose?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
};

const MS_IN_S = 1000;

export const Reasoning = memo(
  ({
    className,
    isStreaming = false,
    open,
    defaultOpen = true,
    disableAutoClose = false,
    onOpenChange,
    duration: durationProp,
    children,
    ...props
  }: ReasoningProps) => {
    // Undefined until the person toggles it; their choice then wins over the
    // open-while-streaming default.
    const [userOpen, setUserOpen] = useState<boolean>();
    const [measuredDuration, setMeasuredDuration] = useState(0);

    useEffect(() => {
      if (!isStreaming) {
        return;
      }
      const startTime = Date.now();
      return () =>
        setMeasuredDuration(Math.ceil((Date.now() - startTime) / MS_IN_S));
    }, [isStreaming]);

    const autoOpen = defaultOpen && (isStreaming || disableAutoClose);
    const isOpen = open ?? userOpen ?? autoOpen;
    const duration = durationProp ?? measuredDuration;

    const setIsOpen = useCallback(
      (next: boolean) => {
        setUserOpen(next);
        onOpenChange?.(next);
      },
      [onOpenChange]
    );

    return (
      <ReasoningContext.Provider
        value={{ isStreaming, isOpen, setIsOpen, duration }}
      >
        <Trace className={cn("not-prose", className)}>
          <TraceCollapsible open={isOpen} onOpenChange={setIsOpen} {...props}>
            {children}
          </TraceCollapsible>
        </Trace>
      </ReasoningContext.Provider>
    );
  }
);

export type ReasoningTriggerProps = ComponentProps<
  typeof TraceCollapsibleTrigger
> & {
  getThinkingMessage?: (isStreaming: boolean, duration?: number) => ReactNode;
};

const defaultGetThinkingMessage = (isStreaming: boolean, duration?: number) => {
  if (isStreaming || duration === 0) {
    return "Thinking";
  }
  if (duration === undefined) {
    return "Thought for a few seconds";
  }
  return `Thought for ${duration}s`;
};

export const ReasoningTrigger = memo(
  ({
    className,
    children,
    getThinkingMessage = defaultGetThinkingMessage,
    ...props
  }: ReasoningTriggerProps) => {
    const { isStreaming, duration } = useReasoning();

    return (
      <TraceCollapsibleTrigger
        className={cn(
          "disabled:cursor-default disabled:[&>[data-slot=trace-icon]]:hidden",
          className
        )}
        {...props}
      >
        <TraceLine status={isStreaming ? "running" : undefined}>
          {children ?? (
            <>
              <TraceIcon>
                {isStreaming ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <BrainIcon />
                )}
              </TraceIcon>
              <TraceTitle>{getThinkingMessage(isStreaming, duration)}</TraceTitle>
            </>
          )}
        </TraceLine>
      </TraceCollapsibleTrigger>
    );
  }
);

export type ReasoningContentProps = ComponentProps<
  typeof TraceCollapsibleContent
> & {
  children: string;
};

export const ReasoningContent = memo(
  ({ className, children, ...props }: ReasoningContentProps) => (
    <TraceCollapsibleContent className={cn("text-sm", className)} {...props}>
      <Response className="grid gap-2">{children}</Response>
    </TraceCollapsibleContent>
  )
);

Reasoning.displayName = "Reasoning";
ReasoningTrigger.displayName = "ReasoningTrigger";
ReasoningContent.displayName = "ReasoningContent";
