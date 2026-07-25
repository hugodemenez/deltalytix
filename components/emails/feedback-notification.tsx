import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type FeedbackType = "bug" | "feature" | "other";

interface FeedbackNotificationEmailProps {
  feedbackType?: FeedbackType;
  message: string;
  userEmail?: string | null;
  userId: string;
  locale?: string;
  submittedAt?: string;
}

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "BUG REPORT",
  feature: "FEATURE REQUEST",
  other: "FEEDBACK",
};

// Same Paper design system as the user-facing acknowledgement, kept denser:
// this one is read by the team, so metadata comes before prose.
const styles = {
  body: {
    margin: "0",
    backgroundColor: "#F7F7F4",
    fontFamily: "Geist, Arial, Helvetica, sans-serif",
    color: "#171917",
  },
  container: {
    width: "100%",
    maxWidth: "600px",
    margin: "0 auto",
    backgroundColor: "#FFFFFF",
  },
  content: {
    padding: "24px 24px 36px",
  },
  eyebrow: {
    margin: "0 0 12px",
    color: "#3E7550",
    fontSize: "12px",
    lineHeight: "18px",
    fontWeight: 500,
  },
  title: {
    margin: "0 0 24px",
    color: "#171917",
    fontSize: "34px",
    lineHeight: "40px",
    fontWeight: 300,
  },
  meta: {
    padding: "20px 24px",
    backgroundColor: "#F2F2EE",
    borderRadius: "12px",
  },
  metaRow: {
    margin: "0 0 6px",
    color: "#686D67",
    fontSize: "13px",
    lineHeight: "20px",
  },
  metaValue: {
    color: "#171917",
  },
  sectionHeading: {
    margin: "32px 0 12px",
    color: "#171917",
    fontSize: "14px",
    lineHeight: "18px",
    fontWeight: 500,
  },
  message: {
    margin: "0",
    color: "#171917",
    fontSize: "16px",
    lineHeight: "25px",
    whiteSpace: "pre-wrap" as const,
  },
  // Padded wrapper rather than margin on the rule itself: Hr is width:100%, so
  // horizontal margin would push it past the container edge.
  dividerWrap: {
    padding: "0 24px",
  },
  divider: {
    margin: "0",
    borderColor: "#E2E5DF",
    borderTopWidth: "1px",
  },
  footer: {
    padding: "24px",
  },
  footerText: {
    margin: "0",
    color: "#686D67",
    fontSize: "12px",
    lineHeight: "18px",
  },
};

export default function FeedbackNotificationEmail({
  feedbackType = "other",
  message,
  userEmail,
  userId,
  locale = "en",
  submittedAt,
}: FeedbackNotificationEmailProps) {
  const label = TYPE_LABELS[feedbackType] ?? TYPE_LABELS.other;

  return (
    <Html lang="en">
      <Head />
      <Preview>{`${label} from ${userEmail ?? userId}`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.content}>
            <Text style={styles.eyebrow}>{label}</Text>
            <Heading as="h1" style={styles.title}>
              New feedback
            </Heading>

            <Section style={styles.meta}>
              <Text style={styles.metaRow}>
                From: <span style={styles.metaValue}>{userEmail ?? "no email on account"}</span>
              </Text>
              <Text style={styles.metaRow}>
                User ID: <span style={styles.metaValue}>{userId}</span>
              </Text>
              <Text style={styles.metaRow}>
                Locale: <span style={styles.metaValue}>{locale}</span>
              </Text>
              {submittedAt ? (
                <Text style={{ ...styles.metaRow, marginBottom: "0" }}>
                  Submitted: <span style={styles.metaValue}>{submittedAt}</span>
                </Text>
              ) : null}
            </Section>

            <Heading as="h2" style={styles.sectionHeading}>
              MESSAGE
            </Heading>
            <Text style={styles.message}>{message}</Text>
          </Section>

          <Section style={styles.dividerWrap}>
            <Hr style={styles.divider} />
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Sent from the Deltalytix dashboard feedback button. Reply to this email to
              answer the user directly.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

FeedbackNotificationEmail.PreviewProps = {
  feedbackType: "bug" as FeedbackType,
  message:
    "The equity curve widget does not refresh after I import a new CSV. I have to reload the whole dashboard before the new trades show up.",
  userEmail: "trader@example.com",
  userId: "8f2a1c44-0f1e-4c9d-9a1b-6d3e2f7c5b10",
  locale: "en",
  submittedAt: "2026-07-25 09:41 UTC",
};
