export default {
    landing: {
        title: 'Votre journal de trading.',
        description: 'Deltalytix est un journal de trading web pour traders futures permettant de stocker, explorer et comprendre leur historique de trading.',
        cta: 'Commencer maintenant',
        updates: 'Dernières mises à jour du produit →',
        partners: {
            title: 'Nos Partenaires',
            description: 'Nous collaborons avec les leaders du secteur pour vous offrir la meilleure expérience de trading.',
        },
        features: {
            heading: 'Fonctionnalités',
            subheading: 'Les bons outils pour vous aider à améliorer votre trading.',
            'data-import': {
                title: 'Importation de données',
                description: 'Notre plateforme offre une synchronisation automatique avec Rithmic et Tradovate, ainsi que des intégrations avec des copiers comme ETP et Thor. Grâce à notre système unique de mapping intelligent, vous pouvez importer n\'importe quel fichier CSV, quelle que soit sa structure.',
                stat: 'Intégrations multiples et synchronisation',
            },
            'performance-visualization': {
                title: 'Visualisation des performances',
                description: 'Visualisez vos performances de trading avec des graphiques et des diagrammes interactifs. Analysez les tendances, identifiez vos points forts et repérez les domaines à améliorer.',
                stat: 'Analyses complètes',
            },
            'daily-performance': {
                title: 'Performance quotidienne',
                description: 'Suivez vos résultats de trading quotidiens avec une vue calendrier intuitive. Identifiez rapidement les tendances et les modèles dans vos performances de trading.',
                stat: 'Vue calendrier',
            },
            'ai-journaling': {
                title: 'Journal assisté par IA',
                description: 'Améliorez vos émotions de trading grâce à un journal assisté par IA. Nos algorithmes avancés analysent vos entrées pour identifier les modèles émotionnels et les biais.',
                stat: 'Intelligence émotionnelle',
            },
            'chat-feature': {
                title: 'Coach de Trading IA',
                description: 'Obtenez des insights et analyses personnalisés de notre coach IA. Comprenez vos patterns de trading, identifiez vos forces et faiblesses, et recevez des recommandations actionnables.',
                stat: 'Analyse en Temps Réel',
                conversation: {
                    analyze: 'Analysez ma performance de trading du mois dernier et identifiez les facteurs clés affectant mon P&L',
                    patterns: 'Quels patterns psychologiques observez-vous dans mes trades perdants ? Y a-t-il des conditions de marché spécifiques où j\'ai systématiquement des difficultés ?',
                    riskManagement: 'Comment puis-je améliorer ma gestion des risques ? Mon drawdown maximum semble trop élevé pour la taille de mon compte',
                    profitableSetup: 'Quelle est ma configuration la plus rentable et dans quelles conditions de marché fonctionne-t-elle le mieux ?',
                    journalInsights: 'Basé sur mes entrées de journal de trading, quels états émotionnels corrèlent avec mes meilleurs et pires jours de trading ?',
                    marketTiming: 'Analysez mon timing d\'entrée et de sortie - est-ce que j\'entre trop tôt ou trop tard par rapport aux niveaux clés ?',
                    positionSizing: 'Ma taille de position est-elle optimale pour mon taux de réussite et mes ratios risque-récompense selon les différentes configurations ?'
                },
                responses: {
                    analyze: 'J\'ai analysé vos 127 trades du mois dernier. Votre performance globale montre une exécution technique solide mais une interférence émotionnelle significative pendant les périodes de drawdown.',
                    patterns: 'Vos entrées de journal révèlent un pattern clair : après 2+ pertes consécutives, vous augmentez la taille de position de 40% et abandonnez vos critères de configuration. Ce trading de revanche représente 73% de vos plus grandes pertes.',
                    riskManagement: 'Votre drawdown maximum de 12% dépasse les niveaux optimaux pour votre taille de compte. Je recommande d\'implémenter une réduction de taille de position après les pertes et d\'utiliser la règle des 2% de manière cohérente.',
                    profitableSetup: 'Votre stratégie de breakout matinal montre des résultats exceptionnels avec 82% de taux de réussite pendant 9h30-10h30 EST lorsqu\'elle est combinée avec une confirmation de volume supérieure à 1.5x la moyenne.',
                    journalInsights: 'Forte corrélation entre la qualité du sommeil et les performances - vos trades de mardi-mercredi montrent 23% de P&L plus élevé quand vous mentionnez "bien reposé" dans vos entrées de journal.',
                    marketTiming: 'L\'analyse montre que vous entrez 15-30 minutes trop tôt sur les breakouts. Attendre la confirmation améliorerait votre taux de réussite de 68% à environ 78%.',
                    positionSizing: 'Votre sizing actuel est à 87% de l\'optimal Kelly. Considérez augmenter la taille sur vos configurations à plus haute probabilité tout en maintenant une approche conservatrice sur les trades expérimentaux.'
                },
                analysis: {
                    winRate: {
                        metric: 'Taux de Réussite Global',
                        value: '68%',
                        trend: 'positive',
                        insight: 'Au-dessus de la moyenne mais risque de concentration sur les trades de breakout (45% du volume) nécessite diversification'
                    },
                    revengeTrading: {
                        metric: 'Impact du Trading de Revanche',
                        value: '73% taux de perte',
                        trend: 'negative',
                        insight: 'Fuite majeure de profits : trades de revanche après 2+ pertes montrent 73% de taux de perte vs 32% normal'
                    },
                    fomo: {
                        metric: 'Analyse des Trades FOMO',
                        value: '12 occurrences',
                        trend: 'negative',
                        insight: 'Entrées FOMO typiquement 15-30 minutes après breakout initial montrent 83% de taux de perte'
                    },
                    bestSetup: {
                        metric: 'Performance Configuration Optimale',
                        value: '82% taux de réussite',
                        trend: 'positive',
                        insight: 'Breakouts matinaux (9h30-10h30 EST) avec confirmation de volume montrent le plus haut succès'
                    },
                    bestDays: {
                        metric: 'Performance par Jour',
                        value: 'Pic Mar-Mer',
                        trend: 'neutral',
                        insight: 'Mardi-Mercredi montrent 23% de P&L moyen plus élevé, probablement dû à un horaire de sommeil cohérent'
                    },
                    riskReward: {
                        metric: 'Optimisation Risque-Récompense',
                        value: '1:1.8 moyenne',
                        trend: 'positive',
                        insight: 'Actuel R:R de 1:1.8 est optimal pour votre taux de réussite de 68%, mais pourrait améliorer placement des stops'
                    },
                    emotionalState: {
                        metric: 'Corrélation Trading Émotionnel',
                        value: '34% variance',
                        trend: 'negative',
                        insight: 'Entrées de journal mentionnant "stress" ou "pressé" corrèlent avec 34% de performance inférieure'
                    },
                    marketConditions: {
                        metric: 'Adaptation au Marché',
                        value: 'Tendance: 78% TR',
                        trend: 'positive',
                        insight: 'Performance forte les jours de tendance mais difficultés en conditions hachées (45% TR)'
                    },
                    executionQuality: {
                        metric: 'Analyse Exécution des Trades',
                        value: '12.3% impact slippage',
                        trend: 'negative',
                        insight: 'Moyenne de 2.3 ticks de slippage sur entrées suggère amélioration du timing des ordres au marché'
                    },
                    positionSizing: {
                        metric: 'Efficacité Taille de Position',
                        value: '87% Kelly optimal',
                        trend: 'positive',
                        insight: 'Taille de position est 87% de Kelly optimal - légèrement conservateur mais approprié pour tolérance au risque'
                    },
                    trends: {
                        positive: 'FORCE',
                        negative: 'FAIBLESSE',
                        neutral: 'INSIGHT',
                        warning: 'ATTENTION'
                    }
                }
            },
        },
        openSource: {
            title: 'Ouvert et Transparent',
            description: 'Nous croyons en la transparence totale. Notre code source est ouvert à tous pour inspection, audit et vérification - garantissant les plus hauts standards de sécurité et de fiabilité.',
        },
        accordion: {
            openSource: {
                title: 'Open source',
                description: 'Notre code source est entièrement ouvert. Inspectez le code, vérifiez nos pratiques de sécurité et contribuez à {repoName}.',
                button: 'Voir le dépôt',
            },
            community: {
                title: 'Communauté',
                description: 'Rejoignez une communauté de traders passionnés par le trading algorithmique et l\'analyse financière.',
                button: 'Rejoindre la communauté Discord',
            },
            openRoadmap: {
                title: 'Feuille de route ouverte',
                description: 'Il manque une fonctionnalité ? Lancez une discussion, signalez un problème, contribuez au code ou même forkez le dépôt.',
                button: 'Voir les mises à jour',
            },
            security: {
                title: 'Sécurité',
                description: 'Nous prenons la sécurité au sérieux. Découvrez nos mesures de sécurité et comment signaler les vulnérabilités.',
            },
            lastUpdated: 'Dernière mise à jour il y a {time}',
        },
        navbar: {
            features: 'Fonctionnalités',
            dataImport: 'Import de données',
            performanceVisualization: 'Visualisation des performances',
            dailyPerformance: 'Performance quotidienne',
            aiJournaling: 'Journal assisté par IA',
            developers: 'Développeurs',
            openSource: 'Open Source',
            documentation: 'Documentation',
            joinCommunity: 'Rejoindre la communauté',
            api: 'API',
            pricing: 'Tarifs',
            updates: 'Mises à jour',
            logo: {
                title: 'Navigation',
                dashboard: 'Tableau de bord',
                home: 'Site web'
            },
            productUpdates: 'Mises à jour du produit',
            productUpdatesDescription: 'Restez informé de nos dernières fonctionnalités et améliorations.',
            community: 'Communauté',
            communityDescription: 'Partagez vos idées, signalez des bugs et discutez des fonctionnalités.',
            dashboard: 'Tableau de bord',
            signIn: 'Se connecter',
            elevateTrading: 'Améliorez votre trading avec des analyses complètes et des insights alimentés par l\'IA.',
            dataImportDescription: 'Importez des données depuis différents fournisseurs.',
            performanceVisualizationDescription: 'Visualisez vos performances de trading.',
            dailyPerformanceDescription: 'Suivez vos résultats quotidiens avec une vue calendrier intuitive.',
            aiJournalingDescription: 'Améliorez vos émotions de trading avec un journal assisté par l\'IA.',
            openSourceDescription: 'Explorez nos projets open-source et contribuez.',
            youtubeDescription: 'Regardez des tutoriels et des analyses de trading.',
            documentationDescription: 'Guides complets et références API.',
            joinCommunityDescription: 'Connectez-vous avec d\'autres développeurs et traders.',
            apiDescription: 'Accédez à notre API pour des intégrations personnalisées.',
            oneApi: 'Une API pour les gouverner toutes',
            oneApiDescription: 'Une seule API se connectant sans effort à plusieurs fournisseurs et obtenant un format unifié.',
            toggleTheme: 'Changer de thème',
            openMenu: 'Ouvrir le menu',
            darkMode: 'Mode sombre',
            lightMode: 'Mode clair',
            systemTheme: 'Thème système',
            changeTheme: 'Changer de thème',
            changeLanguage: 'Changer de langue',
            timezone: 'Fuseau horaire',
        },
        consent: {
            banner: {
                message: 'Nous utilisons des cookies pour améliorer votre expérience.',
                updatePreferences: 'Vous pouvez mettre à jour vos préférences à tout moment en cliquant sur',
                managePreferences: 'Gérer les préférences',
                rejectNonEssential: 'Rejeter les non-essentiels',
                acceptAll: 'Tout accepter'
            },
            preferences: {
                title: 'Centre de préférences des cookies',
                description: 'Personnalisez votre consentement pour différents types de cookies. Les cookies strictement nécessaires ne peuvent pas être désactivés car ils sont essentiels au fonctionnement du site. Les autres cookies sont optionnels et ne seront utilisés que si vous les activez. Vous pouvez modifier votre consentement à tout moment.',
                learnMore: 'En savoir plus',
                done: 'Terminé',
                strictlyNecessary: {
                    title: 'Cookies strictement nécessaires (toujours actifs)',
                    description: 'Ces cookies sont essentiels au fonctionnement du site et ne peuvent pas être désactivés. Ils aident à la sécurité, l\'authentification des utilisateurs, le support client, etc.'
                },
                analytics: {
                    title: 'Cookies d\'analyse',
                    description: 'Ces cookies nous aident à comprendre comment les visiteurs interagissent avec notre site. Ils nous permettent de mesurer le trafic et d\'améliorer les performances du site.'
                },
                marketing: {
                    title: 'Cookies de performance marketing',
                    description: 'Ces cookies nous aident à mesurer l\'efficacité de nos campagnes marketing.'
                }
            }
        },
        propfirms: {
            title: 'Catalogue des Prop Firms',
            description: 'Explorez les prop firms suivies par les utilisateurs de Deltalytix. Consultez les statistiques réelles sur les comptes enregistrés et les performances de payouts.',
            registeredAccounts: 'Comptes enregistrés',
            accountTemplates: 'Modèles de comptes',
            chart: {
                title: 'Comptes enregistrés par Prop Firm',
                accounts: 'Comptes'
            },
            sort: {
                label: 'Trier par',
                accounts: 'Nombre de Comptes',
                paidPayout: 'Montant des payouts payés',
                refusedPayout: 'Montant des payouts refusés'
            },
            timeframe: {
                label: 'Période',
                currentMonth: 'Mois en cours',
                last3Months: '3 Derniers Mois',
                last6Months: '6 Derniers Mois',
                '2024': '2024',
                '2025': '2025',
                allTime: 'Tout le temps'
            },
            payouts: {
                title: 'Statistiques de payouts',
                paid: {
                    label: 'Payés',
                    description: 'Montant total et nombre de payouts payés et validés'
                },
                pending: {
                    label: 'En Attente',
                    description: 'Montant total et nombre de payouts en attente'
                },
                refused: {
                    label: 'Refusés',
                    description: 'Montant total et nombre de payouts refusés'
                },
                amount: 'Montant',
                'count#zero': 'Aucun payout',
                'count#one': '1 payout',
                'count#other': '{count} payouts'
            },
            other: {
                title: 'Autres Prop Firms',
                description: 'Prop firms avec des comptes enregistrés mais non présentes dans notre catalogue de modèles'
            },
            noStats: 'Aucune statistique disponible'
        },
    },
} as const;