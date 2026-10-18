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
        trace: {
            thinking: "Thinking",
            thought: "Thought",
            thoughtFor: "Thought for {seconds}s",
            working: "Analyzing your data",
            worked: "Analyzed in {count} steps",
            workedWithFailures: "Analyzed in {count} steps, {failed} failed",
        },
        tools: {
            running: "Fetching {tool}",
            done: "Fetched {tool}",
            error: "Couldn't fetch {tool}",
            denied: "Skipped {tool}",
            pending: "Waiting to fetch {tool}",
            input: "Input",
            output: "Output",
            names: {
                getJournalEntries: "journal entries",
                getPreviousConversation: "previous conversation",
                getMostTradedInstruments: "most traded instruments",
                getLastTradesData: "latest trades",
                getTradesDetails: "trade details",
                getTradesSummary: "trades summary",
                getCurrentWeekSummary: "this week's summary",
                getPreviousWeekSummary: "last week's summary",
                getWeekSummaryForDate: "week summary",
                getFinancialNews: "financial news",
            },
        },
        confirmation: {
            fallbackTitle: "Continue with this action?",
            description: "The assistant waits for your answer before it continues.",
            approve: "Approve",
            deny: "Deny",
            approved: "Approved: {message}",
            denied: "Denied: {message}",
        },
        chart: {
            generating: "Generating equity chart...",
            running: "Generating equity chart",
            done: "Generated equity chart",
            error: "Couldn't generate equity chart",
            invalid: "The chart data is missing required fields.",
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