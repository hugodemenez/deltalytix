"use client";

import {
  CodeBlock,
  CodeBlockContent,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/components/ui/code-block";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
import { useHighlightedCode } from "@/hooks/use-highlighted-code";
import { cn } from "@/lib/utils";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import { WrenchIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { isValidElement } from "react";

export type ToolPart = ToolUIPart | DynamicToolUIPart;

/** What a tool line says about its call, in the tense the title uses. */
export type ToolPhase = "running" | "done" | "error" | "denied" | "pending";

type ToolState =
  | ToolPart["state"]
  // Messages saved by AI SDK 4 still carry these states.
  | "partial-call"
  | "call"
  | "result";

/**
 * Maps a tool part's state to the phase its line shows. A call still waiting
 * for input or output only counts as running while the chat streams; after the
 * chat stops it can no longer finish.
 */
export function getToolPhase(
  state: ToolState | (string & {}),
  { streaming = false, approved }: { streaming?: boolean; approved?: boolean } = {}
): ToolPhase {
  switch (state) {
    case "output-available":
    case "result":
      return "done";
    case "output-error":
      return "error";
    case "output-denied":
      return "denied";
    case "approval-requested":
      return "pending";
    case "approval-responded":
      return approved === false ? "denied" : "running";
    default:
      return streaming ? "running" : "error";
  }
}

const traceStatus = {
  running: "running",
  error: "error",
  pending: "pending",
  done: undefined,
  denied: undefined,
} as const;

export const getToolStatus = (phase: ToolPhase) => traceStatus[phase];

const defaultGetTitle = (phase: ToolPhase, name: ReactNode): ReactNode => {
  switch (phase) {
    case "running":
      return <>Running {name}</>;
    case "error":
      return <>Failed to run {name}</>;
    case "denied":
      return <>Denied {name}</>;
    case "pending":
      return <>Waiting to run {name}</>;
    default:
      return <>Ran {name}</>;
  }
};

export type ToolLineProps = Omit<ComponentProps<typeof TraceLine>, "title"> & {
  phase: ToolPhase;
  /** The tool's name, put into the title for its phase. */
  title: ReactNode;
  icon?: ReactNode;
  getTitle?: (phase: ToolPhase, title: ReactNode) => ReactNode;
};

/** One tool call as a line, with no detail to expand. */
export function ToolLine({
  phase,
  title,
  icon,
  getTitle = defaultGetTitle,
  ...props
}: ToolLineProps) {
  return (
    <TraceLine status={getToolStatus(phase)} {...props}>
      <TraceIcon>{icon ?? <WrenchIcon />}</TraceIcon>
      <TraceTitle>{getTitle(phase, title)}</TraceTitle>
    </TraceLine>
  );
}

export type ToolProps = ComponentProps<typeof TraceCollapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Trace className={cn("not-prose", className)}>
    <TraceCollapsible {...props} />
  </Trace>
);

export type ToolHeaderProps = Omit<
  ComponentProps<typeof TraceCollapsibleTrigger>,
  "title" | "type"
> & {
  type: ToolPart["type"];
  state: ToolState | (string & {});
  title?: ReactNode;
  streaming?: boolean;
  approved?: boolean;
  icon?: ReactNode;
  getTitle?: ToolLineProps["getTitle"];
};

export const ToolHeader = ({
  type,
  state,
  title,
  streaming,
  approved,
  icon,
  getTitle,
  ...props
}: ToolHeaderProps) => (
  <TraceCollapsibleTrigger {...props}>
    <ToolLine
      phase={getToolPhase(state, { streaming, approved })}
      title={title ?? type.replace(/^tool-/, "")}
      icon={icon}
      getTitle={getTitle}
    />
  </TraceCollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof TraceCollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <TraceCollapsibleContent
    className={cn("flex flex-col gap-2", className)}
    {...props}
  />
);

function JsonBlock({
  value,
  label,
  variant,
}: {
  value: unknown;
  label?: ReactNode;
  variant?: ComponentProps<typeof CodeBlock>["variant"];
}) {
  const code =
    typeof value === "string" ? value : (JSON.stringify(value, null, 2) ?? "");
  const lines = useHighlightedCode(
    code,
    typeof value === "string" ? "text" : "json"
  );

  return (
    <CodeBlock size="sm" variant={variant}>
      {label && (
        <CodeBlockHeader>
          <CodeBlockTitle>{label}</CodeBlockTitle>
        </CodeBlockHeader>
      )}
      <CodeBlockContent wrap className="max-h-64">
        {lines.map((line, index) => (
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  );
}

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolPart["input"];
  label?: ReactNode;
};

export const ToolInput = ({
  className,
  input,
  label = "Input",
  ...props
}: ToolInputProps) => (
  <div className={cn("min-w-0", className)} {...props}>
    <JsonBlock value={input} label={label} />
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ReactNode | unknown;
  errorText?: ToolPart["errorText"];
  label?: ReactNode;
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  label = "Output",
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  return (
    <div className={cn("min-w-0", className)} {...props}>
      {errorText ? (
        <JsonBlock value={errorText} label={label} variant="destructive" />
      ) : isValidElement(output) ? (
        output
      ) : (
        <JsonBlock value={output} label={label} />
      )}
    </div>
  );
};
