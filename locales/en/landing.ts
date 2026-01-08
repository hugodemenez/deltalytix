export default {
    landing: {
        title: 'Master your trading journey.',
        description: 'Deltalytix is a trading dashboard for futures traders to store, explore and understand their track-record.',
        cta: 'Get Started',
        updates: 'Latest Product Updates →',
        partners: {
            title: 'Our Partners',
            description: 'We collaborate with industry leaders to provide you with the best trading experience.',
        },
        features: {
            heading: 'Features',
            subheading: 'The right tools to help you improve your trading.',
            'data-import': {
                title: 'Data Import',
                description: 'Import data from various providers. Our platform supports automatic imports with Rithmic via a sync or .CSV imports, allowing you to centralize all your trading information in one place.',
                stat: 'Sync & CSV imports',
            },
            'performance-visualization': {
                title: 'Performance Visualization',
                description: 'Visualize your trading performance with interactive charts and graphs. Analyze patterns, identify strengths, and pinpoint areas for improvement.',
                stat: 'Comprehensive Analytics',
            },
            'daily-performance': {
                title: 'Daily Performance',
                description: 'Track your daily trading results with an intuitive calendar view. Quickly identify trends and patterns in your trading performance.',
                stat: 'Calendar View',
            },
            'ai-journaling': {
                title: 'AI-Powered Journaling',
                description: 'Improve your trading emotions with AI-assisted journaling. Our advanced algorithms analyze your entries to identify emotional patterns and biases.',
                stat: 'Emotional Intelligence',
            },
            'chat-feature': {
                title: 'AI Trading Coach',
                description: 'Get personalized trading insights and analysis from our AI coach. Understand your trading patterns, identify strengths and weaknesses, and receive actionable recommendations.',
                stat: 'Real-time Analysis',
                conversation: {
                    analyze: 'Analyze my trading performance from last month and identify the key factors affecting my P&L',
                    patterns: 'What psychological patterns do you see in my losing trades? Are there specific market conditions where I consistently struggle?',
                    riskManagement: 'How can I improve my risk management? My max drawdown seems too high for my account size',
                    profitableSetup: 'What\'s my most profitable setup and what market conditions make it work best?',
                    journalInsights: 'Based on my trading journal entries, what emotional states correlate with my best and worst trading days?',
                    marketTiming: 'Analyze my entry and exit timing - am I getting in too early or too late relative to key levels?',
                    positionSizing: 'Is my position sizing optimal for my win rate and risk-reward ratios across different setups?'
                },
                responses: {
                    analyze: 'I\'ve analyzed your 127 trades from last month. Your overall performance shows strong technical execution but significant emotional interference during drawdown periods.',
                    patterns: 'Your journal entries reveal a clear pattern: after 2+ consecutive losses, you increase position size by 40% and abandon your setup criteria. This revenge trading accounts for 73% of your largest losses.',
                    riskManagement: 'Your maximum drawdown of 12% exceeds optimal levels for your account size. I recommend implementing position size reduction after losses and using the 2% rule consistently.',
                    profitableSetup: 'Your morning breakout strategy shows exceptional results with 82% win rate during 9:30-10:30 EST when combined with volume confirmation above 1.5x average.',
                    journalInsights: 'Strong correlation between sleep quality and performance - your Tuesday-Wednesday trades show 23% higher P&L when you mention "well-rested" in journal entries.',
                    marketTiming: 'Analysis shows you\'re entering 15-30 minutes too early on breakouts. Waiting for confirmation would improve your win rate from 68% to estimated 78%.',
                    positionSizing: 'Your current sizing is 87% of Kelly optimal. Consider increasing size on your highest probability setups while maintaining conservative approach on experimental trades.'
                },
                analysis: {
                    winRate: {
                        metric: 'Overall Win Rate',
                        value: '68%',
                        trend: 'positive',
                        insight: 'Above average but concentration risk in breakout trades (45% of volume) needs diversification'
                    },
                    revengeTrading: {
                        metric: 'Revenge Trading Impact',
                        value: '73% loss rate',
                        trend: 'negative',
                        insight: 'Major profit leak: revenge trades after 2+ losses show 73% loss rate vs 32% normal rate'
                    },
                    fomo: {
                        metric: 'FOMO Trade Analysis',
                        value: '12 instances',
                        trend: 'negative',
                        insight: 'FOMO entries typically 15-30 minutes after initial breakout show 83% loss rate'
                    },
                    bestSetup: {
                        metric: 'Optimal Setup Performance',
                        value: '82% win rate',
                        trend: 'positive',
                        insight: 'Morning breakouts (9:30-10:30 EST) with volume confirmation show highest success'
                    },
                    bestDays: {
                        metric: 'Performance by Day',
                        value: 'Tue-Wed peak',
                        trend: 'neutral',
                        insight: 'Tuesday-Wednesday show 23% higher average P&L, likely due to consistent sleep schedule'
                    },
                    riskReward: {
                        metric: 'Risk-Reward Optimization',
                        value: '1:1.8 average',
                        trend: 'positive',
                        insight: 'Current 1:1.8 R:R is optimal for your 68% win rate, but could improve stop placement'
                    },
                    emotionalState: {
                        metric: 'Emotional Trading Correlation',
                        value: '34% variance',
                        trend: 'negative',
                        insight: 'Journal entries mentioning "stress" or "rushed" correlate with 34% lower performance'
                    },
                    marketConditions: {
                        metric: 'Market Adaptation',
                        value: 'Trending: 78% WR',
                        trend: 'positive',
                        insight: 'Strong trending day performance but struggle in choppy conditions (45% WR)'
                    },
                    executionQuality: {
                        metric: 'Trade Execution Analysis',
                        value: '12.3% slippage impact',
                        trend: 'negative',
                        insight: 'Average 2.3 ticks slippage on entries suggests market order timing needs improvement'
                    },
                    positionSizing: {
                        metric: 'Position Size Efficiency',
                        value: '87% Kelly optimal',
                        trend: 'positive',
                        insight: 'Position sizing is 87% of Kelly optimal - slightly conservative but appropriate for risk tolerance'
                    },
                    trends: {
                        positive: 'STRENGTH',
                        negative: 'WEAKNESS',
                        neutral: 'INSIGHT',
                        warning: 'ATTENTION'
                    }
                }
            },
        },
        openSource: {
            title: 'Open and Transparent',
            description: 'We believe in full transparency. Our code is open for everyone to inspect, audit, and verify - ensuring the highest standards of security and reliability.',
        },
        accordion: {
            openSource: {
                title: 'Open source',
                description: 'Our entire codebase is open source. Inspect the code, verify our security practices, and contribute to {repoName}.',
                button: 'View repository',
            },
            community: {
                title: 'Community',
                description: 'Join a community of traders passionate about algorithmic trading and financial analysis.',
                button: 'Join Discord Community',
            },
            openRoadmap: {
                title: 'Open roadmap',
                description: 'Missing a feature? Start a discussion, report an issue, contribute the code, or even fork the repository.',
                button: 'View Updates',
            },
            security: {
                title: 'Security',
                description: 'We take security seriously. Learn about our security measures and how to report vulnerabilities.',
            },
            lastUpdated: 'Last updated {time}',
        },
        navbar: {
            features: 'Features',
            dataImport: 'Data Import',
            performanceVisualization: 'Performance Visualization',
            dailyPerformance: 'Daily Performance',
            aiJournaling: 'AI-Powered Journaling',
            developers: 'Developers',
            openSource: 'Open Source',
            documentation: 'Documentation',
            joinCommunity: 'Join the community',
            api: 'API',
            pricing: 'Pricing',
            updates: 'Updates',
            logo: {
                title: 'Navigation',
                dashboard: 'Dashboard',
                home: 'Website'
            },
            productUpdates: 'Product Updates',
            productUpdatesDescription: 'Stay up to date with our latest features and improvements.',
            dashboard: 'Dashboard',
            signIn: 'Sign in',
            elevateTrading: 'Elevate your trading with comprehensive analytics and AI-powered insights.',
            dataImportDescription: 'Import data from various providers.',
            performanceVisualizationDescription: 'Visualize your trading performance.',
            dailyPerformanceDescription: 'Track your daily trading results with an intuitive calendar view.',
            aiJournalingDescription: 'Improve your trading emotions with AI-assisted journaling.',
            openSourceDescription: 'Explore our open-source projects and contribute.',
            youtubeDescription: 'Watch tutorials and trading insights.',
            documentationDescription: 'Comprehensive guides and API references.',
            joinCommunityDescription: 'Connect with other developers and traders.',
            apiDescription: 'Access our API for custom integrations.',
            community: 'Community',
            communityDescription: 'Join our community to share ideas, report bugs, and discuss features.',
            oneApi: 'One API to rule them all',
            oneApiDescription: 'A single API effortlessly connecting to multiple providers and get one unified format.',
            toggleTheme: 'Toggle theme',
            openMenu: 'Open menu',
            darkMode: 'Dark mode',
            lightMode: 'Light mode',
            systemTheme: 'System theme',
            changeTheme: 'Change theme',
            changeLanguage: 'Change language',
            timezone: 'Timezone',
        },
        consent: {
            banner: {
                message: 'We use cookies to enhance your experience.',
                updatePreferences: 'You can update your preferences at any time by clicking',
                managePreferences: 'Manage preferences',
                rejectNonEssential: 'Reject non-essential',
                acceptAll: 'Accept all'
            },
            preferences: {
                title: 'Cookie Preferences Center',
                description: 'Customize your consent for different types of cookies. Strictly Necessary cookies cannot be toggled off as they\'re essential for the site\'s functionality. Other cookies are optional and will only be used if you enable them. You can change your consent at any time.',
                learnMore: 'Learn more',
                done: 'Done',
                strictlyNecessary: {
                    title: 'Strictly Necessary Cookies (always active)',
                    description: 'These cookies are essential for the site to function and cannot be toggled off. They assist with security, user authentication, customer support, etc.'
                },
                analytics: {
                    title: 'Analytics Cookies',
                    description: 'These cookies help us understand how visitors interact with our site. They allow us to measure traffic and improve site performance.'
                },
                marketing: {
                    title: 'Marketing Performance Cookies',
                    description: 'These cookies help us measure the effectiveness of our marketing campaigns.'
                }
            }
        },
        propfirms: {
            title: 'Prop Firm Catalogue',
            description: 'Explore prop firms tracked by Deltalytix users. See real statistics on registered accounts and payout performance.',
            registeredAccounts: 'Registered Accounts',
            accountTemplates: 'Account Templates',
            chart: {
                title: 'Registered Accounts by Prop Firm',
                accounts: 'Accounts'
            },
            sort: {
                label: 'Sort by',
                accounts: 'Number of Accounts',
                paidPayout: 'Paid Payout Amount',
                refusedPayout: 'Refused Payout Amount'
            },
            timeframe: {
                label: 'Timeframe',
                currentMonth: 'Current Month',
                last3Months: 'Last 3 Months',
                last6Months: 'Last 6 Months',
                '2024': '2024',
                '2025': '2025',
                allTime: 'All Time'
            },
            payouts: {
                title: 'Payout Statistics',
                paid: {
                    label: 'Paid',
                    description: 'Total amount and count of paid and validated payouts'
                },
                pending: {
                    label: 'Pending',
                    description: 'Total amount and count of pending payouts'
                },
                refused: {
                    label: 'Refused',
                    description: 'Total amount and count of refused payouts'
                },
                amount: 'Amount',
                'count#zero': 'No payouts',
                'count#one': '1 payout',
                'count#other': '{count} payouts'
            },
            other: {
                title: 'Other Prop Firms',
                description: 'Prop firms with registered accounts but not in our template catalogue'
            },
            noStats: 'No statistics available'
        },
    },
} as const;