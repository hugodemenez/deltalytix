export default {
  mindset: {
    title: 'Mindset Tracker',
    description: 'Track your trading mindset and emotions',
    back: 'Back',
    next: 'Next',
    saveSuccess: 'Success',
    saveSuccessDescription: 'Your mindset entry has been saved successfully.',
    saveError: 'Error',
    saveErrorDescription: 'Failed to save your mindset entry. Please try again.',
    loadError: 'Error',
    loadErrorDescription: 'Failed to load mindset data. Please try again.',
    noEntries: 'No entries found for the last 30 days',
    addEntry: 'Add Entry',
    selectDate: 'Select Date',
    edit: 'Edit',
    noData: 'No data available',
    today: 'Today',
    delete: 'Delete',
    cancel: 'Cancel',
    deleteSuccess: 'Success',
    deleteSuccessDescription: 'The entry has been deleted successfully.',
    deleteError: 'Error',
    deleteErrorDescription: 'Failed to delete the entry. Please try again.',
    deleteConfirmTitle: 'Delete Entry',
    deleteConfirmDescription: 'Are you sure you want to delete this entry? This action cannot be undone.',
    tradingQuestion: {
      title: 'Trading Activity',
      question: 'Did you trade on {date}?',
      questionToday: 'Do you trade today?',
      yes: 'Yes',
      no: 'No'
    },
    emotion: {
      title: 'Emotional State',
      description: 'How are you feeling about your trading today?',
      verySad: 'Very Negative',
      sad: 'Negative',
      neutral: 'Neutral',
      happy: 'Positive',
      veryHappy: 'Very Positive'
    },
    newsImpact: {
      title: 'News Impact',
      description: 'Select the news events that impacted your trading',
      highImpact: 'High impact news',
      selectCountry: 'Select Country',
      allCountries: 'All Countries',
      filterByCountry: 'Filter by Country',
      searchCountry: 'Search country...',
      noCountries: 'No countries found',
      sortByImpact: 'Sort by Impact',
      filterBySession: 'Filter by Session',
      allSessions: 'All Sessions',
      session: {
        LONDON: 'London Session',
        US: 'US Session',
        ASIA: 'Asia Session'
      },
      filters: 'Filters',
      searchFilters: 'Search filters...',
      sortBy: 'Sort by',
      moreEvents: '{count} more events',
      showOnlyTraded: 'Show only traded hours'
    },
    journaling: {
      title: 'Trading Journal',
      placeholder: 'Write your trading thoughts and reflections here...',
      save: 'Save Entry'
    },
    tradingStats: {
      title: 'Trading Statistics',
      winningTrades: 'Winning Trades',
      losingTrades: 'Losing Trades',
      totalPnL: 'Total P&L',
      winRate: 'Win Rate',
      symbol: 'Symbol',
      pnl: 'P&L',
      commission: 'Commission',
      netPnL: 'Net P&L',
      entryTime: 'Entry Time'
    }
  }
} as const 