export default {
  mindset: {
    title: 'Suivi Mental',
    description: 'Suivez votre état d\'esprit et vos émotions de trading',
    back: 'Retour',
    next: 'Suivant',
    tradingQuestion: {
      title: 'Activité de Trading',
      question: 'Avez-vous tradé aujourd\'hui ?',
      yes: 'Oui',
      no: 'Non'
    },
    emotion: {
      title: 'État Émotionnel',
      description: 'Comment vous sentez-vous par rapport à votre trading aujourd\'hui ?',
      verySad: 'Très Négatif',
      sad: 'Négatif',
      neutral: 'Neutre',
      happy: 'Positif',
      veryHappy: 'Très Positif'
    },
    newsImpact: {
      title: 'Impact des Actualités',
      description: 'Sélectionnez les actualités qui ont impacté votre trading',
      highImpact: 'Actualité à fort impact',
      selectCountry: 'Sélectionner le Pays',
      allCountries: 'Tous les Pays',
      filterByCountry: 'Filtrer par Pays',
      searchCountry: 'Rechercher un pays...',
      noCountries: 'Aucun pays trouvé',
      sortByImpact: 'Trier par Impact',
      filterBySession: 'Filtrer par Session',
      allSessions: 'Toutes les Sessions',
      session: {
        LONDON: 'Session Londres',
        US: 'Session US',
        ASIA: 'Session Asie'
      },
      filters: 'Filtres',
      searchFilters: 'Rechercher des filtres...',
      sortBy: 'Trier par'
    },
    journaling: {
      title: 'Journal de Trading',
      placeholder: 'Écrivez vos réflexions et pensées de trading ici...',
      save: 'Enregistrer'
    }
  }
} as const; 