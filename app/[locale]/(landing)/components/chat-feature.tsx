"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowUp,
  BarChart3,
  Check,
  Copy,
  Database,
  Sparkles,
} from "lucide-react";

import { useI18n } from "@/locales/landing-client";
import { cn } from "@/lib/utils";

interface TradingChatAssistantProps {
  className?: string;
}

type DemoStage = "prefill" | "user" | "thinking" | "response" | "analysis";

type ConversationTurn = {
  question: string;
  response: string;
  metric: string;
  value: string;
  insight: string;
  trend: "positive" | "negative";
};

type AnalysisData = {
  metric: string;
  value: string;
  insight: string;
  trend: "positive" | "negative";
};

type ArchivedTurn = {
  id: string;
  question: string;
  response: string;
  analysis: AnalysisData;
};

const USER_BUBBLE =
  "ml-auto max-w-[92%] rounded-2xl rounded-br-sm bg-[oklch(0.22_0.01_95)] px-3.5 py-2.5 text-[11px] leading-relaxed text-white dark:bg-[oklch(0.94_0_0)] dark:text-[oklch(0.17_0.01_95)] sm:max-w-[82%] sm:text-xs";

const ASSISTANT_BUBBLE =
  "rounded-2xl rounded-bl-sm bg-black/[0.045] px-3.5 py-2.5 text-[11px] leading-relaxed dark:bg-white/[0.06] sm:text-xs";

const TYPEWRITER_MS = 24;
const INPUT_TYPEWRITER_MS = 10;
const INPUT_CHARS_PER_TICK = 4;
const ANALYSIS_HOLD_MS = 4800;
const PREFILL_AUTO_SEND_MS = 900;

function AnalysisCard({
  analysis,
  t,
}: {
  analysis: AnalysisData;
  t: ReturnType<typeof useI18n>;
}) {
  return (
    <div className="coach-analysis mt-3 overflow-hidden rounded-lg border border-black/10 bg-black/[0.025] dark:border-white/10 dark:bg-white/[0.035]">
      <div className="flex items-center justify-between border-b border-black/10 px-3 py-2 dark:border-white/10">
        <div className="flex items-center gap-2 text-[11px] font-medium">
          <BarChart3 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          {analysis.metric}
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          <Check className="mr-1 inline size-2.5" />
          {analysis.trend === "positive"
            ? t("landing.features.chat-feature.analysis.trends.positive")
            : t("landing.features.chat-feature.analysis.trends.negative")}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1 px-3 py-2.5 min-[360px]:grid-cols-[auto_1fr] min-[360px]:gap-3">
        <span className="text-lg font-medium tracking-tight sm:text-xl">
          {analysis.value}
        </span>
        <p className="line-clamp-2 text-[10px] leading-relaxed text-black/50 dark:text-white/50 max-[359px]:line-clamp-1">
          {analysis.insight}
        </p>
      </div>
    </div>
  );
}

function AssistantReply({
  content,
  analysis,
  t,
}: {
  content: string;
  analysis?: AnalysisData;
  t: ReturnType<typeof useI18n>;
}) {
  return (
    <div className="min-w-0 max-w-full sm:max-w-[92%]">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-black/45 dark:text-white/45">
        <Sparkles className="size-3" />
        Deltalytix
      </div>
      <div className={cn(ASSISTANT_BUBBLE, "min-w-0 overflow-hidden")}>
        <p>{content}</p>
        {analysis && <AnalysisCard analysis={analysis} t={t} />}
      </div>
    </div>
  );
}

export default function TradingChatAssistant({
  className,
}: TradingChatAssistantProps) {
  const t = useI18n();
  const [stage, setStage] = useState<DemoStage>("prefill");
  const [turnIndex, setTurnIndex] = useState(0);
  const [archivedTurns, setArchivedTurns] = useState<ArchivedTurn[]>([]);
  const [visibleChars, setVisibleChars] = useState(0);
  const [inputChars, setInputChars] = useState(0);
  const [copied, setCopied] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const turnRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const conversations: ConversationTurn[] = [
    {
      question: t("landing.features.chat-feature.conversation.analyze"),
      response: t("landing.features.chat-feature.responses.analyze"),
      metric: t("landing.features.chat-feature.analysis.winRate.metric"),
      value: t("landing.features.chat-feature.analysis.winRate.value"),
      insight: t("landing.features.chat-feature.analysis.winRate.insight"),
      trend: "positive",
    },
    {
      question: t("landing.features.chat-feature.conversation.patterns"),
      response: t("landing.features.chat-feature.responses.patterns"),
      metric: t("landing.features.chat-feature.analysis.revengeTrading.metric"),
      value: t("landing.features.chat-feature.analysis.revengeTrading.value"),
      insight: t(
        "landing.features.chat-feature.analysis.revengeTrading.insight",
      ),
      trend: "negative",
    },
    {
      question: t("landing.features.chat-feature.conversation.riskManagement"),
      response: t("landing.features.chat-feature.responses.riskManagement"),
      metric: t("landing.features.chat-feature.analysis.riskReward.metric"),
      value: t("landing.features.chat-feature.analysis.riskReward.value"),
      insight: t("landing.features.chat-feature.analysis.riskReward.insight"),
      trend: "positive",
    },
  ];

  const current = conversations[turnIndex];
  const nextQuestion =
    conversations[(turnIndex + 1) % conversations.length].question;
  const prefillQuestion = stage === "prefill" ? current.question : nextQuestion;
  const responseComplete = visibleChars >= current.response.length;
  const typedResponse = current.response.slice(0, visibleChars);
  const inputComplete = inputChars >= prefillQuestion.length;
  const typedInput = prefillQuestion.slice(0, inputChars);
  const hasStarted = stage !== "prefill" || archivedTurns.length > 0;
  const canSend =
    stage === "prefill" ||
    stage === "thinking" ||
    stage === "response" ||
    stage === "analysis";

  const nextId = useCallback(() => {
    idRef.current += 1;
    return `turn-${idRef.current}`;
  }, []);

  const setTurnRef = useCallback(
    (id: string, node: HTMLDivElement | null) => {
      if (node) {
        turnRefs.current.set(id, node);
      } else {
        turnRefs.current.delete(id);
      }
    },
    [],
  );

  const scrollToBottom = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, []);

  const pruneOffscreenTurns = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const visibleTop = container.getBoundingClientRect().top;

    setArchivedTurns((previous) => {
      const next = previous.filter((turn) => {
        const element = turnRefs.current.get(turn.id);
        if (!element) return true;
        return element.getBoundingClientRect().bottom > visibleTop + 8;
      });

      return next.length === previous.length ? previous : next;
    });
  }, []);

  const archiveCurrentTurn = useCallback(() => {
    setArchivedTurns((previous) => [
      ...previous,
      {
        id: nextId(),
        question: current.question,
        response: current.response,
        analysis: {
          metric: current.metric,
          value: current.value,
          insight: current.insight,
          trend: current.trend,
        },
      },
    ]);
  }, [current, nextId]);

  const sendMessage = useCallback(() => {
    if (stage === "prefill") {
      setInputChars(current.question.length);
      setStage("user");
      return;
    }

    if (
      stage === "thinking" ||
      stage === "response" ||
      stage === "analysis"
    ) {
      if (timerRef.current) clearTimeout(timerRef.current);
      archiveCurrentTurn();
      setTurnIndex((index) => (index + 1) % conversations.length);
      setVisibleChars(0);
      setInputChars(0);
      setStage("user");
    }
  }, [stage, current.question.length, archiveCurrentTurn, conversations.length]);

  const handleCopy = useCallback(async () => {
    if (!responseComplete) return;

    try {
      await navigator.clipboard.writeText(current.response);
      setCopied(true);
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      copyResetRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — ignore silently in demo context
    }
  }, [current.response, responseComplete]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(media.matches);
    syncPreference();
    media.addEventListener("change", syncPreference);
    return () => media.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    setVisibleChars(0);
    setCopied(false);
  }, [turnIndex]);

  useEffect(() => {
    if (stage !== "user") return;
    setInputChars(0);
  }, [stage, turnIndex]);

  useEffect(() => {
    if (inputTimerRef.current) clearTimeout(inputTimerRef.current);

    const shouldTypeInput =
      stage === "prefill" ||
      stage === "user" ||
      stage === "thinking" ||
      stage === "response" ||
      stage === "analysis";

    if (!shouldTypeInput || inputComplete) return;

    if (prefersReducedMotion) {
      setInputChars(prefillQuestion.length);
      return;
    }

    inputTimerRef.current = setTimeout(() => {
      setInputChars((count) =>
        Math.min(count + INPUT_CHARS_PER_TICK, prefillQuestion.length),
      );
    }, INPUT_TYPEWRITER_MS);

    return () => {
      if (inputTimerRef.current) clearTimeout(inputTimerRef.current);
    };
  }, [
    stage,
    inputChars,
    inputComplete,
    prefillQuestion,
    prefersReducedMotion,
  ]);

  useEffect(() => {
    if (stage !== "prefill") return;

    const timer = setTimeout(() => setStage("user"), PREFILL_AUTO_SEND_MS);
    return () => clearTimeout(timer);
  }, [stage, turnIndex]);

  useEffect(() => {
    if (stage !== "response" && stage !== "analysis") return;

    if (prefersReducedMotion) {
      setVisibleChars(current.response.length);
      if (stage === "response") {
        const timer = setTimeout(() => setStage("analysis"), 300);
        return () => clearTimeout(timer);
      }
      return;
    }

    if (!responseComplete) {
      const timer = setTimeout(
        () => setVisibleChars((count) => count + 1),
        TYPEWRITER_MS,
      );
      return () => clearTimeout(timer);
    }

    if (stage === "response") {
      const timer = setTimeout(() => setStage("analysis"), 900);
      return () => clearTimeout(timer);
    }
  }, [
    stage,
    visibleChars,
    responseComplete,
    prefersReducedMotion,
    current.response.length,
  ]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const next: Record<
      Exclude<DemoStage, "analysis" | "response" | "prefill">,
      { delay: number; stage: DemoStage }
    > = {
      user: { delay: 1400, stage: "thinking" },
      thinking: { delay: 2400, stage: "response" },
    };

    if (stage === "analysis") {
      timerRef.current = setTimeout(() => {
        archiveCurrentTurn();
        setTurnIndex((index) => (index + 1) % conversations.length);
        setStage("prefill");
      }, ANALYSIS_HOLD_MS);
    } else if (stage !== "response" && stage !== "prefill") {
      timerRef.current = setTimeout(
        () => setStage(next[stage].stage),
        next[stage].delay,
      );
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [stage, archiveCurrentTurn, conversations.length]);

  useLayoutEffect(() => {
    scrollToBottom();
    requestAnimationFrame(() => {
      pruneOffscreenTurns();
    });
  }, [archivedTurns, stage, visibleChars, scrollToBottom, pruneOffscreenTurns]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      scrollToBottom();
      pruneOffscreenTurns();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [scrollToBottom, pruneOffscreenTurns]);

  useEffect(
    () => () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      if (inputTimerRef.current) clearTimeout(inputTimerRef.current);
    },
    [],
  );

  const showUser = stage !== "prefill";
  const showAssistant =
    stage === "thinking" || stage === "response" || stage === "analysis";

  return (
    <div
      className={cn(
        "grid h-full min-h-0 w-full min-w-0 max-w-full grid-rows-[48px_minmax(0,1fr)_60px] overflow-hidden rounded-lg bg-transparent text-[oklch(0.22_0.01_95)] dark:text-[oklch(0.94_0_0)]",
        className,
      )}
    >
      <div className="flex h-12 min-w-0 items-center border-b border-black/10 px-3 dark:border-white/10 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[oklch(0.22_0.01_95)] text-white dark:bg-[oklch(0.94_0_0)] dark:text-[oklch(0.17_0.01_95)]">
            <Sparkles className="size-3.5" />
          </span>
          <span className="truncate text-xs font-medium sm:text-sm">
            {t("landing.features.chat-feature.title")}
          </span>
        </div>
        <div className="ml-auto hidden items-center gap-1.5 text-[11px] text-black/45 dark:text-white/45 min-[360px]:flex">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {t("landing.features.chat-feature.stat")}
        </div>
      </div>

      <div
        ref={scrollRef}
        aria-live="polite"
        className="min-h-0 overflow-hidden"
      >
        <div className="flex min-h-full flex-col justify-end gap-3 p-3 sm:gap-4 sm:p-5">
          {archivedTurns.map((turn) => (
            <div
              key={turn.id}
              ref={(node) => setTurnRef(turn.id, node)}
              className="space-y-2.5 sm:space-y-3"
            >
              <div className={USER_BUBBLE}>{turn.question}</div>
              <AssistantReply
                content={turn.response}
                analysis={turn.analysis}
                t={t}
              />
            </div>
          ))}

          {(showUser || showAssistant) && (
            <div
              ref={(node) => setTurnRef("active-turn", node)}
              className="space-y-2.5 sm:space-y-3"
            >
              {showUser && (
                <div className={cn("coach-enter", USER_BUBBLE)}>
                  {current.question}
                </div>
              )}

              {showAssistant && (
                <div className="coach-enter min-w-0 max-w-full sm:max-w-[92%]">
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-black/45 dark:text-white/45">
                    <Sparkles className="size-3" />
                    Deltalytix
                  </div>

                  {stage === "thinking" ? (
                    <div
                      className={cn(
                        ASSISTANT_BUBBLE,
                        "inline-flex items-center gap-1 py-3",
                      )}
                    >
                      <span className="coach-dot size-1.5 rounded-full bg-current opacity-35" />
                      <span className="coach-dot size-1.5 rounded-full bg-current opacity-35 [animation-delay:160ms]" />
                      <span className="coach-dot size-1.5 rounded-full bg-current opacity-35 [animation-delay:320ms]" />
                    </div>
                  ) : (
                    <div
                      className={cn(ASSISTANT_BUBBLE, "min-w-0 overflow-hidden")}
                    >
                      <p>
                        {typedResponse}
                        {!responseComplete && (
                          <span className="coach-cursor ml-px inline-block h-[1em] w-px align-[-0.1em] bg-current opacity-60" />
                        )}
                      </p>

                      {stage === "analysis" && (
                        <AnalysisCard
                          analysis={{
                            metric: current.metric,
                            value: current.value,
                            insight: current.insight,
                            trend: current.trend,
                          }}
                          t={t}
                        />
                      )}
                    </div>
                  )}

                  {responseComplete && stage !== "thinking" && (
                    <div className="mt-1.5 flex items-center gap-1 text-black/35 dark:text-white/35">
                      <button
                        type="button"
                        aria-label={
                          copied
                            ? t("landing.features.chat-feature.copiedLabel")
                            : t("landing.features.chat-feature.copyLabel")
                        }
                        onClick={handleCopy}
                        className="rounded p-1 transition-[color,transform,background-color] duration-150 ease hover:bg-black/[0.05] hover:text-black/60 active:scale-[0.96] dark:hover:bg-white/[0.06] dark:hover:text-white/60"
                      >
                        {copied ? (
                          <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="h-[60px] min-w-0 p-3 pt-1 sm:px-4 sm:pb-3 sm:pt-1">
        <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-black/[0.025] px-3 py-2 dark:border-white/10 dark:bg-white/[0.035]">
          <Database className="size-3.5 shrink-0 text-black/35 dark:text-white/35" />
          <span
            className={cn(
              "coach-input min-w-0 flex-1 truncate text-[11px]",
              typedInput
                ? "coach-input-typing text-black/70 dark:text-white/70"
                : "text-black/35 dark:text-white/35",
            )}
          >
            {typedInput ||
              (!hasStarted
                ? t("landing.features.chat-feature.inputPlaceholder")
                : "")}
            {!inputComplete && (typedInput.length > 0 || stage === "prefill") && (
              <span className="coach-input-cursor ml-px inline-block w-px align-[-0.1em] bg-current opacity-70" />
            )}
          </span>
          <button
            type="button"
            aria-label="Send suggested message"
            disabled={!canSend}
            onClick={sendMessage}
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[oklch(0.22_0.01_95)] text-white transition-[transform,opacity] duration-150 ease-out active:scale-[0.96] disabled:cursor-default disabled:opacity-35 dark:bg-[oklch(0.94_0_0)] dark:text-[oklch(0.17_0.01_95)]"
          >
            <ArrowUp className="size-3.5" />
          </button>
        </div>
      </div>

      <style jsx>{`
        .coach-enter {
          animation: coach-enter 420ms cubic-bezier(0.23, 1, 0.32, 1) both;
          will-change: transform, opacity;
        }

        .coach-analysis {
          animation: coach-analysis 360ms cubic-bezier(0.23, 1, 0.32, 1) both;
          will-change: transform, opacity;
        }

        .coach-cursor {
          animation: coach-cursor 900ms ease-in-out infinite;
        }

        .coach-dot {
          animation: coach-dot 1200ms ease-in-out infinite;
        }

        .coach-input-typing {
          background: linear-gradient(
            90deg,
            oklch(0.22 0.01 95 / 0.75) 0%,
            oklch(0.22 0.01 95) 35%,
            oklch(0.22 0.01 95 / 0.55) 70%,
            oklch(0.22 0.01 95 / 0.75) 100%
          );
          background-size: 220% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: coach-input-shimmer 2.4s ease-in-out infinite;
        }

        :global(.dark) .coach-input-typing {
          background: linear-gradient(
            90deg,
            oklch(0.94 0 0 / 0.65) 0%,
            oklch(0.94 0 0) 35%,
            oklch(0.94 0 0 / 0.55) 70%,
            oklch(0.94 0 0 / 0.65) 100%
          );
          background-size: 220% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .coach-input-cursor {
          animation: coach-input-cursor 900ms ease-in-out infinite;
        }

        @keyframes coach-input-shimmer {
          0% {
            background-position: 120% 0;
          }
          100% {
            background-position: -120% 0;
          }
        }

        @keyframes coach-input-cursor {
          0%,
          45%,
          100% {
            opacity: 0;
          }
          50%,
          95% {
            opacity: 0.85;
          }
        }

        @keyframes coach-enter {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes coach-analysis {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes coach-cursor {
          0%,
          45%,
          100% {
            opacity: 0;
          }
          50%,
          95% {
            opacity: 0.7;
          }
        }

        @keyframes coach-dot {
          0%,
          60%,
          100% {
            transform: translateY(0);
            opacity: 0.35;
          }
          30% {
            transform: translateY(-2px);
            opacity: 0.75;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .coach-enter,
          .coach-analysis,
          .coach-cursor,
          .coach-dot,
          .coach-input-typing,
          .coach-input-cursor {
            animation: none;
          }

          .coach-input-typing {
            color: inherit;
            background: none;
          }
        }
      `}</style>
    </div>
  );
}
