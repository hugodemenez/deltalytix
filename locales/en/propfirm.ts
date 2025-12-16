export default {
    propFirm: {
        title: 'Accounts',
        description: 'Manage your accounts and track your performance.',
        card: {
            unnamedAccount: 'Unnamed Account',
            balance: 'Balance',
            target: 'Target',
            remainingToTarget: 'Remaining to Target',
            drawdown: 'Drawdown',
            remainingLoss: '${amount} remaining',
            drawdownBreached: 'Drawdown breached',
            maxLoss: 'Max Loss: ${amount}',
            needsConfiguration: 'Account needs to be configured',
            daysBeforeNextPayment: ' days before next payment',
            consistency: 'Consistency',
            highestDailyProfit: 'Highest Daily Profit',
            maxAllowedDailyProfit: 'Max Allowed Daily Profit',
            totalPnL: 'Total P&L',
            totalTrades: 'Total Trades',
            tradingDays: 'Trading Days'
        },
        ungrouped: 'Ungrouped',
        dragAndDrop: {
            dragToReorder: 'Drag to reorder accounts',
            reordering: 'Reordering accounts...',
            reorderSuccess: 'Accounts reordered successfully',
            reorderError: 'Failed to reorder accounts'
        },
        tabs: {
            overview: 'Overview',
            consistency: 'Consistency'
        },
        configurator: {
            title: 'Account Configuration for {accountNumber}',
            description: 'Configure the account settings for your prop firm activity',
            template: {
                title: 'Load Template',
                description: 'Quickly load predefined prop firm configurations',
                select: 'Select a template...',
                search: 'Search by prop firm or template...',
                searchPlaceholder: 'Search prop firms or account sizes...',
                noTemplate: 'No template found.',
                noResults: 'No results found',
                noAccountSizes: 'No account sizes found',
                clear: 'Clear Template',
                target: 'Target'
            },
            sections: {
                basicInfo: 'Basic Account Info',
                drawdownRules: 'Drawdown & Trading Rules',
                pricingPayout: 'Pricing & Payout',
                resetDate: 'Reset Date',
                paymentRenewal: 'Payment & Renewal',
                accountReset: 'Account Reset Configuration',
                consistencySettings: 'Consistency'
            },
            fields: {
                accountType: 'Account Type',
                funded: 'Funded',
                challenge: 'Challenge',
                drawdown: 'Drawdown',
                drawdownType: 'Drawdown Type',
                trailingDrawdown: 'Trailing Drawdown',
                trailingStopProfit: 'Trailing Stop Profit',
                trailingType: 'Trailing Type',
                dailyLoss: 'Daily Loss',
                rulesDailyLoss: 'Rules Daily Loss',
                tradingNewsAllowed: 'Trading News Allowed',
                allowNewsTrading: 'Allow News Trading',
                considerBuffer: 'Exclude pre-buffer trades',
                price: 'Price',
                basePrice: 'Base Price',
                promo: 'Promo',
                hasPromo: 'Has Promo',
                promoType: 'Promo Type',
                directPrice: 'Direct Price',
                percentage: 'Percentage',
                activationFees: 'Activation Fees',
                balanceRequired: 'Balance Required',
                minTradingDays: 'Min Trading Days for Payout',
                minPnlToCountAsDay: 'Min PnL to Count as Day',
                propfirmName: 'Prop Firm Name',
                nextPaymentDate: 'Next Payment Date',
                paymentFrequency: 'Payment Frequency',
                autoRenewal: 'Auto Renewal',
                renewalNotification: 'Renewal Notification',
                enableRenewalNotification: 'Enable renewal notifications',
                renewalNoticeInfo: 'You will receive notifications 3 days before renewal',
                renewalNotice: 'Renewal Notice Days',
                autoAdvanceInfo: '💡 This date will automatically advance based on your {frequency} frequency after each renewal notice.',
                customFrequencyWarning: 'If you choose a unique frequency, the payment date will be fixed and not updated automatically.',
                enableConsistencyRule: 'Enable consistency threshold'
            },
            trailingTypes: {
                static: 'Static',
                eod: 'End of Day',
                intraday: 'Intraday'
            },
            rulesDailyLoss: {
                no: 'No',
                lock: 'Lock',
                violation: 'Violation'
            },
            paymentFrequencies: {
                monthly: 'Monthly',
                quarterly: 'Quarterly',
                biannual: 'Bi-annual',
                annual: 'Annual',
                custom: 'Once'
            },
            tooltips: {
                trailingDrawdown: 'Trailing drawdown follows your profits upward but never moves down when you lose money. When enabled with a trailing stop, it stops following profits once you reach the specified profit amount. The calculation can be done intraday (real-time) or end-of-day (computed once daily based on total daily profit/loss).',
                trailingStopProfit: 'Example: If you set $3,000, once you reach $3,000 in profits, the trailing drawdown will stop increasing and lock at that level. This means your stop loss will no longer follow your profits upward beyond this point.',
                minPnlToCountAsDay: 'Minimum PnL required for a day to be counted as a trading day. Days with PnL below this threshold will not count towards minimum trading day requirements.',
                considerBuffer: 'When enabled, metrics and charts ignore trades before accumulated profit reaches the buffer amount.'
            },
            placeholders: {
                enterPrice: 'Enter price',
                enterAmountToLockDrawdown: 'Enter amount to lock drawdown',
                selectPaymentFrequency: 'Select payment frequency',
                selectTrailingType: 'Select trailing type',
                noPaymentDateSet: 'No payment date set'
            },
            suggestions: {
                zeroStartingBalance: '💡 Consider setting a starting balance to track your account performance accurately. A zero balance may affect calculations and statistics.'
            }

        },
        balance: 'Balance',
        target: 'Target',
        drawdown: 'Drawdown',
        accountSize: 'Account Size',
        coherence: 'Coherence',
        startingBalance: 'Starting Balance',
        beforeReset: 'Before Reset',
        afterReset: 'After Reset',
        globalPnl: 'Global P&L',
        accountName: 'Account Name',
        resetDate: {
            cleared: 'Reset date has been cleared',
            title: 'Reset Date',
            description: 'Select a date to reset the account balance',
            clear: 'Clear reset date',
            set: 'Set reset date',
            label: 'Reset Date',
            noDate: 'No reset date',
            info: 'The date when the account balance will be reset',
            shouldConsiderTradesBeforeReset: 'Include trades before reset date',
            shouldConsiderTradesBeforeResetTooltip: 'When enabled, trades before the reset date will be included in calculations and charts. When disabled, only trades after the reset date will be considered.'
        },
        noResetDate: 'No reset date',
        resetDateDescription: 'The date when the account balance will be reset',
        payout: {
            add: 'Add Payout',
            edit: 'Edit Payout',
            addDescription: 'Add a new payout for the account',
            editDescription: 'Edit payout for the account',
            date: 'Payout Date',
            pickDate: 'Pick a date',
            selectDate: 'Select Date',
            selectedDate: 'Selected',
            today: 'Today',
            yesterday: 'Yesterday',
            lastWeek: 'Last Week',
            amount: 'Amount',
            status: 'Status',
            statuses: {
                pending: 'Pending',
                validated: 'Validated',
                refused: 'Refused',
                paid: 'Paid'
            },
            delete: 'Delete Payout',
            save: 'Save Payout',
            update: 'Update Payout',
            success: 'Payout saved',
            successDescription: 'The payout has been saved successfully',
            error: 'Failed to save payout',
            errorDescription: 'An error occurred while saving the payout',
            deleteSuccess: 'Payout deleted',
            deleteSuccessDescription: 'The payout has been deleted successfully',
            deleteError: 'Failed to delete payout',
            deleteErrorDescription: 'An error occurred while deleting the payout',
            updateSuccess: 'Payout updated',
            updateSuccessDescription: 'The payout has been updated successfully',
            updateError: 'Failed to update payout',
            updateErrorDescription: 'An error occurred while updating the payout',
            deleteConfirm: 'Delete payout',
            deleteConfirmDescription: 'Are you sure you want to delete this payout? This action cannot be undone.',
            deleteConfirmButton: 'Yes, delete',
            deleteCancel: 'Cancel'
        },
        dailyStats: {
            title: 'Daily Performance',
            date: 'Date',
            pnl: 'P&L',
            balance: 'Balance',
            target: '% of Target',
            status: 'Status',
            payout: 'Payout',
            payoutAmount: 'Payout Amount',
            payoutStatus: 'Payout Status',
            maxAllowed: 'Max Allowed'
        },
        setup: {
            button: 'Setup',
            message: 'Click to setup account',
            success: 'Account updated',
            error: 'Failed to update account',
            validation: {
                required: 'Please fill in all required fields',
                positive: 'All numeric values must be positive'
            },
            configureFirst: {
                title: 'Configuration Required',
                description: 'Please configure your prop firm account to see detailed statistics.'
            },
            saveFirst: {
                title: 'Save Required',
                description: 'Please save your changes to see updated statistics.'
            }
        },
        status: {
            unprofitable: 'Unprofitable - No consistency check',
            insufficient: 'Insufficient data',
            consistent: 'Consistent trading',
            inconsistent: 'Inconsistent trading',
            needsConfiguration: 'Needs Configuration'
        },
        toast: {
            setupSuccess: 'Account setup successful',
            setupSuccessDescription: 'Your prop firm account has been set up successfully',
            setupError: 'Failed to setup account',
            setupErrorDescription: 'An error occurred while setting up your prop firm account',
            updateSuccess: 'Account updated',
            updateSuccessDescription: 'Your prop firm account has been updated successfully',
            updateError: 'Failed to update',
            updateErrorDescription: 'An error occurred while updating your prop firm account',
            resetDateCleared: 'Reset date cleared',
            resetDateClearedDescription: 'The reset date has been cleared successfully',
            resetDateError: 'Reset date error',
            resetDateErrorDescription: 'An error occurred while updating the reset date',
            validationPositive: 'All numeric values must be positive',
            deleteSuccess: 'Account deleted',
            deleteSuccessDescription: 'The prop firm account has been deleted successfully',
            deleteError: 'Failed to delete account',
            deleteErrorDescription: 'An error occurred while deleting the prop firm account'
        },
        chart: {
            balance: "Balance",
            drawdownLevel: "Drawdown Level",
            profitTarget: "Profit Target",
            tradeNumber: "Trade #{number}",
            balanceAmount: "Balance: ${amount}",
            pnlAmount: "PnL: ${amount}",
            drawdownAmount: "Drawdown Level: ${amount}",
            highestBalance: "Highest Balance: ${amount}",
            startingBalance: "Starting Balance",
            noTrades: "No trades available",
            payout: "Payout",
            payoutAmount: "Payout: ${amount}",
            accountReset: "Account Reset"
        },
        trailingDrawdown: {
            explanation: 'Drawdown will trail profits until this level is reached'
        },
        delete: {
            title: 'Delete Account',
            description: 'Are you sure you want to delete account {account}? This action cannot be undone.',
            success: 'Account deleted successfully',
            successDescription: 'The prop firm account has been deleted',
            error: 'Failed to delete account',
            errorDescription: 'An error occurred while deleting the prop firm account',
            confirm: 'Yes, delete account',
            cancel: 'Cancel'
        },
        renewal: {
            title: 'Account Renewals',
            frequency: 'renewal',
            notification: 'Notifications enabled',
            totalAccounts: 'Total accounts',
            nextRenewal: 'Next renewal',
            account: 'account',
            accounts: 'accounts'
        },
        consistency: {
            title: 'Trading Consistency',
            description: 'Monitor your consistency by ensuring no day exceeds the configured percentage of total profit',
            tooltip: 'A consistent trader should maintain balanced daily profits relative to total profit',
            account: 'Account',
            maxAllowedDailyProfit: 'Maximum Allowed Daily Profit',
            highestDailyProfit: 'Highest Daily Profit',
            status: 'Status',
            insufficientData: 'Insufficient Data',
            consistent: 'Consistent',
            inconsistent: 'Inconsistent (Exceeds Maximum)',
            unprofitable: 'No Profit',
            threshold_settings: {
                title: 'Consistency Threshold',
                description: 'Maximum percentage of total profit allowed in one day',
                currentValue: '{value}% of total profit'
            },
            modal: {
                title: 'Inconsistent Days for Account {account}',
                description: 'Days where profit exceeded maximum allowed daily profit',
                date: 'Date',
                pnl: 'P&L',
                percentageOfTotal: '% of Total Profit'
            }
        },
        table: {
            title: 'Table',
            configurator: 'Configurator'
        },
        common: {
            configure: 'Configure',
            save: 'Save',
            saving: 'Saving...',
            cancel: 'Cancel',
            delete: 'Delete',
            deleting: 'Deleting...'
        },
    }
} as const;