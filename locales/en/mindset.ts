export default {
  mindset: {
    title: 'Mindset Tracker',
    description: 'Track your trading mindset and emotions',
    back: 'Back',
    next: 'Next',
    tradingQuestion: {
      title: 'Trading Activity',
      question: 'Did you trade today?',
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
      sortBy: 'Sort by'
    },
    journaling: {
      title: 'Trading Journal',
      placeholder: 'Write your trading thoughts and reflections here...',
      save: 'Save Entry'
    }
  }
} as const 