"use client";

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  BarChart3,
  Check,
  Database,
  Plus,
  RotateCcw,
  Send,
} from "lucide-react";

import { useI18n } from "@/locales/landing-client";
import { cn } from "@/lib/utils";

interface TradingChatAssistantProps {
  className?: string;
}

type DemoStage =
  | "composing"
  | "question"
  | "thinking"
  | "response"
  | "insight";

type ConversationTurn = {
  question: string;
  response: string;
  metric: string;
  value: string;
  insight: string;
  trend: "positive" | "negative";
};

type DemoTurn = {
  id: number;
  conversationIndex: number;
  stage: DemoStage;
};

const INPUT_CHARS_PER_TICK = 5;
const INPUT_TYPEWRITER_MS = 12;
const RESPONSE_CHARS_PER_TICK = 12;
const RESPONSE_CHUNK_MS = 55;
const MAX_VISIBLE_TURNS = 3;
const CONVERSATION_COUNT = 3;

const STAGE_TIMINGS: Record<DemoStage, number> = {
  composing: 1000,
  question: 450,
  thinking: 1200,
  response: 320,
  insight: 3400,
};

function AnalysisCard({
  turn,
  t,
}: {
  turn: ConversationTurn;
  t: ReturnType<typeof useI18n>;
}) {
  const isPositive = turn.trend === "positive";

  return (
    <div className="coach-insight overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
          <BarChart3 className="size-3.5 shrink-0" />
          <span className="truncate">{turn.metric}</span>
        </div>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] sm:text-[9px]",
            isPositive
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-500/10 text-amber-800 dark:text-amber-300",
          )}
        >
          <Check className="size-2.5" />
          {isPositive
            ? t("landing.features.chat-feature.analysis.trends.positive")
            : t("landing.features.chat-feature.analysis.trends.negative")}
        </span>
      </div>
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-3 py-2.5">
        <span className="whitespace-nowrap text-lg font-medium tracking-[-0.03em] sm:text-xl">
          {turn.value}
        </span>
        <p className="min-w-0 text-[9px] leading-relaxed text-muted-foreground sm:text-[10px]">
          {turn.insight}
        </p>
      </div>
    </div>
  );
}

function ConversationItem({
  item,
  turn,
  isActive,
  responseText,
  t,
}: {
  item: DemoTurn;
  turn: ConversationTurn;
  isActive: boolean;
  responseText: string;
  t: ReturnType<typeof useI18n>;
}) {
  const showQuestion = item.stage !== "composing";
  const showAssistant =
    item.stage === "thinking" ||
    item.stage === "response" ||
    item.stage === "insight";
  const responseRevealed =
    item.stage === "response" || item.stage === "insight";
  const insightRevealed = item.stage === "insight";

  return (
    <div className="space-y-2.5 sm:space-y-3" data-demo-turn={item.id}>
      {showQuestion && (
        <div
          className={cn(
            "ml-auto w-fit max-w-[80%] rounded-xl border border-transparent bg-primary px-3 py-2 text-[10px] leading-relaxed text-primary-foreground sm:text-[11px]",
            isActive && "coach-message-enter",
          )}
        >
          {turn.question}
        </div>
      )}

      {showAssistant && (
        <div
          className={cn(
            "max-w-[88%]",
            isActive && "coach-message-enter",
          )}
        >
          <div
            className={cn(
              "t-skel overflow-hidden rounded-xl bg-muted text-foreground",
              responseRevealed && "is-revealed",
            )}
          >
            <div className="t-skel-skeleton is-pulsing flex flex-col justify-center gap-2 px-3 py-3">
              <span className="h-2 w-[88%] rounded-full bg-foreground/10" />
              <span className="h-2 w-[68%] rounded-full bg-foreground/[0.08]" />
              <span className="mt-0.5 text-[9px] text-muted-foreground sm:text-[10px]">
                {t("landing.features.chat-feature.analyzing")}
              </span>
            </div>
            <div className="t-skel-content box-border flex min-h-[96px] items-start p-3">
              <p className="text-[10px] leading-relaxed sm:text-[11px]">
                {responseText}
              </p>
            </div>
          </div>
        </div>
      )}

      {insightRevealed && <AnalysisCard turn={turn} t={t} />}
    </div>
  );
}

export default function TradingChatAssistant({
  className,
}: TradingChatAssistantProps) {
  const t = useI18n();
  const conversations: ConversationTurn[] = [
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
      question: t("landing.features.chat-feature.conversation.analyze"),
      response: t("landing.features.chat-feature.responses.analyze"),
      metric: t("landing.features.chat-feature.analysis.winRate.metric"),
      value: t("landing.features.chat-feature.analysis.winRate.value"),
      insight: t("landing.features.chat-feature.analysis.winRate.insight"),
      trend: "positive",
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

  const [turns, setTurns] = useState<DemoTurn[]>([
    { id: 1, conversationIndex: 0, stage: "composing" },
  ]);
  const [inputChars, setInputChars] = useState(0);
  const [responseChars, setResponseChars] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const nextIdRef = useRef(1);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const activeTurn = turns[turns.length - 1];
  const activeConversation = conversations[activeTurn.conversationIndex];
  const typedInput = activeConversation.question.slice(
    0,
    prefersReducedMotion ? activeConversation.question.length : inputChars,
  );
  const responseComplete =
    prefersReducedMotion || responseChars >= activeConversation.response.length;
  const streamedResponse = activeConversation.response.slice(
    0,
    prefersReducedMotion
      ? activeConversation.response.length
      : responseChars,
  );
  const isProcessing =
    activeTurn.stage === "thinking" || activeTurn.stage === "response";

  const resetDemo = () => {
    nextIdRef.current = 1;
    setTurns([{ id: 1, conversationIndex: 0, stage: "composing" }]);
    setInputChars(0);
    setResponseChars(0);
  };

  const advanceStage = () => {
    if (activeTurn.stage === "insight") {
      const nextConversationIndex =
        (activeTurn.conversationIndex + 1) % CONVERSATION_COUNT;
      nextIdRef.current += 1;

      setTurns((previous) => [
        ...previous.slice(-(MAX_VISIBLE_TURNS - 1)),
        {
          id: nextIdRef.current,
          conversationIndex: nextConversationIndex,
          stage: "composing",
        },
      ]);
      setInputChars(0);
      setResponseChars(0);
      return;
    }

    const nextStage: Record<Exclude<DemoStage, "insight">, DemoStage> = {
      composing: "question",
      question: "thinking",
      thinking: "response",
      response: "insight",
    };
    const followingStage = nextStage[
      activeTurn.stage as Exclude<DemoStage, "insight">
    ];

    setTurns((previous) =>
      previous.map((turn, index) =>
        index === previous.length - 1
          ? { ...turn, stage: followingStage }
          : turn,
      ),
    );
  };

  const advanceStageFromTimer = useEffectEvent(advanceStage);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(media.matches);
    syncPreference();
    media.addEventListener("change", syncPreference);
    return () => media.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (
      activeTurn.stage !== "composing" ||
      inputChars >= activeConversation.question.length ||
      prefersReducedMotion
    ) {
      return;
    }

    const timer = setTimeout(() => {
      setInputChars((count) =>
        Math.min(count + INPUT_CHARS_PER_TICK, activeConversation.question.length),
      );
    }, INPUT_TYPEWRITER_MS);

    return () => clearTimeout(timer);
  }, [
    activeConversation.question.length,
    activeTurn.stage,
    inputChars,
    prefersReducedMotion,
  ]);

  useEffect(() => {
    if (
      activeTurn.stage !== "response" ||
      responseComplete ||
      prefersReducedMotion
    ) {
      return;
    }

    const timer = setTimeout(() => {
      setResponseChars((count) =>
        Math.min(
          count + RESPONSE_CHARS_PER_TICK,
          activeConversation.response.length,
        ),
      );
    }, RESPONSE_CHUNK_MS);

    return () => clearTimeout(timer);
  }, [
    activeConversation.response.length,
    activeTurn.stage,
    prefersReducedMotion,
    responseChars,
    responseComplete,
  ]);

  useEffect(() => {
    if (stageTimerRef.current) clearTimeout(stageTimerRef.current);

    if (activeTurn.stage === "response" && !responseComplete) return;

    const duration = prefersReducedMotion
      ? activeTurn.stage === "insight"
        ? STAGE_TIMINGS.insight
        : 80
      : STAGE_TIMINGS[activeTurn.stage];

    stageTimerRef.current = setTimeout(advanceStageFromTimer, duration);

    return () => {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
    };
  }, [activeTurn.stage, prefersReducedMotion, responseComplete]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const frame = requestAnimationFrame(() => {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [activeTurn.stage, prefersReducedMotion, turns]);

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden rounded-sm bg-[#ddddd8] p-3 text-foreground dark:bg-[#20201e] sm:p-5",
        className,
      )}
    >
      <div className="flex h-full w-full max-w-[760px] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3 sm:px-4">
          <span className="line-clamp-1 text-sm font-medium sm:text-base">
            {t("landing.features.chat-feature.widgetTitle")}
          </span>
          <button
            type="button"
            aria-label={t("landing.features.chat-feature.resetLabel")}
            title={t("landing.features.chat-feature.resetLabel")}
            onClick={resetDemo}
            disabled={isProcessing}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[color,background-color,transform] duration-150 ease hover:bg-muted hover:text-foreground active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            ref={viewportRef}
            aria-live="polite"
            data-demo-stage={activeTurn.stage}
            className="min-h-0 flex-1 overflow-hidden overscroll-none"
          >
            <div className="flex min-h-full flex-col justify-end gap-4 px-3.5 py-3 sm:px-5 sm:py-4">
              <div className="flex items-center gap-2 text-[9px] text-muted-foreground sm:text-[10px]">
                <Database className="size-3 shrink-0" />
                <span className="truncate">
                  {t("landing.features.chat-feature.contextAnalyzed")}
                </span>
              </div>

              {turns.map((item) => (
                <ConversationItem
                  key={item.id}
                  item={item}
                  turn={conversations[item.conversationIndex]}
                  isActive={item.id === activeTurn.id}
                  responseText={
                    item.id === activeTurn.id && item.stage === "response"
                      ? streamedResponse
                      : conversations[item.conversationIndex].response
                  }
                  t={t}
                />
              ))}
            </div>
          </div>

          <div className="shrink-0 border-t border-border p-2.5 sm:px-4 sm:py-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t("landing.features.chat-feature.attachLabel")}
                className="flex size-8 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-transform duration-150 ease-out active:scale-[0.96]"
              >
                <Plus className="size-3.5" />
              </button>
              <div className="flex h-8 min-w-0 flex-1 items-center rounded-md border border-input bg-background/50 px-3">
                <span className="min-w-0 flex-1 truncate text-[9px] text-muted-foreground sm:text-[10px]">
                  {activeTurn.stage === "composing"
                    ? typedInput
                    : t("landing.features.chat-feature.inputPlaceholder")}
                  {activeTurn.stage === "composing" && (
                    <span className="coach-caret ml-px inline-block h-[1em] w-px translate-y-[0.12em] bg-current" />
                  )}
                </span>
              </div>
              <button
                type="button"
                aria-label={t("landing.features.chat-feature.sendLabel")}
                onClick={advanceStage}
                className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-transform duration-150 ease-out active:scale-[0.96]"
              >
                <Send className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .coach-message-enter,
        .coach-insight {
          animation: coach-enter 240ms cubic-bezier(0.23, 1, 0.32, 1) both;
          will-change: transform, opacity;
        }

        .coach-insight {
          animation-delay: 30ms;
        }

        .coach-caret {
          animation: coach-caret 900ms ease-in-out infinite;
        }

        .t-skel {
          position: relative;
        }

        .t-skel-skeleton {
          position: absolute;
          inset: 0;
        }

        .t-skel-content {
          position: relative;
        }

        .t-skel-skeleton {
          z-index: 1;
          opacity: 1;
          filter: blur(0);
          transition:
            opacity 140ms cubic-bezier(0.23, 1, 0.32, 1),
            filter 140ms cubic-bezier(0.23, 1, 0.32, 1);
        }

        .t-skel-content {
          z-index: 2;
          opacity: 0;
          filter: blur(2px);
          transition:
            opacity 180ms cubic-bezier(0.23, 1, 0.32, 1) 120ms,
            filter 180ms cubic-bezier(0.23, 1, 0.32, 1) 120ms;
        }

        .t-skel.is-revealed .t-skel-skeleton {
          opacity: 0;
          filter: blur(2px);
        }

        .t-skel.is-revealed .t-skel-content {
          opacity: 1;
          filter: blur(0);
        }

        .t-skel-skeleton.is-pulsing > * {
          animation: t-skel-pulse 1000ms ease-in-out 1;
        }

        @keyframes coach-enter {
          from {
            opacity: 0;
            transform: translateY(5px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes coach-caret {
          0%,
          45%,
          100% {
            opacity: 0;
          }
          50%,
          95% {
            opacity: 0.75;
          }
        }

        @keyframes t-skel-pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .coach-message-enter,
          .coach-insight,
          .coach-caret,
          .t-skel-skeleton.is-pulsing > * {
            animation: none;
          }

          .t-skel-skeleton,
          .t-skel-content {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
