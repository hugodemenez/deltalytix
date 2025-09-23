export default {
    chat: {
        overlay: {
            welcome: "Welcome to AI Assistant",
            description: "Your intelligent companion for data analysis and insights. Start a conversation to explore your data.",
            features: {
                smartAnalysis: {
                    title: "Smart Analysis",
                    description: "Get instant insights from your data"
                },
                naturalChat: {
                    title: "Natural Chat",
                    description: "Ask questions in plain language"
                }
            },
            startButton: "Start Conversation",
            resumeScroll: "Resume Scroll"
        },
        loading: {
            firstMessage: "Setting up your AI agent..."
        },
        copy: "Copy",
        file: "File",
        url: "URL",
        writeMessage: "Write a message...",
        aiThinking: "AI is thinking...",
        chart: {
            generating: "Generating equity chart...",
            noData: "No data available for chart generation",
            individualView: "Individual accounts view ({count} accounts)",
            groupedView: "Grouped view (all accounts combined)",
            tradeCount: "{count} trades"
        },
        equity: {
            tooltip: {
                date: "Date",
                totalEquity: "Total Equity",
                resets: "Account Resets",
                accountReset: "Account {account} reset",
                payouts: "Payouts"
            }
        },
        greeting: {
            message: "Hello! Please greet me and provide an overview of my current trading data for this week and today."
        }
    },
} as const;