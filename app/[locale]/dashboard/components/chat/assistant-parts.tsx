"use client";

import { useState, type ReactNode } from "react";
import type { useChat } from "@ai-sdk/react";
import {
  ChartLineIcon,
  CircleCheckIcon,
  CircleXIcon,
  DatabaseIcon,
  LoaderCircleIcon,
  ShieldQuestionIcon,
} from "lucide-react";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
} from "@/components/ai-elements/chain-of-thought";
import {
  Confirmation,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationIcon,
  ConfirmationTitle,
} from "@/components/ai-elements/confirmation";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolLine,
  ToolOutput,
  getToolPhase,
  type ToolPhase,
} from "@/components/ai-elements/tool";
import { Message, MessageContent } from "@/components/ui/message";
import {
  Trace,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
import { useI18n } from "@/locales/client";
import { BotMessage } from "./bot-message";
import type { ChatStatus } from "./chat";
import { EquityChartMessage } from "./equity-chart-message";
import {
  CHART_TOOL,
  CONFIRMATION_APPROVED,
  CONFIRMATION_DENIED,
  CONFIRMATION_TOOL,
  countFailedSteps,
  getToolName,
  isConfirmationApproved,
  segmentAssistantParts,
  type ChatPart,
  type IndexedPart,
} from "./message-parts";

type AddToolResult = ReturnType<typeof useChat>["addToolResult"];

function TraceMessage({ children }: { children: ReactNode }) {
  return (
    <Message align="start" className="py-1">
      <MessageContent>{children}</MessageContent>
    </Message>
  );
}

const hasValues = (value: unknown) =>
  value !== undefined &&
  value !== null &&
  (typeof value !== "object" || Object.keys(value).length > 0);

function useToolTitle() {
  const t = useI18n();
  const names: Record<string, string> = {
    getJournalEntries: t("chat.tools.names.getJournalEntries"),
    getPreviousConversation: t("chat.tools.names.getPreviousConversation"),
    getMostTradedInstruments: t("chat.tools.names.getMostTradedInstruments"),
    getLastTradesData: t("chat.tools.names.getLastTradesData"),
    getTradesDetails: t("chat.tools.names.getTradesDetails"),
    getTradesSummary: t("chat.tools.names.getTradesSummary"),
    getCurrentWeekSummary: t("chat.tools.names.getCurrentWeekSummary"),
    getPreviousWeekSummary: t("chat.tools.names.getPreviousWeekSummary"),
    getWeekSummaryForDate: t("chat.tools.names.getWeekSummaryForDate"),
    getFinancialNews: t("chat.tools.names.getFinancialNews"),
  };

  return {
    name: (part: ChatPart) => names[getToolName(part)] ?? getToolName(part),
    title: (phase: ToolPhase, tool: ReactNode) => {
      const params = { tool: tool as string };
      switch (phase) {
        case "running":
          return t("chat.tools.running", params);
        case "error":
          return t("chat.tools.error", params);
        case "denied":
          return t("chat.tools.denied", params);
        case "pending":
          return t("chat.tools.pending", params);
        default:
          return t("chat.tools.done", params);
      }
    },
  };
}

function ToolStep({ part, streaming }: { part: ChatPart; streaming: boolean }) {
  const t = useI18n();
  const { name, title } = useToolTitle();
  const phase = getToolPhase(part.state ?? "", { streaming });
  const output = part.output ?? part.result;
  const hasInput = hasValues(part.input);
  const hasOutput =
    (phase === "done" && output !== undefined) ||
    (phase === "error" && Boolean(part.errorText));

  if (!hasInput && !hasOutput) {
    return (
      <Trace>
        <ToolLine
          phase={phase}
          title={name(part)}
          icon={<DatabaseIcon />}
          getTitle={title}
        />
      </Trace>
    );
  }

  return (
    <Tool>
      <ToolHeader
        type={part.type as `tool-${string}`}
        state={part.state ?? ""}
        streaming={streaming}
        title={name(part)}
        icon={<DatabaseIcon />}
        getTitle={title}
      />
      <ToolContent>
        {hasInput && (
          <ToolInput input={part.input} label={t("chat.tools.input")} />
        )}
        {hasOutput && (
          <ToolOutput
            output={output}
            errorText={part.errorText}
            label={t("chat.tools.output")}
          />
        )}
      </ToolContent>
    </Tool>
  );
}

function ReasoningStep({
  part,
  streaming,
}: {
  part: ChatPart;
  streaming: boolean;
}) {
  const t = useI18n();
  const text: string = part.text ?? "";
  const running = streaming && part.state === "streaming";

  return (
    <Reasoning isStreaming={running}>
      <ReasoningTrigger
        disabled={!text.trim()}
        getThinkingMessage={(isStreaming, duration) =>
          isStreaming
            ? t("chat.trace.thinking")
            : duration
              ? t("chat.trace.thoughtFor", { seconds: duration })
              : t("chat.trace.thought")
        }
      />
      {text.trim() && <ReasoningContent>{text}</ReasoningContent>}
    </Reasoning>
  );
}

function Step({ part, streaming }: { part: ChatPart; streaming: boolean }) {
  return part.type === "reasoning" ? (
    <ReasoningStep part={part} streaming={streaming} />
  ) : (
    <ToolStep part={part} streaming={streaming} />
  );
}

function StepsSummary({
  steps,
  streaming,
  running,
}: {
  steps: IndexedPart[];
  streaming: boolean;
  running: boolean;
}) {
  const t = useI18n();
  const [open, setOpen] = useState<boolean>();
  const failed = countFailedSteps(steps, { streaming });
  const count = steps.length;
  const summarized = count > 1;

  // A lone step renders without the summary line. The content keeps its
  // place in the tree either way, so steps do not remount when a second one
  // arrives and the reasoning keeps its measured duration.
  return (
    <ChainOfThought
      open={summarized ? (open ?? running) : true}
      onOpenChange={setOpen}
    >
      {summarized && (
        <ChainOfThoughtHeader
          status={running ? "running" : failed > 0 ? "error" : undefined}
        >
          {running
            ? t("chat.trace.working")
            : failed > 0
              ? t("chat.trace.workedWithFailures", { count, failed })
              : t("chat.trace.worked", { count })}
        </ChainOfThoughtHeader>
      )}
      <ChainOfThoughtContent
        className={summarized ? undefined : "m-0 border-l-0 p-0"}
      >
        {steps.map(({ part, index }) => (
          <Step
            key={part.toolCallId ?? `step-${index}`}
            part={part}
            streaming={streaming}
          />
        ))}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}

type ChartOutput = {
  chartData: Parameters<typeof EquityChartMessage>[0]["chartData"];
  accountNumbers: string[];
  showIndividual: boolean;
  dateRange: { start: string; end: string };
  timezone: string;
  totalTrades: number;
};

const isChartOutput = (output: unknown): output is ChartOutput =>
  Boolean(output) && typeof output === "object" && "chartData" in output!;

function ChartStep({ part, streaming }: { part: ChatPart; streaming: boolean }) {
  const t = useI18n();
  const [open, setOpen] = useState<boolean>();
  const output = part.output ?? part.result;
  const chart = isChartOutput(output) ? output : null;
  let phase = getToolPhase(part.state ?? "", { streaming });
  if (phase === "done" && !chart) {
    phase = "error";
  }

  const title = (current: ToolPhase) =>
    current === "running"
      ? t("chat.chart.running")
      : current === "error"
        ? t("chat.chart.error")
        : t("chat.chart.done");

  return (
    <Tool open={open ?? Boolean(chart)} onOpenChange={setOpen}>
      <ToolHeader
        type={CHART_TOOL}
        state={phase === "error" ? "output-error" : (part.state ?? "")}
        streaming={streaming}
        icon={<ChartLineIcon />}
        getTitle={title}
      />
      <ToolContent>
        {chart ? (
          <ToolOutput
            output={
              <EquityChartMessage
                chartData={chart.chartData}
                accountNumbers={chart.accountNumbers}
                showIndividual={chart.showIndividual}
                dateRange={chart.dateRange}
                timezone={chart.timezone}
                totalTrades={chart.totalTrades}
              />
            }
          />
        ) : (
          phase === "error" && (
            <ToolOutput
              output={null}
              errorText={part.errorText ?? t("chat.chart.invalid")}
              label={t("chat.tools.output")}
            />
          )
        )}
        {hasValues(part.input) && (
          <ToolInput input={part.input} label={t("chat.tools.input")} />
        )}
      </ToolContent>
    </Tool>
  );
}

function ConfirmationStep({
  part,
  addToolResult,
}: {
  part: ChatPart;
  addToolResult: AddToolResult;
}) {
  const t = useI18n();
  const message = (part.input as { message?: string } | undefined)?.message;

  if (part.state === "input-available" || part.state === "call") {
    const toolCallId = part.toolCallId ?? "";
    const answer = (output: string) =>
      addToolResult({
        tool: "askForConfirmation",
        toolCallId,
        output,
      });

    return (
      <Confirmation
        approval={{ id: toolCallId }}
        state="approval-requested"
      >
        <ConfirmationIcon>
          <ShieldQuestionIcon />
        </ConfirmationIcon>
        <ConfirmationTitle description={t("chat.confirmation.description")}>
          {message ?? t("chat.confirmation.fallbackTitle")}
        </ConfirmationTitle>
        <ConfirmationActions>
          <ConfirmationAction
            variant="outline"
            onClick={() => answer(CONFIRMATION_DENIED)}
          >
            {t("chat.confirmation.deny")}
          </ConfirmationAction>
          <ConfirmationAction onClick={() => answer(CONFIRMATION_APPROVED)}>
            {t("chat.confirmation.approve")}
          </ConfirmationAction>
        </ConfirmationActions>
      </Confirmation>
    );
  }

  if (part.state === "output-available" || part.state === "result") {
    const approved = isConfirmationApproved(part.output ?? part.result);
    const params = { message: message ?? "" };

    return (
      <Trace>
        <TraceLine>
          <TraceIcon>{approved ? <CircleCheckIcon /> : <CircleXIcon />}</TraceIcon>
          <TraceTitle>
            {approved
              ? t("chat.confirmation.approved", params)
              : t("chat.confirmation.denied", params)}
          </TraceTitle>
        </TraceLine>
      </Trace>
    );
  }

  if (part.state === "output-error") {
    return (
      <Trace>
        <ToolLine
          phase="error"
          title={message ?? t("chat.confirmation.fallbackTitle")}
          icon={<ShieldQuestionIcon />}
        />
      </Trace>
    );
  }

  return null;
}

export function ThinkingLine() {
  const t = useI18n();
  return (
    <TraceMessage>
      <Trace>
        <TraceLine status="running">
          <TraceIcon>
            <LoaderCircleIcon className="animate-spin" />
          </TraceIcon>
          <TraceTitle>{t("chat.trace.thinking")}</TraceTitle>
        </TraceLine>
      </Trace>
    </TraceMessage>
  );
}

export function AssistantParts({
  messageId,
  parts,
  streaming,
  status,
  addToolResult,
}: {
  messageId: string;
  parts: ChatPart[];
  /** Whether this message is the one the chat is still writing. */
  streaming: boolean;
  status: ChatStatus;
  addToolResult: AddToolResult;
}) {
  const segments = segmentAssistantParts(parts, { streaming });

  if (segments.length === 0) {
    return null;
  }

  return segments.map((segment, position) => {
    const key = `${messageId}-${segment.key}`;

    if (segment.kind === "steps") {
      const running = streaming && position === segments.length - 1;

      return (
        <TraceMessage key={key}>
          <StepsSummary
            steps={segment.steps}
            streaming={streaming}
            running={running}
          />
        </TraceMessage>
      );
    }

    const { part, index } = segment;

    if (part.type === "text") {
      return (
        <BotMessage key={key} status={status}>
          {part.text ?? ""}
        </BotMessage>
      );
    }

    if (part.type === "file") {
      if (!part.mediaType?.startsWith("image/")) {
        return null;
      }
      return (
        <BotMessage key={key} status={status}>
          <div className="mt-2">
            <img
              src={part.url}
              alt={`attachment-${index}`}
              className="rounded-lg max-w-full h-auto max-h-96"
            />
          </div>
        </BotMessage>
      );
    }

    if (part.type === CHART_TOOL) {
      return (
        <TraceMessage key={key}>
          <ChartStep part={part} streaming={streaming} />
        </TraceMessage>
      );
    }

    if (part.type === CONFIRMATION_TOOL && part.state !== "input-streaming") {
      return (
        <TraceMessage key={key}>
          <ConfirmationStep part={part} addToolResult={addToolResult} />
        </TraceMessage>
      );
    }

    return null;
  });
}
