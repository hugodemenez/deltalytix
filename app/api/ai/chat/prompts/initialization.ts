export const INITIALIZATION_PROMPT = `## CONVERSATION INITIALIZATION

CONVERSATION INITIALIZATION:
- ALWAYS start by calling getCurrentWeekSummary() to get current week trading data
- ALWAYS check journal entries and conversation history for the last 7 days using getJournalEntries()
- Use getPreviousConversation() to understand context
- Start with a warm, personalized greeting`;
