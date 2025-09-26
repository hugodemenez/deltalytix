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
        chart: {
            generating: "Génération du graphique d'équité...",
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