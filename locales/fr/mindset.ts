export default {
  mindset: {
    title: 'Suivi de l\'État d\'Esprit',
    description: 'Suivez votre état d\'esprit et vos émotions en trading',
    back: 'Retour',
    next: 'Suivant',
    saveSuccess: 'Succès',
    saveSuccessDescription: 'Votre entrée d\'état d\'esprit a été enregistrée avec succès.',
    saveError: 'Erreur',
    saveErrorDescription: 'Échec de l\'enregistrement de votre entrée d\'état d\'esprit. Veuillez réessayer.',
    loadError: 'Erreur',
    loadErrorDescription: 'Échec du chargement des données d\'état d\'esprit. Veuillez réessayer.',
    noEntries: 'Aucune entrée trouvée pour les 30 derniers jours',
    addEntry: 'Ajouter une entrée',
    selectDate: 'Sélectionner une date',
    edit: 'Modifier',
    noData: 'Aucune donnée disponible',
    today: 'Aujourd\'hui',
    delete: 'Supprimer',
    cancel: 'Annuler',
    deleteSuccess: 'Succès',
    deleteSuccessDescription: 'L\'entrée a été supprimée avec succès.',
    deleteError: 'Erreur',
    deleteErrorDescription: 'Échec de la suppression de l\'entrée. Veuillez réessayer.',
    deleteConfirmTitle: 'Supprimer l\'entrée',
    deleteConfirmDescription: 'Êtes-vous sûr de vouloir supprimer cette entrée ? Cette action ne peut pas être annulée.',
    tradingQuestion: {
      title: 'Activité de Trading',
      question: 'Avez-vous tradé le {date} ?',
      questionToday: 'Avez-vous tradé aujourd\'hui ?',
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
      title: 'Impact des news',
      description: 'Sélectionnez les événements d\'actualité qui ont impacté votre trading',
      highImpact: 'News à fort impact',
      selectCountry: 'Sélectionner le pays',
      allCountries: 'Tous les pays',
      filterByCountry: 'Filtrer par pays',
      searchCountry: 'Rechercher un pays...',
      noCountries: 'Aucun pays trouvé',
      sortByImpact: 'Trier par Impact',
      filterBySession: 'Filtrer par Session',
      allSessions: 'Toutes les Sessions',
      session: {
        LONDON: 'Session de Londres',
        US: 'Session US',
        ASIA: 'Session Asie'
      },
      filters: 'Filtres',
      searchFilters: 'Rechercher des filtres...',
      sortBy: 'Trier par',
      moreEvents: '{count} événements supplémentaires'
    },
    journaling: {
      title: 'Journal de Trading',
      placeholder: 'Écrivez vos pensées et réflexions sur votre trading ici...',
      save: 'Enregistrer'
    },
    tradingStats: {
      title: 'Statistiques de trading',
      winningTrades: 'Trades gagnants',
      losingTrades: 'Trades perdants',
      totalPnL: 'P&L total',
      winRate: 'Taux de réussite',
    },
  }
} as const; 