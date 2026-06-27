import shared from "./en/shared";
import landing from "./en/landing";
import pricing from "./en/pricing";
import faq from "./en/faq";
import terms from "./en/terms";
import referral from "./en/referral";
import featurePreview from "./en/feature-preview";
import support from "./en/support";

export default {
  ...shared,
  ...landing,
  ...pricing,
  ...faq,
  ...terms,
  ...referral,
  ...featurePreview,
  ...support,
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
} as const;
