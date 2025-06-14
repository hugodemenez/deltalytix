export default {
    propFirm: {
        title: 'Comptes',
        description: 'Gérez vos comptes et suivez vos performances.',
        card: {
            unnamedAccount: 'Compte sans nom',
            balance: 'Solde',
            target: 'Objectif',
            drawdown: 'Perte maximale',
            remainingLoss: '${amount} restant',
            drawdownBreached: 'Perte maximale dépassée',
            maxLoss: 'Perte max : ${amount}',
            needsConfiguration: 'Le compte doit être configuré',
            daysBeforeNextPayment: ' jours avant le prochain paiement',
            consistency: 'Cohérence',
            highestDailyProfit: 'Plus haut profit journalier',
            maxAllowedDailyProfit: 'Profit journalier maximum autorisé',
            totalPnL: 'P&L Total',
            totalTrades: 'Total Trades'
        },
        ungrouped: 'Non groupé',
        tabs: {
            overview: 'Aperçu',
            consistency: 'Cohérence'
        },
        configurator: {
            title: 'Configuration du Compte pour {accountNumber}',
            description: 'Configurez les paramètres du compte pour votre activité de trading prop firm',
            template: {
                title: 'Charger un Modèle',
                description: 'Chargez rapidement des configurations prédéfinies de prop firm',
                select: 'Sélectionner un modèle...',
                search: 'Rechercher par prop firm ou modèle...',
                noTemplate: 'Aucun modèle trouvé.',
                clear: 'Effacer le Modèle',
                target: 'Objectif'
            },
            sections: {
                basicInfo: 'Informations de Base du Compte',
                drawdownRules: 'Drawdown & Règles de Trading',
                pricingPayout: 'Prix & Paiements',
                resetDate: 'Date de Réinitialisation',
                paymentRenewal: 'Paiement et Renouvellement',
                accountReset: 'Configuration de Réinitialisation du Compte'
            },
            fields: {
                accountType: 'Type de Compte',
                funded: 'Funded',
                challenge: 'Challenge',
                drawdown: 'Drawdown',
                drawdownType: 'Type de Drawdown',
                trailingDrawdown: 'Drawdown Trailing',
                trailingStopProfit: 'Stop Profit Trailing',
                trailingType: 'Type de Trailing',
                dailyLoss: 'Perte Journalière',
                rulesDailyLoss: 'Règles de Perte Journalière',
                tradingNewsAllowed: 'Trading sur News Autorisé',
                allowNewsTrading: 'Autoriser le Trading sur News',
                basePrice: 'Prix de Base',
                promo: 'Promotion',
                hasPromo: 'A une Promotion',
                promoType: 'Type de Promotion',
                directPrice: 'Prix Direct',
                percentage: 'Pourcentage',
                activationFees: 'Frais d\'Activation',
                balanceRequired: 'Solde Requis',
                minTradingDays: 'Jours de Trading Minimum pour Paiement',
                propfirmName: 'Nom de la Prop Firm',
                nextPaymentDate: 'Prochaine Date de Paiement',
                paymentFrequency: 'Fréquence de Paiement',
                autoRenewal: 'Renouvellement Automatique',
                renewalNotification: 'Notification de Renouvellement',
                enableRenewalNotification: 'Activer les notifications de renouvellement',
                renewalNoticeInfo: 'Vous recevrez des notifications 3 jours avant le renouvellement',
                renewalNotice: 'Jours de Préavis de Renouvellement'
            },
            trailingTypes: {
                static: 'Statique',
                eod: 'Fin de Journée',
                intraday: 'Intraday'
            },
            rulesDailyLoss: {
                no: 'Non',
                lock: 'Verrouillage',
                violation: 'Violation'
            },
            paymentFrequencies: {
                monthly: 'Mensuel',
                quarterly: 'Trimestriel',
                biannual: 'Semestriel',
                annual: 'Annuel',
                custom: 'Personnalisé'
            },

        },
        balance: 'Solde',
        target: 'Objectif',
        drawdown: 'Drawdown',
        accountSize: 'Taille du Compte',
        coherence: 'Cohérence',
        startingBalance: 'Solde Initial',
        beforeReset: 'Avant Réinitialisation',
        afterReset: 'Après Réinitialisation',
        globalPnl: 'P&L Global',
        accountName: 'Nom du Compte',
        resetDate: {
            cleared: 'La date de réinitialisation a été supprimée',
            title: 'Date de Réinitialisation',
            description: 'Sélectionnez une date pour réinitialiser le solde du compte',
            clear: 'Supprimer la date de réinitialisation',
            set: 'Définir la date de réinitialisation',
            label: 'Date de Réinitialisation',
            noDate: 'Pas de date de réinitialisation',
            info: 'La date à laquelle le solde du compte sera réinitialisé'
        },
        noResetDate: 'Pas de date de réinitialisation',
        resetDateDescription: 'La date à laquelle le solde du compte sera réinitialisé',
        payout: {
            add: 'Ajouter un Retrait',
            edit: 'Modifier le Retrait',
            addDescription: 'Ajouter un nouveau retrait pour le compte',
            editDescription: 'Modifier le retrait pour le compte',
            date: 'Date du Retrait',
            amount: 'Montant',
            status: 'Statut',
            statuses: {
                pending: 'En Attente',
                validated: 'Validé',
                refused: 'Refusé',
                paid: 'Payé'
            },
            delete: 'Supprimer le Retrait',
            save: 'Enregistrer le Retrait',
            update: 'Mettre à Jour le Retrait',
            success: 'Retrait enregistré',
            successDescription: 'Le retrait a été enregistré avec succès',
            error: 'Échec de l\'enregistrement du retrait',
            errorDescription: 'Une erreur est survenue lors de l\'enregistrement du retrait',
            deleteSuccess: 'Retrait supprimé',
            deleteSuccessDescription: 'Le retrait a été supprimé avec succès',
            deleteError: 'Échec de la suppression du retrait',
            deleteErrorDescription: 'Une erreur est survenue lors de la suppression du retrait',
            updateSuccess: 'Retrait mis à jour',
            updateSuccessDescription: 'Le retrait a été mis à jour avec succès',
            updateError: 'Échec de la mise à jour du retrait',
            updateErrorDescription: 'Une erreur est survenue lors de la mise à jour du retrait',
            deleteConfirm: 'Supprimer le retrait',
            deleteConfirmDescription: 'Êtes-vous sûr de vouloir supprimer ce retrait ? Cette action ne peut pas être annulée.',
            deleteConfirmButton: 'Oui, supprimer',
            deleteCancel: 'Annuler'
        },
        dailyStats: {
            title: 'Performance Journalière',
            date: 'Date',
            pnl: 'P&L',
            balance: 'Solde',
            target: '% de l\'Objectif',
            status: 'Statut',
            payout: 'Payout',
            payoutAmount: 'Montant du Payout',
            payoutStatus: 'Statut du Payout',
            maxAllowed: 'Maximum Autorisé'
        },
        setup: {
            button: 'Configurer',
            message: 'Cliquez pour configurer le compte',
            success: 'Compte mis à jour',
            error: 'Échec de la mise à jour du compte',
            validation: {
                required: 'Veuillez remplir tous les champs requis',
                positive: 'Toutes les valeurs numériques doivent être positives'
            },
            configureFirst: {
                title: 'Configuration requise',
                description: 'Veuillez configurer votre compte prop firm pour voir les statistiques détaillées.'
            },
            saveFirst: {
                title: 'Enregistrement requis',
                description: 'Veuillez enregistrer vos modifications pour voir les statistiques mises à jour.'
            }
        },
        status: {
            unprofitable: 'Non rentable - Pas de vérification de cohérence',
            insufficient: 'Données insuffisantes',
            consistent: 'Trading cohérent',
            inconsistent: 'Trading incohérent',
            needsConfiguration: 'Nécessite une configuration'
        },
        toast: {
            setupSuccess: 'Configuration du compte réussie',
            setupSuccessDescription: 'Votre compte prop firm a été configuré avec succès',
            setupError: 'Échec de la configuration du compte',
            setupErrorDescription: 'Une erreur est survenue lors de la configuration de votre compte prop firm',
            updateSuccess: 'Compte mis à jour',
            updateSuccessDescription: 'Votre compte prop firm a été mis à jour avec succès',
            updateError: 'Échec de la mise à jour',
            updateErrorDescription: 'Une erreur est survenue lors de la mise à jour de votre compte prop firm',
            resetDateCleared: 'Date de réinitialisation supprimée',
            resetDateClearedDescription: 'La date de réinitialisation a été supprimée avec succès',
            resetDateError: 'Erreur de date de réinitialisation',
            resetDateErrorDescription: 'Une erreur est survenue lors de la mise à jour de la date de réinitialisation',
            validationPositive: 'Toutes les valeurs numériques doivent être positives',
            deleteSuccess: 'Compte supprimé',
            deleteSuccessDescription: 'Le compte prop firm a été supprimé avec succès',
            deleteError: 'Échec de la suppression du compte',
            deleteErrorDescription: 'Une erreur est survenue lors de la suppression du compte prop firm'
        },
        chart: {
            balance: "Solde",
            drawdownLevel: "Niveau de Drawdown",
            profitTarget: "Objectif de Profit",
            tradeNumber: "Trade n°{number}",
            balanceAmount: "Solde : ${amount}",
            pnlAmount: "P&L : ${amount}",
            drawdownAmount: "Niveau de Drawdown : ${amount}",
            highestBalance: "Solde le plus haut : ${amount}",
            startingBalance: "Solde initial",
            noTrades: "Aucun trade disponible",
            payout: "Paiement",
            payoutAmount: "Paiement : ${amount}",
            accountReset: "Réinitialisation du Compte"
        },
        trailingDrawdown: {
            explanation: 'Le drawdown suivra les profits jusqu\'à ce que ce niveau soit atteint'
        },
        delete: {
            title: 'Supprimer le Compte',
            description: 'Êtes-vous sûr de vouloir supprimer le compte {account} ? Cette action ne peut pas être annulée.',
            success: 'Compte supprimé avec succès',
            successDescription: 'Le compte prop firm a été supprimé',
            error: 'Échec de la suppression du compte',
            errorDescription: 'Une erreur est survenue lors de la suppression du compte prop firm',
            confirm: 'Oui, supprimer le compte',
            cancel: 'Annuler'
        },
        renewal: {
            title: 'Renouvellements de Compte',
            frequency: 'renouvellement',
            notification: 'Notifications activées'
        },
        consistency: {
            title: 'Cohérence du Trading',
            description: 'Surveillez votre cohérence en vous assurant qu\'aucune journée ne dépasse le pourcentage configuré du profit total',
            tooltip: 'Un trader cohérent doit maintenir des profits journaliers équilibrés par rapport à son profit total',
            account: 'Compte',
            maxAllowedDailyProfit: 'Profit Journalier Maximum Autorisé',
            highestDailyProfit: 'Plus Haut Profit Journalier',
            status: 'Statut',
            insufficientData: 'Données insuffisantes',
            consistent: 'Cohérent',
            inconsistent: 'Incohérent (Dépasse le Maximum)',
            unprofitable: 'Aucun Profit',
            threshold_settings: {
                title: 'Seuil de Cohérence',
                description: 'Pourcentage maximum du profit total autorisé en une journée',
                currentValue: '{value}% du profit total'
            },
            modal: {
                title: 'Jours Incohérents pour le Compte {account}',
                description: 'Jours où le profit a dépassé le profit journalier maximum autorisé',
                date: 'Date',
                pnl: 'P&L',
                percentageOfTotal: '% du Profit Total'
            }
        },
        table: {
            title: 'Tableau',
            configurator: 'Configuration'
        },
        common: {
            configure: 'Configurer',
            save: 'Sauvegarder',
            saving: 'Sauvegarde...',
            cancel: 'Annuler',
            delete: 'Supprimer',
            deleting: 'Suppression...'
        },
    }
} as const;