export default {
    terms: {
        title: "Terms of Service",
        sections: {
            companyInfo: {
                title: "1. Company Information",
                content: "Deltalytix is owned and operated by Hugo DEMENEZ, operating as a sole proprietorship.",
                contact: "Contact: "
            },
            services: {
                title: "2. Services",
                content: "Deltalytix provides access to a platform dashboard offering advanced analytics services for modern traders. We host trades data through Supabase, a SOC 2 compliant service."
            },
            userAccounts: {
                title: "3. User Accounts and Data",
                content: "Users can create an account through Discord OAuth or email. We collect and store information including Discord profile picture URL, email address, and name in our Supabase database. We use a cookie to persist user connections."
            },
            subscriptionPayments: {
                title: "4. Subscription and Payments",
                content: "We offer paid plans on a monthly, quarterly, yearly, and lifetime basis. Payment is processed through Stripe. Refunds are generally not provided after the subscription period, but may be considered on a case-by-case basis. Any refunds may be subject to processing fees charged by our payment service provider.",
                storageClarification: "The unlimited storage provided in the lifetime plan covers texts, images, and standard documents related to trades. Recording or storing video files is not supported.",
                fairUse: "The term \"unlimited\" is understood within the framework of normal and non-abusive use of the service. We reserve the right to limit or restrict usage in case of excessive use or use contrary to the platform's purpose.",
                lifetimePlan: {
                    title: "Lifetime Plan Terms",
                    description: "The \"Lifetime\" plan provides access to the Deltalytix service for the operational lifetime of the service, subject to the following conditions:",
                    condition1: "The lifetime plan guarantees access for a minimum period of one (1) year from the date of purchase.",
                    condition2: "\"Lifetime\" refers to the operational lifetime of the Deltalytix service, not the lifetime of the user.",
                    condition3: "We reserve the right to discontinue the service with 90 days written notice to lifetime plan holders.",
                    condition4: "In the event of service discontinuation before the one-year minimum period, lifetime plan holders will receive a pro-rated refund for the remaining guaranteed period.",
                    condition5: "The lifetime plan does not guarantee specific features, updates, or support levels beyond what is offered to active subscribers at the time of discontinuation.",
                    condition6: "Lifetime plan access may be terminated for violations of these Terms of Service, just like any other subscription."
                }
            },
            intellectualProperty: {
                title: "5. Intellectual Property",
                content: "Deltalytix owns all intellectual property rights related to our service. Users are not permitted to copy or reproduce our service. Our code is licensed under the terms specified in our LICENSE file, which is the GNU Affero General Public License version 3."
            },
            dataProtection: {
                title: "6. Data Protection and Privacy",
                content: "We comply with the General Data Protection Regulation (GDPR) and other applicable data protection laws. We protect user data by using Supabase, which is SOC 2 compliant, and by anonymizing data in our database. We do not use third-party analytics services. For more information, please see our Privacy Policy.",
                dataExport: "Users can, at any time, request a copy of their data in a readable format (CSV, JSON)."
            },
            liability: {
                title: "7. Limitation of Liability",
                content: "To the fullest extent permitted by applicable law, Deltalytix shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from (a) your use or inability to use the service; (b) any unauthorized access to or use of our servers and/or any personal information stored therein."
            },
            termination: {
                title: "8. Termination",
                content: "We reserve the right to suspend or terminate your access to the service at any time for any reason, including but not limited to a violation of these Terms. You may terminate your account at any time directly from the service interface or by contacting us. This termination will take effect immediately or at the end of your subscription period."
            },
            serviceAvailability: {
                title: "9. Service Availability and Continuity",
                description: "While we strive to maintain continuous service operation, we cannot guarantee perpetual availability. We reserve the right to:",
                condition1: "Modify, suspend, or discontinue any part of the service with appropriate notice.",
                condition2: "Perform maintenance that may temporarily interrupt service availability.",
                condition3: "Cease operations due to business, technical, or legal reasons beyond our reasonable control.",
                notice: "Users will be notified of any planned service interruptions or discontinuation as far in advance as reasonably possible."
            },
            governingLaw: {
                title: "10. Governing Law",
                content: "These Terms of Service are governed by the laws of France. Any disputes shall be subject to the exclusive jurisdiction of the courts of France."
            },
            changesTerms: {
                title: "11. Changes to Terms",
                content: "We reserve the right to modify these Terms of Service at any time. We will notify users of any significant changes."
            }
        },
        lastUpdated: "Last updated: ",
        pricing: {
            disclaimer: "By proceeding with payment, you agree to our ",
            freePlanDisclaimer: "By creating your account, you agree to our ",
            termsOfService: "Terms of Service"
        }
    }
} as const;
