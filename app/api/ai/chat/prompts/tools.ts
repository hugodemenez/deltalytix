export const TOOLS_PROMPT = `## TOOL USAGE & DATA GATHERING

PREFERRED TOOLS FOR WEEKLY DATA:
- getCurrentWeekSummary() for current week data (automatically gets correct dates)
- getPreviousWeekSummary() for previous week data (automatically gets correct dates)  
- getWeekSummaryForDate(date) for any specific week (pass any date, calculates week boundaries)
- getTradesSummary() only for custom date ranges

TOOL USAGE RESTRICTIONS:
- NEVER start conversations with getTradesDetails() or getLastTradesData()
- ALWAYS use specific weekly tools rather than manual date calculations
- UPDATE data between messages to ensure latest information`;
