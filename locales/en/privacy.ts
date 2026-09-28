export default {
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: 26 September 2026",
    intro: {
      title: "1. Introduction",
      content:
        "Deltalytix (\"we\", \"our\", or \"us\") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.",
    },
    collect: {
      title: "2. Information We Collect",
      lead: "We collect information when you create an account, including:",
      email: "Email address",
      name: "Name",
      discord:
        "Discord profile picture URL (if you sign up using Discord OAuth)",
      trades:
        "We also collect and store trades data that you provide to us for analysis purposes.",
    },
    use: {
      title: "3. How We Use Your Information",
      lead: "We use the collected information for various purposes, including:",
      service: "Providing and maintaining our service",
      notify: "Notifying you about changes to our service",
      features: "Allowing you to participate in interactive features of our service",
      support: "Providing customer support",
      improve: "Gathering analysis or valuable information to improve our service",
      monitor: "Monitoring the usage of our service",
      security: "Detecting, preventing and addressing technical issues",
    },
    storage: {
      title: "4. Data Storage and Security",
      content:
        "We use Supabase, a SOC 2 compliant service, to store your data. We implement appropriate data collection, storage and processing practices and security measures to protect against unauthorized access, alteration, disclosure or destruction of your personal information and data stored on our service.",
    },
    cookies: {
      title: "5. Cookies",
      content:
        "We use \"cookies\" to collect information. Cookies are small data files stored on your hard drive by a website. We may use both session cookies (which expire once you close your web browser) and persistent cookies (which stay on your computer until you delete them) to provide you with a more personal and interactive experience on our Site. Necessary cookies keep you signed in and protect the service. Optional product-use and ads cookies are described in Analytics and measurement.",
    },
    analytics: {
      title: "6. Analytics and measurement",
      provider:
        "We use PostHog, hosted in the European Union, to understand how the site is used and whether checkout works. Requests go through deltalytix.app so your browser talks to us, not directly to PostHog.",
      beforeConsent:
        "If you visit from the EEA, the United Kingdom or Switzerland — or we cannot tell your country — we show a consent banner. Until you accept, we only collect anonymous, cookieless measurement: page views and funnel counts with no cookies, no localStorage, no stored identifier, and no session replay.",
      afterConsent:
        "If you accept product use, we may use cookies to recognise your account and record a session replay. Form inputs and card fields stay masked in every replay.",
      otherRegions:
        "If you visit from elsewhere (for example the United States), we measure use by default. You can opt out at any time with the “Opt out of analytics” link in the footer or on this page. We remember that choice in a cookie.",
      conversions:
        "Account creation, checkout start and a completed subscription are recorded on our servers with a pseudonymous user id so a sale is not lost if a browser blocks scripts. For visitors in the EEA, the United Kingdom or Switzerland we do not attach your email to those events.",
      optOut: "Opt out of analytics",
      optedOut: "Analytics opted out",
    },
    thirdParty: {
      title: "7. Third-Party Services",
      content:
        "Besides PostHog (analytics) and the processors named in this policy (Supabase, Stripe), our service may contain links to other sites that are not operated by us. We strongly advise you to review the Privacy Policy of every site you visit.",
    },
    gdpr: {
      title: "8. GDPR Compliance",
      content:
        "We comply with the General Data Protection Regulation (GDPR). You have the right to access, update or delete your personal information. Please contact us to exercise these rights.",
    },
    changes: {
      title: "9. Changes to This Privacy Policy",
      content:
        "We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the \"Last updated\" date.",
    },
    contact: {
      title: "10. Contact Us",
      content:
        "If you have any questions about this Privacy Policy, please contact us at:",
    },
  },
} as const;
