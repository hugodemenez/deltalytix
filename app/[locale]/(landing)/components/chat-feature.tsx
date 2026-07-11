"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

type DemoStage = "idle" | "user" | "thinking" | "response" | "analysis";

export default function TradingChatAssistant({
  className,
}: TradingChatAssistantProps) {
  const t = useI18n();
  const [stage, setStage] = useState<DemoStage>("idle");
  const [turnIndex, setTurnIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversations = [
    {
      question: t("landing.features.chat-feature.conversation.analyze"),
      response: t("landing.features.chat-feature.responses.analyze"),
      metric: t("landing.features.chat-feature.analysis.winRate.metric"),
      value: t("landing.features.chat-feature.analysis.winRate.value"),
      insight: t("landing.features.chat-feature.analysis.winRate.insight"),
      trend: "positive" as const,
    },
    {
      question: t("landing.features.chat-feature.conversation.patterns"),
      response: t("landing.features.chat-feature.responses.patterns"),
      metric: t("landing.features.chat-feature.analysis.revengeTrading.metric"),
      value: t("landing.features.chat-feature.analysis.revengeTrading.value"),
      insight: t(
        "landing.features.chat-feature.analysis.revengeTrading.insight",
      ),
      trend: "negative" as const,
    },
    {
      question: t("landing.features.chat-feature.conversation.riskManagement"),
      response: t("landing.features.chat-feature.responses.riskManagement"),
      metric: t("landing.features.chat-feature.analysis.riskReward.metric"),
      value: t("landing.features.chat-feature.analysis.riskReward.value"),
      insight: t("landing.features.chat-feature.analysis.riskReward.insight"),
      trend: "positive" as const,
    },
  ];

  const current = conversations[turnIndex];
  const previous = turnIndex > 0 ? conversations[turnIndex - 1] : null;

  const sendMessage = useCallback(() => {
    setStage((current) => (current === "idle" ? "user" : current));
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const next: Record<
      Exclude<DemoStage, "analysis">,
      { delay: number; stage: DemoStage }
    > = {
      idle: { delay: 2600, stage: "user" },
      user: { delay: 650, stage: "thinking" },
      thinking: { delay: 900, stage: "response" },
      response: { delay: 700, stage: "analysis" },
    };

    if (stage === "analysis") {
      timerRef.current = setTimeout(
        () => {
          if (turnIndex < conversations.length - 1) {
            setTurnIndex((index) => index + 1);
            setStage("user");
          } else {
            setTurnIndex(0);
            setStage("idle");
          }
        },
        turnIndex < conversations.length - 1 ? 3000 : 5200,
      );
    } else {
      timerRef.current = setTimeout(
        () => setStage(next[stage].stage),
        next[stage].delay,
      );
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [stage, turnIndex, conversations.length]);

  const showUser = stage !== "idle";
  const showAssistant = stage === "response" || stage === "analysis";

  return (
    <div
      className={cn(
        "grid h-full min-h-0 w-full min-w-0 max-w-full grid-rows-[48px_minmax(0,1fr)_60px] overflow-hidden rounded-lg border border-black/10 bg-transparent text-[#26251e] dark:border-white/10 dark:text-[#edecec]",
        className,
      )}
    >
      <div className="flex h-12 min-w-0 items-center border-b border-black/10 px-3 dark:border-white/10 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#26251e] text-white dark:bg-[#edecec] dark:text-[#14120b]">
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
        aria-live="polite"
        className="flex h-full min-h-0 min-w-0 flex-col justify-end gap-3 overflow-hidden p-3 sm:gap-4 sm:p-5"
      >
        {previous && (
          <div className="coach-history space-y-2 opacity-55">
            <div className="ml-auto max-w-[78%] truncate rounded-xl rounded-br-sm bg-[#26251e] px-3 py-1.5 text-[10px] text-white dark:bg-[#edecec] dark:text-[#14120b]">
              {previous.question}
            </div>
            <div className="max-w-[82%] truncate rounded-xl rounded-bl-sm bg-black/[0.045] px-3 py-1.5 text-[10px] dark:bg-white/[0.06]">
              {previous.response}
            </div>
          </div>
        )}

        {showUser && (
          <div className="coach-enter ml-auto max-w-[92%] rounded-2xl rounded-br-sm bg-[#26251e] px-3 py-2 text-[11px] leading-relaxed text-white dark:bg-[#edecec] dark:text-[#14120b] sm:max-w-[82%] sm:px-3.5 sm:py-2.5 sm:text-xs">
            {current.question}
          </div>
        )}

        {(stage === "thinking" || showAssistant) && (
          <div className="coach-enter min-w-0 max-w-full sm:max-w-[92%]">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-black/45 dark:text-white/45">
              <Sparkles className="size-3" />
              Deltalytix
            </div>

            {stage === "thinking" ? (
              <div className="inline-flex items-center gap-1 rounded-2xl rounded-bl-sm bg-black/[0.045] px-3.5 py-3 dark:bg-white/[0.06]">
                <span className="coach-dot size-1.5 rounded-full bg-current opacity-35" />
                <span className="coach-dot size-1.5 rounded-full bg-current opacity-35 [animation-delay:120ms]" />
                <span className="coach-dot size-1.5 rounded-full bg-current opacity-35 [animation-delay:240ms]" />
              </div>
            ) : (
              <div className="min-w-0 overflow-hidden rounded-2xl rounded-bl-sm bg-black/[0.045] px-3 py-2.5 text-[11px] leading-relaxed dark:bg-white/[0.06] sm:px-3.5 sm:py-3 sm:text-xs">
                <p className="coach-reveal">{current.response}</p>

                {stage === "analysis" && (
                  <div className="coach-enter mt-3 overflow-hidden rounded-lg border border-black/10 bg-black/[0.025] dark:border-white/10 dark:bg-white/[0.035]">
                    <div className="flex items-center justify-between border-b border-black/10 px-3 py-2 dark:border-white/10">
                      <div className="flex items-center gap-2 text-[11px] font-medium">
                        <BarChart3 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        {current.metric}
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                        <Check className="mr-1 inline size-2.5" />
                        {current.trend === "positive"
                          ? t(
                              "landing.features.chat-feature.analysis.trends.positive",
                            )
                          : t(
                              "landing.features.chat-feature.analysis.trends.negative",
                            )}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1 px-3 py-2.5 min-[360px]:grid-cols-[auto_1fr] min-[360px]:gap-3">
                      <span className="text-lg font-medium tracking-tight sm:text-xl">
                        {current.value}
                      </span>
                      <p className="line-clamp-2 text-[10px] leading-relaxed text-black/50 dark:text-white/50 max-[359px]:line-clamp-1">
                        {current.insight}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {showAssistant && (
              <div className="coach-enter mt-1.5 flex items-center gap-1 text-black/35 dark:text-white/35">
                <span aria-hidden="true" className="rounded p-1">
                  <Copy className="size-3" />
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="h-[60px] min-w-0 p-3 pt-1 sm:px-4 sm:pb-3 sm:pt-1">
        <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-black/[0.025] px-3 py-2 dark:border-white/10 dark:bg-white/[0.035]">
          <Database className="size-3.5 shrink-0 text-black/35 dark:text-white/35" />
          <span className="min-w-0 flex-1 truncate text-[11px] text-black/35 dark:text-white/35">
            {current.question}
          </span>
          <button
            type="button"
            aria-label="Send suggested message"
            disabled={stage !== "idle"}
            onClick={sendMessage}
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#26251e] text-white transition-[transform,opacity] duration-150 ease-out active:scale-[0.94] disabled:cursor-default disabled:opacity-35 dark:bg-[#edecec] dark:text-[#14120b]"
          >
            <ArrowUp className="size-3.5" />
          </button>
        </div>
      </div>

      <style jsx>{`
        .coach-enter {
          animation: coach-enter 220ms cubic-bezier(0.215, 0.61, 0.355, 1) both;
          will-change: transform, opacity;
        }

        .coach-reveal {
          animation: coach-reveal 280ms cubic-bezier(0.215, 0.61, 0.355, 1) both;
        }

        .coach-dot {
          animation: coach-dot 900ms ease-in-out infinite;
        }

        .coach-history {
          animation: coach-history 200ms cubic-bezier(0.645, 0.045, 0.355, 1)
            both;
        }

        @keyframes coach-enter {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes coach-reveal {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
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
            transform: translateY(-3px);
            opacity: 0.8;
          }
        }

        @keyframes coach-history {
          from {
            opacity: 1;
            transform: translateY(6px);
          }
          to {
            opacity: 0.55;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .coach-enter,
          .coach-reveal,
          .coach-dot {
            animation: none;
          }

          .coach-history {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
