import shared from "./en/shared";
import landing from "./en/landing";
import pricing from "./en/pricing";
import faq from "./en/faq";
import terms from "./en/terms";
import referral from "./en/referral";
import featurePreview from "./en/feature-preview";

export default {
  ...shared,
  ...landing,
  ...pricing,
  ...faq,
  ...terms,
  ...referral,
  ...featurePreview,
  "footer.heading": "Footer",
  "footer.description": "Advanced analytics for modern traders.",
  "footer.product.title": "Product",
  "footer.product.features": "Features",
  "footer.product.pricing": "Pricing",
  "footer.product.propfirms": "Prop Firms Catalogue",
  "footer.product.teams": "Teams",
  "footer.product.support": "Support",
  "footer.company.title": "Company",
  "footer.company.about": "About",
  "footer.legal.title": "Legal",
  "footer.legal.privacy": "Privacy Policy",
  "footer.legal.terms": "Terms of Service",
  "footer.legal.disclaimers": "Disclaimers",
  "footer.copyright": "© {year} Deltalytix. All rights reserved.",
  "disclaimer.risk.title": "Risk Warning",
  "disclaimer.risk.content":
    "Trading in futures and forex markets involves significant risks and is not suitable for all investors. An investor could potentially lose all or a portion of their initial investment. Risk capital is money that can be lost without jeopardizing one's financial security or lifestyle. Only risk capital should be used for trading, and only those with sufficient risk capital should consider trading. Past performance is not necessarily indicative of future results.",
  "disclaimer.hypothetical.title": "Hypothetical Performance Warning",
  "disclaimer.hypothetical.content":
    "Hypothetical performance results have many inherent limitations, some of which are described below. No representation is being made that any account will or is likely to achieve profits or losses similar to those shown; in fact, there are frequently sharp differences between hypothetical performance results and the actual results subsequently achieved by any particular trading program. One of the limitations of hypothetical performance results is that they are generally prepared with the benefit of hindsight. In addition, hypothetical trading does not involve financial risk, and no hypothetical trading record can completely account for the impact of financial risk in actual trading. For example, the ability to withstand losses or to adhere to a particular trading program in spite of trading losses are material points which can also adversely affect actual trading results. There are numerous other factors related to the markets in general or to the implementation of any specific trading program which cannot be fully accounted for in the preparation of hypothetical performance results and all of which can adversely affect actual trading results.",
  success: "Success",
  error: "Error",
  common: {
    copy: "Copy",
    retry: "Retry",
  },
  "support.title": "Support Assistant",
  "support.generating": "Generating response…",
  "support.suggestions.import": "Help with importing trades",
  "support.suggestions.billing": "Billing or subscription question",
  "support.suggestions.bug": "Report a bug or issue",
  "support.suggestions.human": "Talk to a human",
  support: {
    greeting:
      "Welcome to the Deltalytix Support Assistant! I'm here to help you gather all the necessary details about your issue or question. My goal is to collect the right context so your message can be efficiently forwarded to our customer support team, who will follow up with you by email.",
    inputPlaceholder: "Describe your issue or question here...",
    search: "Search",
    retry: "Retry",
    copied: "Copied to clipboard",
    description:
      "Let us know what problem you’re experiencing or what you need help with in your trading journal. I’ll help collect the information needed for our support team.",
    requestHumanSupport: "Request Human Support",
    contactInformation: "Contact Information",
    contactInformationDescription:
      "Please provide your contact details so our support team can reach you by email.",
    emailSent:
      "Your message has been sent to our support team. They will contact you soon via email.",
    emailError:
      "There was a problem sending your request. Please try again later.",
    emailConfirmation:
      "Thank you, {name}. I've gathered your information and sent your support request to our team. They will review your case and reach out to you at {email} as soon as possible. Is there anything else I can assist you with?",
    form: {
      name: "Name",
      email: "Email",
      additionalInfo: "Additional Information",
      additionalInfoPlaceholder:
        "Add any extra details that might help our support team understand your issue...",
      submit: "Submit",
      cancel: "Cancel",
      summary: "Summary",
      sending: "Sending...",
    },
    evaluatingSupport:
      "Reviewing your message to determine the best way to help...",
    evaluationError: "There was an error while evaluating your support needs.",
    preparingEmail: "Preparing your support request for our team...",
    emailPreparationError: "There was an error preparing your support request.",
    joinDiscord: "Join Discord Community",
    discordDescription:
      "Get instant help from our community of traders and developers.",
    title: "Support Assistant",
    generating: "Generating response…",
    suggestions: {
      import: "Help with importing trades",
      billing: "Billing or subscription question",
      bug: "Report a bug or issue",
      human: "Talk to a human",
    },
    tool: {
      preparingRequest: "Preparing your support request for our team...",
      requestError: "There was an error while preparing your support request.",
      requestErrorDetails: "Error details: {error}",
    },
    errors: {
      rateLimit:
        "We're experiencing high demand right now. Please try again in a few minutes or contact support directly.",
      serviceUnavailable:
        "Our AI support service is temporarily unavailable. Please try again later or contact support directly.",
      internalError:
        "An unexpected error occurred. Please try again later or contact support.",
      generic:
        "Sorry, something went wrong. Please try again or contact support if the issue persists.",
    },
  },
} as const;
