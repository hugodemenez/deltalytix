import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type Language = "en" | "fr";

interface LandingPageUpdateEmailProps {
  firstName?: string;
  language?: Language;
  unsubscribeUrl: string;
  assetBaseUrl?: string;
}

const copy = {
  en: {
    preview: "A fresh new look for Deltalytix",
    eyebrow: "PRODUCT UPDATE",
    title: "The new Deltalytix landing page is here.",
    greeting: "Hello",
    intro:
      "We have redesigned the Deltalytix website to make the product clearer, faster to explore, and closer to the experience you already know inside the dashboard.",
    heroTitle: "A clearer first impression",
    heroBody:
      "The new homepage pairs bold editorial typography with a live product demo and a simpler path to features, pricing, and the latest updates.",
    chartsTitle: "Real dashboard previews",
    chartsBody:
      "The feature sections now include swipeable chart galleries inspired by the dashboard, including equity curves, daily P&L, trading distributions, and performance targets.",
    navigationTitle: "Everything is easier to find",
    navigationBody:
      "New Features and Updates menus take you directly to the right section, the changelog, or the Deltalytix YouTube channel.",
    cta: "Explore the new website",
    closing:
      "Take a look and let me know what you think. Your feedback continues to shape Deltalytix.",
    signature: "Hugo",
    role: "Founder of Deltalytix",
    sentBy: "Sent by Deltalytix",
    unsubscribe: "Unsubscribe",
  },
  fr: {
    preview: "Deltalytix fait peau neuve",
    eyebrow: "NOUVEAUTÉ",
    title: "La nouvelle page d’accueil Deltalytix est disponible.",
    greeting: "Bonjour",
    intro:
      "Nous avons repensé le site Deltalytix pour présenter le produit plus clairement, faciliter son exploration et mieux refléter l’expérience que vous connaissez déjà dans le dashboard.",
    heroTitle: "Une première impression plus claire",
    heroBody:
      "La nouvelle page associe une typographie éditoriale affirmée, une démonstration du produit et un accès simplifié aux fonctionnalités, aux tarifs et aux dernières nouveautés.",
    chartsTitle: "De vrais aperçus du dashboard",
    chartsBody:
      "Les sections fonctionnalités proposent maintenant des galeries de graphiques inspirées du dashboard : courbe d’équité, P&L quotidien, répartition des trades et objectifs de performance.",
    navigationTitle: "Tout est plus facile à trouver",
    navigationBody:
      "Les nouveaux menus Fonctionnalités et Nouveautés donnent un accès direct aux différentes sections, au changelog et à la chaîne YouTube Deltalytix.",
    cta: "Découvrir le nouveau site",
    closing:
      "Découvrez la nouvelle page et dites-moi ce que vous en pensez. Vos retours continuent de faire évoluer Deltalytix.",
    signature: "Hugo",
    role: "Fondateur de Deltalytix",
    sentBy: "Envoyé par Deltalytix",
    unsubscribe: "Se désabonner",
  },
} as const;

const styles = {
  body: {
    margin: "0",
    backgroundColor: "#f7f7f4",
    fontFamily: "Arial, Helvetica, sans-serif",
    color: "#1f211e",
  },
  container: {
    width: "100%",
    maxWidth: "640px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    borderLeft: "1px solid #e5e6e1",
    borderRight: "1px solid #e5e6e1",
  },
  content: {
    padding: "48px 44px",
  },
  eyebrow: {
    margin: "0 0 20px",
    color: "#667069",
    fontSize: "12px",
    lineHeight: "18px",
    letterSpacing: "0.14em",
    fontWeight: "700",
  },
  title: {
    margin: "0",
    maxWidth: "520px",
    color: "#1f211e",
    fontSize: "46px",
    lineHeight: "48px",
    letterSpacing: "-0.045em",
    fontWeight: "400",
  },
  paragraph: {
    margin: "20px 0 0",
    color: "#5d625c",
    fontSize: "17px",
    lineHeight: "28px",
  },
  featureHeading: {
    margin: "0 0 8px",
    color: "#1f211e",
    fontSize: "24px",
    lineHeight: "30px",
    letterSpacing: "-0.025em",
    fontWeight: "500",
  },
  featureText: {
    margin: "0",
    color: "#626760",
    fontSize: "15px",
    lineHeight: "24px",
  },
  screenshotFrame: {
    marginTop: "22px",
    padding: "10px",
    backgroundColor: "#dceee5",
    borderRadius: "12px",
  },
  screenshot: {
    display: "block",
    width: "100%",
    height: "auto",
    border: "1px solid #d8dad5",
    borderRadius: "6px",
  },
  divider: {
    margin: "40px 0",
    borderColor: "#e8e9e5",
  },
  ctaSection: {
    padding: "32px",
    backgroundColor: "#eef4ef",
    borderRadius: "12px",
    textAlign: "left" as const,
  },
  button: {
    display: "inline-block",
    marginTop: "24px",
    padding: "14px 22px",
    backgroundColor: "#242722",
    borderRadius: "4px",
    color: "#ffffff",
    fontSize: "14px",
    lineHeight: "20px",
    fontWeight: "600",
    textDecoration: "none",
  },
  footer: {
    padding: "28px 44px 36px",
    borderTop: "1px solid #e8e9e5",
  },
  footerText: {
    margin: "0",
    color: "#858981",
    fontSize: "12px",
    lineHeight: "20px",
  },
};

export default function LandingPageUpdateEmail({
  firstName = "trader",
  language = "en",
  unsubscribeUrl,
  assetBaseUrl = "https://deltalytix.app",
}: LandingPageUpdateEmailProps) {
  const t = copy[language] ?? copy.en;
  const locale = language === "fr" ? "fr" : "en";
  const landingUrl =
    locale === "fr" ? "https://deltalytix.app/fr" : "https://deltalytix.app";
  const imageBase = `${assetBaseUrl.replace(/\/$/, "")}/updates/pr-298/${locale}`;

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.content}>
            <Text style={styles.eyebrow}>{t.eyebrow}</Text>
            <Heading as="h1" style={styles.title}>
              {t.title}
            </Heading>
            <Text style={styles.paragraph}>
              {t.greeting} {firstName},
            </Text>
            <Text style={styles.paragraph}>{t.intro}</Text>

            <Hr style={styles.divider} />

            <Section>
              <Heading as="h2" style={styles.featureHeading}>
                {t.heroTitle}
              </Heading>
              <Text style={styles.featureText}>{t.heroBody}</Text>
              <Section style={styles.screenshotFrame}>
                <Img
                  src={`${imageBase}/landing-page-redesign.png`}
                  width="552"
                  alt={t.heroTitle}
                  style={styles.screenshot}
                />
              </Section>
            </Section>

            <Hr style={styles.divider} />

            <Section>
              <Heading as="h2" style={styles.featureHeading}>
                {t.chartsTitle}
              </Heading>
              <Text style={styles.featureText}>{t.chartsBody}</Text>
              <Section style={styles.screenshotFrame}>
                <Img
                  src={`${imageBase}/landing-performance-chart-carousel.png`}
                  width="552"
                  alt={t.chartsTitle}
                  style={styles.screenshot}
                />
              </Section>
            </Section>

            <Hr style={styles.divider} />

            <Section>
              <Heading as="h2" style={styles.featureHeading}>
                {t.navigationTitle}
              </Heading>
              <Text style={styles.featureText}>{t.navigationBody}</Text>
              <Section style={styles.screenshotFrame}>
                <Img
                  src={`${imageBase}/landing-navbar-features-and-updates.png`}
                  width="552"
                  alt={t.navigationTitle}
                  style={styles.screenshot}
                />
              </Section>
            </Section>

            <Hr style={styles.divider} />

            <Section style={styles.ctaSection}>
              <Text style={{ ...styles.featureText, color: "#3f453f" }}>
                {t.closing}
              </Text>
              <Button href={landingUrl} style={styles.button}>
                {t.cta} &rarr;
              </Button>
            </Section>

            <Text style={{ ...styles.paragraph, color: "#30342f" }}>
              {t.signature}
              <br />
              <span style={{ color: "#777c74", fontSize: "14px" }}>{t.role}</span>
            </Text>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              {t.sentBy}
              {" · "}
              <Link href={unsubscribeUrl} style={{ color: "#73776f", textDecoration: "underline" }}>
                {t.unsubscribe}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

LandingPageUpdateEmail.PreviewProps = {
  firstName: "Trader",
  language: "en" as Language,
  unsubscribeUrl:
    "https://deltalytix.app/api/email/unsubscribe?email=trader%40example.com",
};
