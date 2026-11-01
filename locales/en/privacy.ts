export default {
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: 1 November 2026",
    intro: {
      title: "1. Introduction",
      content:
        "Deltalytix (\"we\", \"our\", or \"us\") is committed to protecting your privacy. This Privacy Policy explains the categories of personal data we collect, why we use them, who receives them, how long we keep them, and the controls you have when you use our service, including the public API and Model Context Protocol (MCP) connectors.",
    },
    collect: {
      title: "2. Information We Collect",
      lead: "We collect only the data needed to provide the journal, analytics, billing, and connected-app features. Categories include:",
      account:
        "Account information: email address, name, language, and Discord profile picture URL if you sign in with Discord.",
      trades:
        "Trades you import or enter, including instruments, prices, dates, quantities, PnL, commissions, comments, tags, and screenshots you attach.",
      journal:
        "Journal and mindset entries you write, including mood notes and related journal content.",
      connections:
        "Broker connection metadata such as service, environment, last sync time, and linked account numbers. Broker passwords, API keys, and other secrets are stored only so we can sync your accounts and are never returned through the public API or MCP.",
      billing:
        "Subscription and billing records. Payments are processed by Stripe. We do not store full payment card numbers, government identifiers, or health information.",
      analytics:
        "Usage and measurement data, as described in Analytics and measurement.",
      tokens:
        "OAuth grants and personal access tokens you create so third-party apps can access your account.",
    },
    use: {
      title: "3. How We Use Your Information",
      lead: "We use the collected information for these purposes:",
      service: "Providing and maintaining our service, including your journal, accounts, and performance analytics",
      notify: "Notifying you about changes to our service",
      features: "Allowing you to participate in interactive features of our service",
      support: "Providing customer support",
      billing: "Processing subscriptions and sending transactional email",
      connectors:
        "Letting you connect authorized apps and MCP clients to your own data, limited to the scopes you grant",
      improve: "Gathering analysis or valuable information to improve our service",
      monitor: "Monitoring the usage of our service",
      security: "Detecting, preventing and addressing technical issues",
    },
    processors: {
      title: "4. Recipients and processors",
      lead: "We share personal data with the following service providers, each for a limited purpose:",
      supabase: "Supabase: authentication and database hosting.",
      stripe: "Stripe: payment processing and subscription billing.",
      posthog:
        "PostHog: product analytics and measurement, hosted in the European Union. Requests go through deltalytix.app.",
      resend:
        "Resend: transactional email such as welcome messages, weekly recaps, and support replies.",
      authorizedApps:
        "When you authorize a third-party app, that app receives only the data covered by the scopes you grant. Those apps include ChatGPT plugins and apps, Claude connectors, Cursor, Grok, and any other OAuth, API, or MCP client you connect.",
      noSale:
        "We do not sell your personal data. We do not share it with third parties except the processors named here, the apps you authorize, or when the law requires it.",
    },
    storage: {
      title: "5. Data Storage and Security",
      content:
        "We use Supabase, a SOC 2 compliant service, to store your data. We implement appropriate data collection, storage and processing practices and security measures to protect against unauthorized access, alteration, disclosure or destruction of your personal information and data stored on our service.",
    },
    retention: {
      title: "6. Data retention",
      content:
        "Trades and journal data stay while your account exists. When you delete your account from Settings, we delete your trades, journal data, connections, and account information. We also cancel active Stripe subscriptions and delete the Stripe customer record tied to your email. Analytics retention and opt-out are described in Analytics and measurement.",
    },
    connectors: {
      title: "7. Connected apps, API, and MCP",
      lead: "You can connect third-party clients that use the Deltalytix public API or the MCP server at https://www.deltalytix.app/api/mcp. That includes ChatGPT plugins and apps, Claude connectors, Cursor, Grok, and any other OAuth or personal-token client. We do not receive your conversations with those clients. We only receive the authenticated API or MCP requests they make on your behalf.",
      scopes:
        "Access is limited to the OAuth or personal-token scopes you grant, such as profile:read, accounts:read, trades:read, metrics:read, and connections:read. The public API also accepts write scopes (trades:write, connections:write, imports:write) only if you grant them.",
      toolsLead:
        "MCP tools are read-only. They call the same server functions as the matching GET /api/v1 routes and never accept a user id:",
      toolProfile: "get_profile — profile:read",
      toolAccounts: "list_accounts — accounts:read",
      toolTrades: "list_trades — trades:read",
      toolMetrics: "get_metrics_summary — metrics:read",
      toolAccountMetrics: "get_account_metrics — metrics:read",
      toolEquity: "get_equity_curve — metrics:read",
      toolDailyPnl: "get_daily_pnl — metrics:read",
      toolConnections: "list_connections — connections:read",
      access:
        "Tools and API requests only access the signed-in user's data. There is no cross-user access. A token cannot read another account.",
      secrets:
        "Broker tokens and secrets are never returned by the API or by list_connections.",
      revoke:
        "You can revoke connected apps and personal access tokens at any time in Settings → Connections. A revoked token is rejected on the next request.",
    },
    cookies: {
      title: "8. Cookies",
      content:
        "We use \"cookies\" to collect information. Cookies are small data files stored on your hard drive by a website. We may use both session cookies (which expire once you close your web browser) and persistent cookies (which stay on your computer until you delete them) to provide you with a more personal and interactive experience on our Site. Necessary cookies keep you signed in and protect the service. Optional product-use and ads cookies are described in Analytics and measurement.",
    },
    analytics: {
      title: "9. Analytics and measurement",
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
      title: "10. Third-Party Services",
      content:
        "Besides the processors named above (Supabase, Stripe, PostHog, and Resend), our service may contain links to other sites that are not operated by us. We strongly advise you to review the Privacy Policy of every site you visit.",
    },
    rights: {
      title: "11. Your rights and controls",
      lead: "You can access, update, and delete your personal information, and you can control analytics and connected apps:",
      access:
        "Access and update your account, trades, and journal in the dashboard. You can also email us for a copy of your data.",
      delete:
        "Delete your account in Settings. That permanently removes your trades, journal data, connections, and billing.",
      analytics:
        "Opt out of analytics with the link on this page or in the footer. In Settings you can also change cookie consent.",
      revoke:
        "Revoke connected apps and personal access tokens in Settings → Connections.",
      gdpr:
        "We comply with the General Data Protection Regulation (GDPR). To exercise these rights, contact us at the address below.",
    },
    changes: {
      title: "12. Changes to This Privacy Policy",
      content:
        "We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the \"Last updated\" date.",
    },
    contact: {
      title: "13. Contact Us",
      content:
        "If you have any questions about this Privacy Policy, please contact us at:",
      email: "privacy@deltalytix.app",
    },
  },
} as const;
