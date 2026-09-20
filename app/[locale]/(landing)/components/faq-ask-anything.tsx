"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ArrowUp, Loader2 } from "lucide-react";
import { useCurrentLocale, useI18n } from "@/locales/landing-client";
import { localizeLandingHref } from "@/lib/landing-nav-paths";
import { cn } from "@/lib/utils";
import { FaqAnswer } from "./faq-answer";

type AskStatus = "idle" | "loading" | "ready" | "error";

export function FaqAskAnything() {
  const t = useI18n();
  const locale = useCurrentLocale();
  const inputId = useId();
  const statusId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<AskStatus>("idle");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [emptyError, setEmptyError] = useState(false);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  async function submit() {
    const trimmed = question.trim();
    if (!trimmed) {
      setEmptyError(true);
      inputRef.current?.focus();
      return;
    }

    setEmptyError(false);
    setStatus("loading");
    setAnswer(null);
    setIsFallback(false);

    try {
      const response = await fetch("/api/landing/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, locale }),
      });
      const body = (await response.json()) as {
        answer?: string;
        source?: string;
      };

      if (!response.ok || typeof body.answer !== "string") {
        setStatus("error");
        return;
      }

      setAnswer(body.answer);
      setIsFallback(body.source === "fallback");
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  const describedBy =
    emptyError || status === "error" || status === "loading" || status === "ready"
      ? statusId
      : undefined;

  return (
    <div className="border-t border-black/10 dark:border-white/10">
      {!editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex w-full items-center justify-between gap-4 py-5 text-start text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span>{t("faq.askAnything.label")}</span>
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
      ) : (
        <form
          className="py-5"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="flex items-center gap-3">
            <label htmlFor={inputId} className="sr-only">
              {t("faq.askAnything.label")}
            </label>
            <input
              id={inputId}
              ref={inputRef}
              name="faq-question"
              type="text"
              inputMode="text"
              autoComplete="off"
              value={question}
              onChange={(event) => {
                setQuestion(event.target.value);
                if (emptyError) setEmptyError(false);
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Escape" &&
                  status !== "loading" &&
                  !answer
                ) {
                  setEditing(false);
                  setEmptyError(false);
                }
              }}
              placeholder={t("faq.askAnything.placeholder")}
              disabled={status === "loading"}
              aria-invalid={emptyError || status === "error"}
              aria-describedby={describedBy}
              className="min-h-11 min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none placeholder:font-normal placeholder:text-black/40 focus-visible:outline-none disabled:opacity-60 dark:placeholder:text-white/40"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              aria-label={t("faq.askAnything.send")}
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:active:scale-[0.96]",
                "disabled:opacity-50",
              )}
            >
              {status === "loading" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowUp className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {emptyError ? (
            <p
              id={statusId}
              role="alert"
              className="mt-3 text-sm text-black/55 dark:text-white/55"
            >
              {t("faq.askAnything.empty")}
            </p>
          ) : null}

          {status === "error" ? (
            <p
              id={statusId}
              role="alert"
              className="mt-3 text-sm text-black/55 dark:text-white/55"
            >
              {t("faq.askAnything.error")}
            </p>
          ) : null}

          {status === "loading" ? (
            <p
              id={statusId}
              role="status"
              className="mt-3 text-base leading-relaxed text-black/55 dark:text-white/55"
            >
              {t("faq.askAnything.loading")}
            </p>
          ) : null}

          {status === "ready" && answer ? (
            <div id={statusId} role="status" className="mt-4 space-y-3">
              <FaqAnswer text={answer} />
              {isFallback ? (
                <p className="text-base leading-relaxed text-black/55 dark:text-white/55">
                  {t("faq.askAnything.fallbackHint")}{" "}
                  <a
                    href={localizeLandingHref(locale, "/support")}
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    {t("faq.askAnything.support")}
                  </a>
                </p>
              ) : null}
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}
