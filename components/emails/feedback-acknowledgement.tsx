import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type Language = "en" | "fr";
type FeedbackType = "bug" | "feature" | "other";

interface FeedbackAcknowledgementEmailProps {
  firstName?: string;
  language?: Language;
  feedbackType?: FeedbackType;
  message: string;
}

const copy = {
  en: {
    preview: "We received your feedback",
    greeting: "Hello",
    title: "Thanks for the feedback.",
    intro:
      "It reached the team. Notes like yours decide what gets built next, so every one of them gets read.",
    types: {
      bug: "BUG REPORT",
      feature: "FEATURE REQUEST",
      other: "FEEDBACK",
    },
    nextTitle: "What happens next",
    nextBody:
      "Bugs get investigated and you hear back at this address once there is something to share. Ideas join the roadmap discussion. Either way, you can reply straight to this email to add anything.",
    cta: "Back to your dashboard",
    signature: "Hugo",
    role: "Founder of Deltalytix",
    brand: "Deltalytix",
    reason:
      "You are receiving this email because you sent feedback from your Deltalytix dashboard.",
    privacy: "Privacy policy",
  },
  fr: {
    preview: "Nous avons bien reçu votre retour",
    greeting: "Bonjour",
    title: "Merci pour votre retour.",
    intro:
      "Il est bien arrivé jusqu’à l’équipe. Les messages comme le vôtre décident de ce qui sera construit ensuite, alors ils sont tous lus.",
    types: {
      bug: "SIGNALEMENT DE BUG",
      feature: "DEMANDE DE FONCTIONNALITÉ",
      other: "RETOUR",
    },
    nextTitle: "La suite",
    nextBody:
      "Les bugs sont examinés et vous recevez une réponse à cette adresse dès qu’il y a du nouveau. Les idées rejoignent les discussions sur la feuille de route. Dans tous les cas, vous pouvez répondre directement à cet email.",
    cta: "Retour au tableau de bord",
    signature: "Hugo",
    role: "Fondateur de Deltalytix",
    brand: "Deltalytix",
    reason:
      "Vous recevez cet email car vous avez envoyé un retour depuis votre tableau de bord Deltalytix.",
    privacy: "Politique de confidentialité",
  },
} as const;

// Values below come from the "Deltalytix — Email Design System" Paper file:
// canvas #F7F7F4, surface #FFFFFF, soft-green #EFF5EC, text #171917/#686D67,
// border #E2E5DF, action #181A18, positive #3E7550. Body is 600px with 24px
// outer padding, so content measures 552px.
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
  greeting: {
    margin: "0 0 16px",
    color: "#686D67",
    fontSize: "15px",
    lineHeight: "22px",
  },
  title: {
    margin: "0 0 16px",
    color: "#171917",
    fontSize: "42px",
    lineHeight: "52px",
    fontWeight: 300,
  },
  intro: {
    margin: "0",
    color: "#686D67",
    fontSize: "17px",
    lineHeight: "25px",
  },
  panel: {
    margin: "40px 0 0",
    padding: "28px",
    backgroundColor: "#EFF5EC",
    borderRadius: "16px",
  },
  panelEyebrow: {
    margin: "0 0 16px",
    color: "#3E7550",
    fontSize: "12px",
    lineHeight: "18px",
    fontWeight: 500,
  },
  quote: {
    margin: "0",
    color: "#171917",
    fontSize: "16px",
    lineHeight: "25px",
    whiteSpace: "pre-wrap" as const,
  },
  sectionHeading: {
    margin: "0 0 12px",
    color: "#171917",
    fontSize: "24px",
    lineHeight: "30px",
    fontWeight: 500,
  },
  sectionBody: {
    margin: "0",
    color: "#686D67",
    fontSize: "16px",
    lineHeight: "25px",
  },
  button: {
    display: "inline-block",
    marginTop: "24px",
    padding: "11px 18px",
    backgroundColor: "#181A18",
    borderRadius: "8px",
    color: "#FFFFFF",
    fontSize: "14px",
    lineHeight: "20px",
    fontWeight: 500,
    textDecoration: "none",
    whiteSpace: "nowrap" as const,
  },
  signature: {
    margin: "40px 0 0",
    color: "#171917",
    fontSize: "16px",
    lineHeight: "25px",
  },
  role: {
    color: "#686D67",
    fontSize: "14px",
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
    padding: "28px 24px 32px",
  },
  footerBrand: {
    margin: "0 0 10px",
    color: "#171917",
    fontSize: "14px",
    lineHeight: "20px",
    fontWeight: 500,
  },
  footerText: {
    margin: "0 0 10px",
    color: "#686D67",
    fontSize: "12px",
    lineHeight: "18px",
  },
  footerLink: {
    color: "#686D67",
    fontSize: "12px",
    lineHeight: "18px",
    textDecoration: "underline",
  },
};

export default function FeedbackAcknowledgementEmail({
  firstName = "trader",
  language = "en",
  feedbackType = "other",
  message,
}: FeedbackAcknowledgementEmailProps) {
  const t = copy[language] ?? copy.en;
  const locale: Language = language === "fr" ? "fr" : "en";
  const baseUrl = locale === "fr" ? "https://deltalytix.app/fr" : "https://deltalytix.app";

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.content}>
            <Text style={styles.greeting}>
              {t.greeting} {firstName},
            </Text>
            <Heading as="h1" style={styles.title}>
              {t.title}
            </Heading>
            <Text style={styles.intro}>{t.intro}</Text>

            <Section style={styles.panel}>
              <Text style={styles.panelEyebrow}>{t.types[feedbackType]}</Text>
              <Text style={styles.quote}>{message}</Text>
            </Section>

            <Section style={{ marginTop: "40px" }}>
              <Heading as="h2" style={styles.sectionHeading}>
                {t.nextTitle}
              </Heading>
              <Text style={styles.sectionBody}>{t.nextBody}</Text>
              <Button href={`${baseUrl}/dashboard`} style={styles.button}>
                {t.cta} &rarr;
              </Button>
            </Section>

            <Text style={styles.signature}>
              {t.signature}
              <br />
              <span style={styles.role}>{t.role}</span>
            </Text>
          </Section>

          <Section style={styles.dividerWrap}>
            <Hr style={styles.divider} />
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerBrand}>{t.brand}</Text>
            <Text style={styles.footerText}>{t.reason}</Text>
            <Link href={`${baseUrl}/privacy`} style={styles.footerLink}>
              {t.privacy}
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

FeedbackAcknowledgementEmail.PreviewProps = {
  firstName: "Trader",
  language: "en" as Language,
  feedbackType: "bug" as FeedbackType,
  message:
    "The equity curve widget does not refresh after I import a new CSV. I have to reload the whole dashboard before the new trades show up.",
};
