export default {
    chat: {
        overlay: {
            welcome: "Bienvenue sur l'Assistant IA",
            description: "Votre compagnon intelligent pour l'analyse de données et les insights. Commencez une conversation pour explorer vos données.",
            features: {
                smartAnalysis: {
                    title: "Analyse Intelligente",
                    description: "Obtenez des insights instantanés de vos données"
                },
                naturalChat: {
                    title: "Chat Naturel",
                    description: "Posez vos questions en langage courant"
                }
            },
            startButton: "Démarrer la Conversation",
            resumeScroll: "Reprendre le défilement"
        },
        loading: {
            firstMessage: "Configuration de votre agent IA..."
        },
        copy: "Copier",
        file: "Fichier",
        url: "URL",
        writeMessage: "Écrivez un message...",
        aiThinking: "L'IA réfléchit...",
        trace: {
            thinking: "Réflexion",
            thought: "Réflexion terminée",
            thoughtFor: "Réflexion de {seconds} s",
            working: "Analyse de vos données",
            worked: "Analyse en {count} étapes",
            workedWithFailures: "Analyse en {count} étapes, {failed} en échec",
        },
        tools: {
            running: "Récupération : {tool}",
            done: "Récupéré : {tool}",
            error: "Échec de la récupération : {tool}",
            denied: "Ignoré : {tool}",
            pending: "En attente : {tool}",
            input: "Paramètres",
            output: "Résultat",
            names: {
                getJournalEntries: "entrées du journal",
                getPreviousConversation: "conversation précédente",
                getMostTradedInstruments: "instruments les plus tradés",
                getLastTradesData: "derniers trades",
                getTradesDetails: "détail des trades",
                getTradesSummary: "résumé des trades",
                getCurrentWeekSummary: "résumé de la semaine",
                getPreviousWeekSummary: "résumé de la semaine dernière",
                getWeekSummaryForDate: "résumé hebdomadaire",
                getFinancialNews: "actualités financières",
            },
        },
        confirmation: {
            fallbackTitle: "Poursuivre cette action ?",
            description: "L'assistant attend votre réponse avant de continuer.",
            approve: "Approuver",
            deny: "Refuser",
            approved: "Approuvé : {message}",
            denied: "Refusé : {message}",
        },
        chart: {
            generating: "Génération du graphique d'équité...",
            running: "Génération du graphique d'équité",
            done: "Graphique d'équité généré",
            error: "Échec de la génération du graphique d'équité",
            invalid: "Les données du graphique sont incomplètes.",
            noData: "Aucune donnée disponible pour la génération du graphique",
            individualView: "Vue individuelle des comptes ({count} comptes)",
            groupedView: "Vue groupée (tous les comptes combinés)",
            tradeCount: "{count} trades"
        },
        equity: {
            tooltip: {
                date: "Date",
                totalEquity: "Équité Totale",
                resets: "Réinitialisations de Comptes",
                accountReset: "Compte {account} réinitialisé",
                payouts: "Paiements"
            }
        },
        greeting: {
            message: "Bonjour ! Veuillez me saluer et me fournir un aperçu de mes données de trading actuelles pour cette semaine et aujourd'hui."
        }
    },
} as const;