import "server-only";

import { createElement } from "react";
import { Resend } from "resend";

import FeedbackAcknowledgementEmail from "@/components/emails/feedback-acknowledgement";
import FeedbackNotificationEmail from "@/components/emails/feedback-notification";
import { getSupportEmailConfig } from "@/lib/resend-from";

export type FeedbackEmailLocale = "en" | "fr";

interface FeedbackEmailInput {
  type: "bug" | "feature" | "other";
  message: string;
  userId: string;
  userEmail: string | null;
  locale: FeedbackEmailLocale;
}

const SUBJECT_PREFIX: Record<FeedbackEmailInput["type"], string> = {
  bug: "Bug report",
  feature: "Feature request",
  other: "Feedback",
};

const ACKNOWLEDGEMENT_SUBJECT: Record<FeedbackEmailLocale, string> = {
  en: "We received your feedback",
  fr: "Nous avons bien reçu votre retour",
};

function firstNameFrom(email: string | null) {
  const localPart = email?.split("@")[0]?.split(/[._-]/)[0];
  if (!localPart) return "trader";
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}

/**
 * Notifies the support inbox. This is the actionable copy and the durable
 * archive — PostHog event retention is plan-limited, the inbox is not — so
 * `submitFeedback` treats its success as sufficient on its own.
 */
export async function sendFeedbackNotificationEmail(
  input: FeedbackEmailInput,
): Promise<boolean> {
  const config = getSupportEmailConfig();
  if (!config.ok) {
    console.warn("[Feedback] Notification email skipped:", config.error);
    return false;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: config.from,
      to: [config.to],
      // Replying in the inbox answers the user directly.
      ...(input.userEmail ? { replyTo: input.userEmail } : {}),
      subject: `${SUBJECT_PREFIX[input.type]} from ${input.userEmail ?? input.userId}`,
      react: createElement(FeedbackNotificationEmail, {
        feedbackType: input.type,
        message: input.message,
        userEmail: input.userEmail,
        userId: input.userId,
        locale: input.locale,
        submittedAt: new Date().toISOString(),
      }),
    });

    if (error) {
      console.error("[Feedback] Failed to send notification email:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Feedback] Failed to send notification email:", error);
    return false;
  }
}

/**
 * Courtesy confirmation to the submitter. Always best-effort: the feedback is
 * already delivered by the time this runs, so a failure here must never fail
 * the submission.
 */
export async function sendFeedbackAcknowledgementEmail(
  input: FeedbackEmailInput,
): Promise<boolean> {
  if (!input.userEmail) return false;

  const config = getSupportEmailConfig();
  if (!config.ok) {
    console.warn("[Feedback] Acknowledgement email skipped:", config.error);
    return false;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: config.from,
      to: [input.userEmail],
      replyTo: config.to,
      subject: ACKNOWLEDGEMENT_SUBJECT[input.locale],
      react: createElement(FeedbackAcknowledgementEmail, {
        firstName: firstNameFrom(input.userEmail),
        language: input.locale,
        feedbackType: input.type,
        message: input.message,
      }),
    });

    if (error) {
      console.error("[Feedback] Failed to send acknowledgement email:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Feedback] Failed to send acknowledgement email:", error);
    return false;
  }
}
