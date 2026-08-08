import * as React from "react";
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { buildAppUnsubscribeUrl } from "@/lib/unsubscribe-token";

export interface WelcomeEmailProps {
  firstName?: string;
  email?: string;
  language: string;
  youtubeId?: string;
}

type WelcomeLocale = "en" | "fr";

export const WELCOME_VIDEO_IDS = {
  en: "ZBrIZpCh_7Q",
  fr: "_-VtBaOGctY",
} as const;

const copy = {
  en: {
    preview: "Welcome to Deltalytix — start building a clearer trading journal",
    greeting: "Hello",
    eyebrow: "WELCOME TO DELTALYTIX",
    title: "Your trading journal starts here.",
    intro:
      "Deltalytix helps you track your trades, understand your performance, and make every review more useful.",
    startTitle: "A simple place to begin",
    startBody:
      "Open your dashboard, import your first trades, and let your data reveal the habits behind your results.",
    dashboardCta: "Open my dashboard",
    videoLabel: "GET TO KNOW DELTALYTIX",
    videoTitle: "See the platform in action",
    videoBody:
      "Watch the walkthrough for a quick look at the tools and workflows available to you.",
    videoAlt: "Preview of the Deltalytix product walkthrough",
    videoCta: "Watch the video",
    help:
      "Need a hand getting started? Reply to this email. I read every message and I’ll be happy to help.",
    signoff: "Happy trading,",
    signature: "Hugo",
    role: "Founder of Deltalytix",
    reason: "You’re receiving this email because you created a Deltalytix account.",
    unsubscribe: "Unsubscribe",
    privacy: "Privacy policy",
  },
  fr: {
    preview: "Bienvenue sur Deltalytix — commencez un journal de trading plus clair",
    greeting: "Bonjour",
    eyebrow: "BIENVENUE SUR DELTALYTIX",
    title: "Votre journal de trading commence ici.",
    intro:
      "Deltalytix vous aide à suivre vos trades, comprendre vos performances et tirer davantage de chaque revue.",
    startTitle: "Un point de départ simple",
    startBody:
      "Ouvrez votre dashboard, importez vos premiers trades et laissez vos données révéler les habitudes derrière vos résultats.",
    dashboardCta: "Ouvrir mon dashboard",
    videoLabel: "LES DERNIÈRES NOUVEAUTÉS",
    videoTitle: "Découvrez la dernière nouveauté",
    videoBody:
      "Regardez la dernière vidéo publiée pour découvrir les nouveautés et améliorations disponibles dans Deltalytix.",
    videoAlt: "Aperçu de la dernière vidéo Deltalytix",
    videoCta: "Voir la dernière vidéo",
    help:
      "Besoin d’un coup de main pour démarrer ? Répondez à cet email. Je lis chaque message et serai ravi de vous aider.",
    signoff: "Bon trading,",
    signature: "Hugo",
    role: "Fondateur de Deltalytix",
    reason: "Vous recevez cet email car vous avez créé un compte Deltalytix.",
    unsubscribe: "Se désabonner",
    privacy: "Politique de confidentialité",
  },
} as const;

const emailCss = `
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  .hero-title { font-size: clamp(34px, 11vw, 42px) !important; }
  .responsive-image { width: 100% !important; height: auto !important; }
  @media only screen and (max-width: 600px) {
    .email-body { padding: 8px !important; }
    .email-content { padding-left: 12px !important; padding-right: 12px !important; }
    .mobile-surface { padding-left: 18px !important; padding-right: 18px !important; }
    .hero-title { line-height: 39px !important; }
  }
  @media (prefers-color-scheme: dark) {
    .dm-bg { background-color: #111411 !important; }
    .email-body > table, .email-body > table > tbody > tr > td { background-color: #111411 !important; }
    .dm-heading { color: #f3f6f2 !important; }
    .dm-text { color: #b8c1b8 !important; }
    .dm-label { color: #8ab89a !important; }
    .dm-surface-green { background-color: #19231b !important; }
    .dm-surface-neutral { background-color: #1b1f1b !important; }
    .dm-border { border-color: #343b34 !important; }
    .dm-button { background-color: #edf2ec !important; }
    .dm-button-link { color: #151915 !important; }
    .dm-image { border-color: #394139 !important; }
  }
  [data-ogsc] .dm-bg { background-color: #111411 !important; }
  [data-ogsc] .email-body > table, [data-ogsc] .email-body > table > tbody > tr > td { background-color: #111411 !important; }
  [data-ogsc] .dm-heading { color: #f3f6f2 !important; }
  [data-ogsc] .dm-text { color: #b8c1b8 !important; }
  [data-ogsc] .dm-label { color: #8ab89a !important; }
  [data-ogsc] .dm-surface-green { background-color: #19231b !important; }
  [data-ogsc] .dm-surface-neutral { background-color: #1b1f1b !important; }
  [data-ogsc] .dm-border { border-color: #343b34 !important; }
  [data-ogsc] .dm-button { background-color: #edf2ec !important; }
  [data-ogsc] .dm-button-link { color: #151915 !important; }
  [data-ogsc] .dm-image { border-color: #394139 !important; }
`;

const styles: Record<string, React.CSSProperties> = {
  body: {
    margin: 0,
    padding: "8px",
    backgroundColor: "#ffffff",
    color: "#1e231e",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  container: {
    width: "100%",
    maxWidth: "680px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
  },
  content: {
    padding: "44px 12px 0",
  },
  greeting: {
    margin: "0 0 18px",
    color: "#1e231e",
    fontSize: "15px",
    fontWeight: 500,
    lineHeight: "22px",
  },
  eyebrow: {
    margin: "0 0 12px",
    color: "#3e7550",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    lineHeight: "16px",
  },
  title: {
    margin: 0,
    color: "#1e231e",
    fontSize: "36px",
    fontWeight: 400,
    letterSpacing: "-0.04em",
    lineHeight: "45px",
  },
  intro: {
    margin: "12px 0 0",
    color: "#5f665f",
    fontSize: "17px",
    lineHeight: "28px",
  },
  hero: {
    padding: "0 0 30px",
  },
  startPanel: {
    padding: "28px 24px",
    backgroundColor: "#edf4ee",
    borderRadius: "14px",
  },
  sectionHeading: {
    margin: 0,
    color: "#1e231e",
    fontSize: "26px",
    fontWeight: 500,
    letterSpacing: "-0.025em",
    lineHeight: "32px",
  },
  bodyText: {
    margin: "10px 0 0",
    color: "#5f665f",
    fontSize: "15px",
    lineHeight: "23px",
  },
  primaryButton: {
    display: "inline-block",
    marginTop: "20px",
    padding: "13px 18px",
    backgroundColor: "#222722",
    borderRadius: "5px",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: "20px",
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  divider: {
    margin: "0",
    borderColor: "#dfe3de",
  },
  videoIntro: {
    padding: "32px 0 20px",
  },
  videoFrame: {
    padding: "10px",
    backgroundColor: "#f1f2ef",
    border: "1px solid #dfe3de",
    borderRadius: "12px",
  },
  videoImageLink: {
    display: "block",
    lineHeight: 0,
    textDecoration: "none",
  },
  videoImage: {
    display: "block",
    width: "100%",
    height: "auto",
    borderTopLeftRadius: "6px",
    borderTopRightRadius: "6px",
  },
  videoAction: {
    boxSizing: "border-box",
    width: "100%",
    padding: "16px",
    backgroundColor: "#222722",
    borderBottomLeftRadius: "6px",
    borderBottomRightRadius: "6px",
  },
  videoActionLink: {
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: "20px",
    textDecoration: "none",
  },
  videoActionArrow: {
    width: "24px",
    color: "#ffffff",
    fontSize: "16px",
    lineHeight: "20px",
    textAlign: "right",
    textDecoration: "none",
  },
  support: {
    padding: "30px 0 34px",
  },
  help: {
    margin: 0,
    color: "#5f665f",
    fontSize: "15px",
    lineHeight: "23px",
  },
  signature: {
    margin: "24px 0 0",
    color: "#1e231e",
    fontSize: "15px",
    lineHeight: "22px",
  },
  role: {
    color: "#5f665f",
    fontSize: "13px",
    lineHeight: "20px",
  },
  footer: {
    padding: "24px 36px 36px",
    borderTop: "1px solid #dfe3de",
  },
  footerBrand: {
    margin: 0,
    color: "#1e231e",
    fontSize: "13px",
    fontWeight: 700,
    lineHeight: "19px",
  },
  footerText: {
    margin: "7px 0 0",
    color: "#747b74",
    fontSize: "12px",
    lineHeight: "18px",
  },
  footerLinks: {
    margin: "7px 0 0",
    color: "#5f665f",
    fontSize: "12px",
    lineHeight: "18px",
  },
  footerLink: {
    color: "#5f665f",
    textDecoration: "underline",
  },
};

function getWelcomeEmailData({
  email,
  language,
  youtubeId,
}: Pick<WelcomeEmailProps, "email" | "language" | "youtubeId">) {
  const locale: WelcomeLocale = language === "fr" ? "fr" : "en";
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const dashboardUrl = `${baseUrl}/${locale}/dashboard?utm_source=welcome_email&utm_medium=email&utm_campaign=welcome`;
  const privacyUrl = `${baseUrl}/${locale}/privacy`;
  const resolvedYoutubeId = youtubeId || WELCOME_VIDEO_IDS[locale];
  const videoUrl = `https://youtu.be/${resolvedYoutubeId}`;
  const thumbnailUrl = `${baseUrl}/api/email/thumbnail/${resolvedYoutubeId}/maxresdefault`;
  const unsubscribeUrl = email
    ? buildAppUnsubscribeUrl(email)
    : `${baseUrl}/${locale}/profile`;

  return {
    locale,
    t: copy[locale],
    dashboardUrl,
    privacyUrl,
    videoUrl,
    thumbnailUrl,
    unsubscribeUrl,
  };
}

export function renderWelcomeEmailText({
  firstName = "Trader",
  email,
  language,
  youtubeId,
}: WelcomeEmailProps) {
  const { t, dashboardUrl, privacyUrl, videoUrl, unsubscribeUrl } = getWelcomeEmailData({
    email,
    language,
    youtubeId,
  });

  return [
    `${t.greeting} ${firstName},`,
    "",
    t.title,
    t.intro,
    "",
    t.startTitle,
    t.startBody,
    `${t.dashboardCta}: ${dashboardUrl}`,
    "",
    t.videoTitle,
    t.videoBody,
    `${t.videoCta}: ${videoUrl}`,
    "",
    t.help,
    "",
    t.signoff,
    t.signature,
    t.role,
    "",
    t.reason,
    `${t.unsubscribe}: ${unsubscribeUrl}`,
    `${t.privacy}: ${privacyUrl}`,
  ].join("\n");
}

export default function WelcomeEmail({
  firstName = "Trader",
  email,
  language,
  youtubeId,
}: WelcomeEmailProps) {
  const { locale, t, dashboardUrl, privacyUrl, videoUrl, thumbnailUrl, unsubscribeUrl } =
    getWelcomeEmailData({ email, language, youtubeId });

  return (
    <Html lang={locale}>
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{emailCss}</style>
      </Head>
      <Preview>{t.preview}</Preview>
      <Body className="dm-bg email-body" style={styles.body}>
        <Container className="dm-bg" style={styles.container}>
          <Section className="dm-bg email-content" style={styles.content}>
            <Section style={styles.hero}>
              <Text className="dm-heading" style={styles.greeting}>
                {t.greeting} {firstName},
              </Text>
              <Text className="dm-label" style={styles.eyebrow}>
                {t.eyebrow}
              </Text>
              <Heading as="h1" className="dm-heading hero-title" style={styles.title}>
                {t.title}
              </Heading>
              <Text className="dm-text" style={styles.intro}>
                {t.intro}
              </Text>
            </Section>

            <Section className="dm-surface-green mobile-surface" style={styles.startPanel}>
              <Heading as="h2" className="dm-heading" style={styles.sectionHeading}>
                {t.startTitle}
              </Heading>
              <Text className="dm-text" style={styles.bodyText}>
                {t.startBody}
              </Text>
              <Button
                href={dashboardUrl}
                className="dm-button dm-button-link"
                style={styles.primaryButton}
              >
                {t.dashboardCta} &rarr;
              </Button>
            </Section>

            <Section className="dm-border" style={styles.videoIntro}>
              <Hr className="dm-border" style={styles.divider} />
              <Text className="dm-label" style={{ ...styles.eyebrow, marginTop: "32px" }}>
                {t.videoLabel}
              </Text>
              <Heading as="h2" className="dm-heading" style={styles.sectionHeading}>
                {t.videoTitle}
              </Heading>
              <Text className="dm-text" style={styles.bodyText}>
                {t.videoBody}
              </Text>
            </Section>

            <Section
              className="dm-surface-neutral dm-image dm-border"
              style={styles.videoFrame}
            >
              <Link href={videoUrl} style={styles.videoImageLink}>
                <Img
                  className="responsive-image"
                  src={thumbnailUrl}
                  width="636"
                  height="358"
                  alt={t.videoAlt}
                  style={styles.videoImage}
                />
              </Link>
              <Section style={styles.videoAction}>
                <Row>
                  <Column>
                    <Link href={videoUrl} style={styles.videoActionLink}>
                      &#9654;&nbsp;&nbsp;{t.videoCta}
                    </Link>
                  </Column>
                  <Column align="right" style={{ width: "24px" }}>
                    <Link href={videoUrl} style={styles.videoActionArrow}>
                      &rarr;
                    </Link>
                  </Column>
                </Row>
              </Section>
            </Section>

            <Section className="dm-border" style={styles.support}>
              <Hr className="dm-border" style={styles.divider} />
              <Text className="dm-text" style={{ ...styles.help, marginTop: "30px" }}>
                {t.help}
              </Text>
              <Text className="dm-heading" style={styles.signature}>
                {t.signoff}
                <br />
                <strong>{t.signature}</strong>
                <br />
                <span className="dm-text" style={styles.role}>
                  {t.role}
                </span>
              </Text>
            </Section>
          </Section>

          <Section className="dm-bg dm-border" style={styles.footer}>
            <Text className="dm-heading" style={styles.footerBrand}>
              Deltalytix
            </Text>
            <Text className="dm-text" style={styles.footerText}>
              {t.reason}
            </Text>
            <Text className="dm-text" style={styles.footerLinks}>
              <Link className="dm-text" href={unsubscribeUrl} style={styles.footerLink}>
                {t.unsubscribe}
              </Link>
              {"  ·  "}
              <Link className="dm-text" href={privacyUrl} style={styles.footerLink}>
                {t.privacy}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

WelcomeEmail.PreviewProps = {
  firstName: "Trader",
  email: "trader@example.com",
  language: "en",
  youtubeId: WELCOME_VIDEO_IDS.en,
};
