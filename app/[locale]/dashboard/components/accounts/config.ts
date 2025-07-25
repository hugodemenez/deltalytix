interface AccountSize {
  name: string;
  balance: number;
  price: number;
  priceWithPromo: number;
  evaluation: boolean;
  minDays?: number | 'DIRECTLY FUNDED';
  target: number;
  dailyLoss?: number | null;
  drawdown: number;
  rulesDailyLoss?: 'Violation' | 'No' | 'Lock' | 'DIRECTLY FUNDED';
  trailing?: 'EOD' | 'Intraday' | 'Static' | 'DIRECTLY FUNDED';
  consistency?: number | 'DIRECTLY FUNDED';
  ratioTargetDailyLoss?: number | null;
  ratioTargetDrawdown: number;
  ratioDrawdownPrice: number;
  tradingNewsAllowed: boolean;
  activationFees: number;
  isRecursively: 'Unique' | 'Monthly' | 'No';
  payoutBonus: number;
  profitSharing: number;
  payoutPolicy: string;
  balanceRequired: number;
  minTradingDaysForPayout: number;
  minPayout: number;
  maxPayout: string;
  maxFundedAccounts: number;
  tradingNewsRules?: string;
}

interface PropFirm {
  name: string;
  accountSizes: Record<string, AccountSize>;
}

export const propFirms: Record<string, PropFirm> = {
  earn2trade: {
    name: 'Earn2Trade',
    accountSizes: {
      TCP25: {
        name: 'TCP25',
        balance: 25000,
        price: 150,
        priceWithPromo: 60,
        evaluation: true,
        minDays: 10,
        target: 1750,
        dailyLoss: 550,
        drawdown: 1500,
        rulesDailyLoss: 'Violation',
        trailing: 'EOD',
        consistency: 30,
        ratioTargetDailyLoss: 3.18,
        ratioTargetDrawdown: 1.17,
        ratioDrawdownPrice: 9.17,
        tradingNewsAllowed: true,
        activationFees: 139,
        isRecursively: 'Unique',
        payoutBonus: 0,
        profitSharing: 80,
        payoutPolicy: 'Payout request to Friday\nPayout sent Tuesday',
        balanceRequired: 25239,
        minTradingDaysForPayout: 1,
        minPayout: 500,
        maxPayout: 'No',
        maxFundedAccounts: 3,
      },
      TCP50: {
        name: 'TCP50',
        balance: 50000,
        price: 190,
        priceWithPromo: 76,
        evaluation: true,
        minDays: 10,
        target: 3000,
        dailyLoss: 1100,
        drawdown: 2000,
        rulesDailyLoss: 'Violation',
        trailing: 'EOD',
        consistency: 30,
        ratioTargetDailyLoss: 2.73,
        ratioTargetDrawdown: 1.50,
        ratioDrawdownPrice: 14.47,
        tradingNewsAllowed: true,
        activationFees: 139,
        isRecursively: 'Unique',
        payoutBonus: 0,
        profitSharing: 80,
        payoutPolicy: 'Payout request to Friday\nPayout sent Tuesday',
        balanceRequired: 50239,
        minTradingDaysForPayout: 1,
        minPayout: 500,
        maxPayout: 'No',
        maxFundedAccounts: 3,
      },
      TCP100: {
        name: 'TCP100',
        balance: 100000,
        price: 350,
        priceWithPromo: 140,
        evaluation: true,
        minDays: 10,
        target: 6000,
        dailyLoss: 2200,
        drawdown: 3500,
        rulesDailyLoss: 'Violation',
        trailing: 'EOD',
        consistency: 30,
        ratioTargetDailyLoss: 2.73,
        ratioTargetDrawdown: 1.71,
        ratioDrawdownPrice: 15.71,
        tradingNewsAllowed: true,
        activationFees: 139,
        isRecursively: 'Unique',
        payoutBonus: 0,
        profitSharing: 80,
        payoutPolicy: 'Payout request to Friday\nPayout sent Tuesday',
        balanceRequired: 100239,
        minTradingDaysForPayout: 1,
        minPayout: 500,
        maxPayout: 'No',
        maxFundedAccounts: 3,
      },
    },
  },
  apex: {
    name: 'Apex Trader Funding',
    accountSizes: {
      '25K': {
        name: '25K',
        balance: 25000,
        price: 147,
        priceWithPromo: 15,
        evaluation: true,
        minDays: 7,
        target: 1500,
        dailyLoss: null,
        drawdown: 1500,
        rulesDailyLoss: 'No',
        trailing: 'Intraday',
        consistency: 100,
        ratioTargetDailyLoss: null,
        ratioTargetDrawdown: 1.00,
        ratioDrawdownPrice: 15.05,
        tradingNewsAllowed: true,
        activationFees: 85,
        isRecursively: 'Monthly',
        payoutBonus: 25000,
        profitSharing: 90,
        payoutPolicy: 'Each days +$50',
        balanceRequired: 26600,
        minTradingDaysForPayout: 8,
        minPayout: 500,
        maxPayout: 'No',
        maxFundedAccounts: 20,
      },
      '50K': {
        name: '50K',
        balance: 50000,
        price: 167,
        priceWithPromo: 17,
        evaluation: true,
        minDays: 7,
        target: 3000,
        dailyLoss: null,
        drawdown: 2500,
        rulesDailyLoss: 'No',
        trailing: 'Intraday',
        consistency: 100,
        ratioTargetDailyLoss: null,
        ratioTargetDrawdown: 1.20,
        ratioDrawdownPrice: 24.58,
        tradingNewsAllowed: true,
        activationFees: 85,
        isRecursively: 'Monthly',
        payoutBonus: 25000,
        profitSharing: 90,
        payoutPolicy: 'Each days +$50',
        balanceRequired: 52600,
        minTradingDaysForPayout: 8,
        minPayout: 500,
        maxPayout: 'No',
        maxFundedAccounts: 20,
      },
      '150K': {
        name: '150K',
        balance: 150000,
        price: 297,
        priceWithPromo: 30,
        evaluation: true,
        minDays: 7,
        target: 9000,
        dailyLoss: null,
        drawdown: 5000,
        rulesDailyLoss: 'No',
        trailing: 'Intraday',
        consistency: 100,
        ratioTargetDailyLoss: null,
        ratioTargetDrawdown: 1.80,
        ratioDrawdownPrice: 43.59,
        tradingNewsAllowed: true,
        activationFees: 85,
        isRecursively: 'Monthly',
        payoutBonus: 25000,
        profitSharing: 90,
        payoutPolicy: 'Each days +$50',
        balanceRequired: 155100,
        minTradingDaysForPayout: 8,
        minPayout: 500,
        maxPayout: 'No',
        maxFundedAccounts: 20,
      },
      '250K': {
        name: '250K',
        balance: 250000,
        price: 397,
        priceWithPromo: 40,
        evaluation: true,
        minDays: 7,
        target: 15000,
        dailyLoss: null,
        drawdown: 6500,
        rulesDailyLoss: 'No',
        trailing: 'Intraday',
        consistency: 100,
        ratioTargetDailyLoss: null,
        ratioTargetDrawdown: 2.31,
        ratioDrawdownPrice: 61.08,
        tradingNewsAllowed: true,
        activationFees: 85,
        isRecursively: 'Monthly',
        payoutBonus: 25000,
        profitSharing: 90,
        payoutPolicy: 'Each days +$50',
        balanceRequired: 265100,
        minTradingDaysForPayout: 8,
        minPayout: 500,
        maxPayout: 'No',
        maxFundedAccounts: 20,
      },
      '300K': {
        name: '300K',
        balance: 300000,
        price: 447,
        priceWithPromo: 45,
        evaluation: true,
        minDays: 7,
        target: 20000,
        dailyLoss: null,
        drawdown: 7500,
        rulesDailyLoss: 'No',
        trailing: 'Intraday',
        consistency: 100,
        ratioTargetDailyLoss: null,
        ratioTargetDrawdown: 2.67,
        ratioDrawdownPrice: 59.60,
        tradingNewsAllowed: true,
        activationFees: 85,
        isRecursively: 'Monthly',
        payoutBonus: 25000,
        profitSharing: 90,
        payoutPolicy: 'Each days +$50',
        balanceRequired: 320100,
        minTradingDaysForPayout: 8,
        minPayout: 500,
        maxPayout: 'No',
        maxFundedAccounts: 20,
      },
    },
  },
  topstep: {
    name: 'TopStep',
    accountSizes: {
      '50K': {
        name: '50K',
        balance: 50000,
        price: 165,
        priceWithPromo: 49,
        evaluation: true,
        minDays: 2,
        target: 3000,
        dailyLoss: 1000,
        drawdown: 2000,
        rulesDailyLoss: 'Lock',
        trailing: 'EOD',
        consistency: 50,
        ratioTargetDailyLoss: 3.00,
        ratioTargetDrawdown: 1.50,
        ratioDrawdownPrice: 5.05,
        tradingNewsAllowed: true,
        activationFees: 149,
        isRecursively: 'Unique',
        payoutBonus: 10000,
        profitSharing: 90,
        payoutPolicy: 'Each days +$200',
        balanceRequired: 50150,
        minTradingDaysForPayout: 5,
        minPayout: 250,
        maxPayout: '5 Days Wins => 50% PnL\n30 Days Wins => 100% PnL',
        maxFundedAccounts: 5,
      },
      '100K': {
        name: '100K',
        balance: 100000,
        price: 325,
        priceWithPromo: 99,
        evaluation: true,
        minDays: 2,
        target: 6000,
        dailyLoss: 2000,
        drawdown: 3000,
        rulesDailyLoss: 'Lock',
        trailing: 'EOD',
        consistency: 50,
        ratioTargetDailyLoss: 3.00,
        ratioTargetDrawdown: 2.00,
        ratioDrawdownPrice: 8.06,
        tradingNewsAllowed: true,
        activationFees: 149,
        isRecursively: 'Unique',
        payoutBonus: 10000,
        profitSharing: 90,
        payoutPolicy: 'Each days +$200',
        balanceRequired: 100150,
        minTradingDaysForPayout: 5,
        minPayout: 250,
        maxPayout: '5 Days Wins => 50% PnL\n30 Days Wins => 100% PnL',
        maxFundedAccounts: 5,
      },
      '150K': {
        name: '150K',
        balance: 150000,
        price: 375,
        priceWithPromo: 149,
        evaluation: true,
        minDays: 2,
        target: 9000,
        dailyLoss: 3000,
        drawdown: 4500,
        rulesDailyLoss: 'Lock',
        trailing: 'EOD',
        consistency: 50,
        ratioTargetDailyLoss: 3.00,
        ratioTargetDrawdown: 2.00,
        ratioDrawdownPrice: 10.07,
        tradingNewsAllowed: true,
        activationFees: 149,
        isRecursively: 'Unique',
        payoutBonus: 10000,
        profitSharing: 90,
        payoutPolicy: 'Each days +$200',
        balanceRequired: 150150,
        minTradingDaysForPayout: 5,
        minPayout: 250,
        maxPayout: '5 Days Wins => 50% PnL\n30 Days Wins => 100% PnL',
        maxFundedAccounts: 5,
      },
      // Funded Accounts
      '50K_FUNDED': {
        name: '50K Funded',
        balance: 50000,
        price: 0,
        priceWithPromo: 0,
        evaluation: false,
        minDays: 'DIRECTLY FUNDED',
        target: 0,
        dailyLoss: 1000,
        drawdown: 2000,
        rulesDailyLoss: 'DIRECTLY FUNDED',
        trailing: 'DIRECTLY FUNDED',
        consistency: 'DIRECTLY FUNDED',
        ratioTargetDailyLoss: null,
        ratioTargetDrawdown: 0,
        ratioDrawdownPrice: 0,
        tradingNewsAllowed: true,
        activationFees: 0,
        isRecursively: 'No',
        payoutBonus: 0,
        profitSharing: 90,
        payoutPolicy: 'Weekly payouts available',
        balanceRequired: 0,
        minTradingDaysForPayout: 0,
        minPayout: 0,
        maxPayout: 'No limit',
        maxFundedAccounts: 1,
      },
      '100K_FUNDED': {
        name: '100K Funded',
        balance: 100000,
        price: 0,
        priceWithPromo: 0,
        evaluation: false,
        minDays: 'DIRECTLY FUNDED',
        target: 0,
        dailyLoss: 2000,
        drawdown: 3000,
        rulesDailyLoss: 'DIRECTLY FUNDED',
        trailing: 'DIRECTLY FUNDED',
        consistency: 'DIRECTLY FUNDED',
        ratioTargetDailyLoss: null,
        ratioTargetDrawdown: 0,
        ratioDrawdownPrice: 0,
        tradingNewsAllowed: true,
        activationFees: 0,
        isRecursively: 'No',
        payoutBonus: 0,
        profitSharing: 90,
        payoutPolicy: 'Weekly payouts available',
        balanceRequired: 0,
        minTradingDaysForPayout: 0,
        minPayout: 0,
        maxPayout: 'No limit',
        maxFundedAccounts: 1,
      },
      '150K_FUNDED': {
        name: '150K Funded',
        balance: 150000,
        price: 0,
        priceWithPromo: 0,
        evaluation: false,
        minDays: 'DIRECTLY FUNDED',
        target: 0,
        dailyLoss: 3000,
        drawdown: 4500,
        rulesDailyLoss: 'DIRECTLY FUNDED',
        trailing: 'DIRECTLY FUNDED',
        consistency: 'DIRECTLY FUNDED',
        ratioTargetDailyLoss: null,
        ratioTargetDrawdown: 0,
        ratioDrawdownPrice: 0,
        tradingNewsAllowed: true,
        activationFees: 0,
        isRecursively: 'No',
        payoutBonus: 0,
        profitSharing: 90,
        payoutPolicy: 'Weekly payouts available',
        balanceRequired: 0,
        minTradingDaysForPayout: 0,
        minPayout: 0,
        maxPayout: 'No limit',
        maxFundedAccounts: 1,
      },
    },
  },
  myFundedFutures: {
    name: 'My Funded Futures',
    accountSizes: {
      S50K: {
        name: 'S50K',
        balance: 50000,
        price: 80,
        priceWithPromo: 60,
        evaluation: true,
        minDays: 1,
        target: 3000,
        dailyLoss: 1200,
        drawdown: 2500,
        rulesDailyLoss: 'Lock',
        trailing: 'EOD',
        consistency: 0,
        ratioTargetDailyLoss: 2.50,
        ratioTargetDrawdown: 1.20,
        ratioDrawdownPrice: 20.00,
        tradingNewsAllowed: false,
        activationFees: 0,
        isRecursively: 'No',
        payoutBonus: 10000,
        profitSharing: 90,
        payoutPolicy: 'Each days +$100',
        balanceRequired: 52100,
        minTradingDaysForPayout: 5,
        minPayout: 1000,
        maxPayout: '$1200 < 30 Days',
        maxFundedAccounts: 3,
      },
      S100K: {
        name: 'S100K',
        balance: 100000,
        price: 150,
        priceWithPromo: 113,
        evaluation: true,
        minDays: 1,
        target: 6000,
        dailyLoss: 2400,
        drawdown: 3500,
        rulesDailyLoss: 'Lock',
        trailing: 'EOD',
        consistency: 0,
        ratioTargetDailyLoss: 2.50,
        ratioTargetDrawdown: 1.71,
        ratioDrawdownPrice: 21.33,
        tradingNewsAllowed: false,
        activationFees: 0,
        isRecursively: 'No',
        payoutBonus: 10000,
        profitSharing: 90,
        payoutPolicy: 'Each days +$200',
        balanceRequired: 103100,
        minTradingDaysForPayout: 5,
        minPayout: 2000,
        maxPayout: '$2400 < 30 Days',
        maxFundedAccounts: 3,
      },
      S150K: {
        name: 'S150K',
        balance: 150000,
        price: 220,
        priceWithPromo: 165,
        evaluation: true,
        minDays: 1,
        target: 9000,
        dailyLoss: 3600,
        drawdown: 5000,
        rulesDailyLoss: 'Lock',
        trailing: 'EOD',
        consistency: 0,
        ratioTargetDailyLoss: 2.50,
        ratioTargetDrawdown: 1.80,
        ratioDrawdownPrice: 21.82,
        tradingNewsAllowed: false,
        activationFees: 0,
        isRecursively: 'No',
        payoutBonus: 10000,
        profitSharing: 90,
        payoutPolicy: 'Each days +$300',
        balanceRequired: 154600,
        minTradingDaysForPayout: 5,
        minPayout: 3000,
        maxPayout: '$3600 < 30 Days',
        maxFundedAccounts: 3,
      },
      E50K: {
        name: 'E50K',
        balance: 50000,
        price: 165,
        priceWithPromo: 124,
        evaluation: true,
        minDays: 1,
        target: 4000,
        dailyLoss: null,
        drawdown: 2000,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 0,
        ratioTargetDailyLoss: null,
        ratioTargetDrawdown: 2.00,
        ratioDrawdownPrice: 16.16,
        tradingNewsAllowed: false,
        activationFees: 0,
        isRecursively: 'No',
        payoutBonus: 10000,
        profitSharing: 90,
        payoutPolicy: 'Each days +$100',
        balanceRequired: 52100,
        minTradingDaysForPayout: 5,
        minPayout: 1000,
        maxPayout: 'You can request a payout of 60% of profits before reaching the full Buffer Zone',
        maxFundedAccounts: 3,
      },
      E100K: {
        name: 'E100K',
        balance: 100000,
        price: 265,
        priceWithPromo: 199,
        evaluation: true,
        minDays: 1,
        target: 8000,
        dailyLoss: null,
        drawdown: 3000,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 0,
        ratioTargetDailyLoss: null,
        ratioTargetDrawdown: 2.67,
        ratioDrawdownPrice: 15.09,
        tradingNewsAllowed: false,
        activationFees: 0,
        isRecursively: 'No',
        payoutBonus: 10000,
        profitSharing: 90,
        payoutPolicy: 'Each days +$200',
        balanceRequired: 103100,
        minTradingDaysForPayout: 5,
        minPayout: 2000,
        maxPayout: 'You can request a payout of 60% of profits before reaching the full Buffer Zone',
        maxFundedAccounts: 3,
      },
      E150K: {
        name: 'E150K',
        balance: 150000,
        price: 375,
        priceWithPromo: 281,
        evaluation: true,
        minDays: 1,
        target: 12000,
        dailyLoss: null,
        drawdown: 4500,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 0,
        ratioTargetDailyLoss: null,
        ratioTargetDrawdown: 2.67,
        ratioDrawdownPrice: 16.00,
        tradingNewsAllowed: false,
        activationFees: 0,
        isRecursively: 'No',
        payoutBonus: 10000,
        profitSharing: 90,
        payoutPolicy: 'Each days +$300',
        balanceRequired: 154600,
        minTradingDaysForPayout: 5,
        minPayout: 3000,
        maxPayout: 'You can request a payout of 60% of profits before reaching the full Buffer Zone',
        maxFundedAccounts: 3,
      },
      M50K: {
        name: 'M50K',
        balance: 50000,
        price: 445,
        priceWithPromo: 401,
        evaluation: true,
        minDays: 1,
        target: 3000,
        dailyLoss: 0,
        drawdown: 2000,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 0,
        ratioTargetDailyLoss: 0,
        ratioTargetDrawdown: 1.50,
        ratioDrawdownPrice: 4.99,
        tradingNewsAllowed: false,
        activationFees: 0,
        isRecursively: 'No',
        payoutBonus: 10000,
        profitSharing: 90,
        payoutPolicy: 'Each days +$100',
        balanceRequired: 53000,
        minTradingDaysForPayout: 5,
        minPayout: 1000,
        maxPayout: 'You can request a payout of 60% of profits before reaching the full Buffer Zone',
        maxFundedAccounts: 3,
      },
      M100K: {
        name: 'M100K',
        balance: 100000,
        price: 555,
        priceWithPromo: 500,
        evaluation: true,
        minDays: 1,
        target: 6000,
        dailyLoss: 0,
        drawdown: 3000,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 0,
        ratioTargetDailyLoss: 0,
        ratioTargetDrawdown: 2.00,
        ratioDrawdownPrice: 6.01,
        tradingNewsAllowed: false,
        activationFees: 0,
        isRecursively: 'No',
        payoutBonus: 10000,
        profitSharing: 90,
        payoutPolicy: 'Each days +$200',
        balanceRequired: 106000,
        minTradingDaysForPayout: 5,
        minPayout: 2000,
        maxPayout: 'You can request a payout of 60% of profits before reaching the full Buffer Zone',
        maxFundedAccounts: 3,
      },
      M150K: {
        name: 'M150K',
        balance: 150000,
        price: 665,
        priceWithPromo: 599,
        evaluation: true,
        minDays: 1,
        target: 9000,
        dailyLoss: 0,
        drawdown: 4500,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 0,
        ratioTargetDailyLoss: 0,
        ratioTargetDrawdown: 2.00,
        ratioDrawdownPrice: 7.52,
        tradingNewsAllowed: false,
        activationFees: 0,
        isRecursively: 'No',
        payoutBonus: 10000,
        profitSharing: 90,
        payoutPolicy: 'Each days +$300',
        balanceRequired: 159000,
        minTradingDaysForPayout: 5,
        minPayout: 3000,
        maxPayout: 'You can request a payout of 60% of profits before reaching the full Buffer Zone',
        maxFundedAccounts: 3,
      },
    },
  },

  bulenox: {
    name: 'Bulenox',
    accountSizes: {
      '25K': {
        name: '25K',
        balance: 25000,
        price: 151,
        priceWithPromo: 76,
        evaluation: true,
        minDays: 1,
        target: 1500,
        dailyLoss: 500,
        drawdown: 1200,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 30,
        ratioTargetDailyLoss: 3.00,
        ratioTargetDrawdown: 1.25,
        ratioDrawdownPrice: 15.89,
        tradingNewsAllowed: true,
        activationFees: 0,
        isRecursively: 'Unique',
        payoutBonus: 0,
        profitSharing: 90,
        payoutPolicy: 'Same Day',
        balanceRequired: 26500,
        minTradingDaysForPayout: 3,
        minPayout: 250,
        maxPayout: 'No',
        maxFundedAccounts: 5,
      },
      '50K': {
        name: '50K',
        balance: 50000,
        price: 204,
        priceWithPromo: 102,
        evaluation: true,
        minDays: 1,
        target: 3000,
        dailyLoss: 1000,
        drawdown: 2500,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 30,
        ratioTargetDailyLoss: 3.00,
        ratioTargetDrawdown: 1.20,
        ratioDrawdownPrice: 19.61,
        tradingNewsAllowed: true,
        activationFees: 0,
        isRecursively: 'Unique',
        payoutBonus: 0,
        profitSharing: 90,
        payoutPolicy: 'Same Day',
        balanceRequired: 52100,
        minTradingDaysForPayout: 3,
        minPayout: 250,
        maxPayout: 'No',
        maxFundedAccounts: 5,
      },
      '75K': {
        name: '75K',
        balance: 75000,
        price: 245,
        priceWithPromo: 123,
        evaluation: true,
        minDays: 1,
        target: 4500,
        dailyLoss: 1500,
        drawdown: 3000,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 30,
        ratioTargetDailyLoss: 3.00,
        ratioTargetDrawdown: 1.50,
        ratioDrawdownPrice: 24.49,
        tradingNewsAllowed: true,
        activationFees: 0,
        isRecursively: 'Unique',
        payoutBonus: 0,
        profitSharing: 90,
        payoutPolicy: 'Same Day',
        balanceRequired: 77600,
        minTradingDaysForPayout: 3,
        minPayout: 250,
        maxPayout: 'No',
        maxFundedAccounts: 5,
      },
      '100K': {
        name: '100K',
        balance: 100000,
        price: 305,
        priceWithPromo: 153,
        evaluation: true,
        minDays: 1,
        target: 6000,
        dailyLoss: 2000,
        drawdown: 2500,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 30,
        ratioTargetDailyLoss: 3.00,
        ratioTargetDrawdown: 2.40,
        ratioDrawdownPrice: 16.39,
        tradingNewsAllowed: true,
        activationFees: 0,
        isRecursively: 'Unique',
        payoutBonus: 0,
        profitSharing: 90,
        payoutPolicy: 'Same Day',
        balanceRequired: 103100,
        minTradingDaysForPayout: 3,
        minPayout: 250,
        maxPayout: 'No',
        maxFundedAccounts: 5,
      },
      '150K': {
        name: '150K',
        balance: 150000,
        price: 215,
        priceWithPromo: 108,
        evaluation: true,
        minDays: 1,
        target: 3000,
        dailyLoss: 1000,
        drawdown: 1000,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 0,
        ratioTargetDailyLoss: 3.00,
        ratioTargetDrawdown: 3.00,
        ratioDrawdownPrice: 9.30,
        tradingNewsAllowed: true,
        activationFees: 0,
        isRecursively: 'Unique',
        payoutBonus: 0,
        profitSharing: 90,
        payoutPolicy: 'Same Day',
        balanceRequired: 152000,
        minTradingDaysForPayout: 0,
        minPayout: 250,
        maxPayout: 'No',
        maxFundedAccounts: 5,
      },
      '200K': {
        name: '200K',
        balance: 200000,
        price: 395,
        priceWithPromo: 198,
        evaluation: true,
        minDays: 1,
        target: 6000,
        dailyLoss: 2000,
        drawdown: 2000,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 0,
        ratioTargetDailyLoss: 3.00,
        ratioTargetDrawdown: 3.00,
        ratioDrawdownPrice: 10.13,
        tradingNewsAllowed: true,
        activationFees: 0,
        isRecursively: 'Unique',
        payoutBonus: 0,
        profitSharing: 90,
        payoutPolicy: 'Same Day',
        balanceRequired: 203000,
        minTradingDaysForPayout: 0,
        minPayout: 250,
        maxPayout: 'No',
        maxFundedAccounts: 5,
      },
      '300K': {
        name: '300K',
        balance: 300000,
        price: 450,
        priceWithPromo: 225,
        evaluation: true,
        minDays: 1,
        target: 20000,
        dailyLoss: 5000,
        drawdown: 5000,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 0,
        ratioTargetDailyLoss: 4.00,
        ratioTargetDrawdown: 4.00,
        ratioDrawdownPrice: 22.22,
        tradingNewsAllowed: true,
        activationFees: 0,
        isRecursively: 'Unique',
        payoutBonus: 0,
        profitSharing: 90,
        payoutPolicy: 'Same Day',
        balanceRequired: 303500,
        minTradingDaysForPayout: 0,
        minPayout: 250,
        maxPayout: 'No',
        maxFundedAccounts: 5,
      },
    },
  },
  phidias: {
    name: 'Phidias Propfirm',
    accountSizes: {
      '25K': {
        name: '25K',
        balance: 25000,
        price: 145,
        priceWithPromo: 13,
        evaluation: true,
        minDays: 1,
        target: 1500,
        dailyLoss: 600,
        drawdown: 1500,
        rulesDailyLoss: 'No',
        trailing: 'Static',
        consistency: 100,
        ratioTargetDailyLoss: 2.50,
        ratioTargetDrawdown: 1.00,
        ratioDrawdownPrice: 9.61,
        tradingNewsAllowed: true,
        activationFees: 0,
        isRecursively: 'Unique',
        payoutBonus: 0,
        profitSharing: 90,
        payoutPolicy: 'Same Day',
        balanceRequired: 26600,
        minTradingDaysForPayout: 10,
        minPayout: 250,
        maxPayout: 'No',
        maxFundedAccounts: 5,
      },
      '50K': {
        name: '50K',
        balance: 50000,
        price: 175,
        priceWithPromo: 16,
        evaluation: true,
        minDays: 1,
        target: 4000,
        dailyLoss: 1000,
        drawdown: 2500,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 30,
        ratioTargetDailyLoss: 3.00,
        ratioTargetDrawdown: 1.20,
        ratioDrawdownPrice: 15.27,
        tradingNewsAllowed: true,
        activationFees: 0,
        isRecursively: 'Unique',
        payoutBonus: 0,
        profitSharing: 90,
        payoutPolicy: 'Same Day',
        balanceRequired: 52600,
        minTradingDaysForPayout: 10,
        minPayout: 250,
        maxPayout: 'No',
        maxFundedAccounts: 5,
      },
      '100K': {
        name: '100K',
        balance: 100000,
        price: 215,
        priceWithPromo: 19,
        evaluation: true,
        minDays: 1,
        target: 6000,
        dailyLoss: 1500,
        drawdown: 3000,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 30,
        ratioTargetDailyLoss: 3.00,
        ratioTargetDrawdown: 2.00,
        ratioDrawdownPrice: 11.22,
        tradingNewsAllowed: true,
        activationFees: 0,
        isRecursively: 'Unique',
        payoutBonus: 0,
        profitSharing: 90,
        payoutPolicy: 'Same Day',
        balanceRequired: 103100,
        minTradingDaysForPayout: 10,
        minPayout: 250,
        maxPayout: 'No',
        maxFundedAccounts: 5,
      },
      '150K': {
        name: '150K',
        balance: 150000,
        price: 325,
        priceWithPromo: 29,
        evaluation: true,
        minDays: 1,
        target: 9000,
        dailyLoss: 2000,
        drawdown: 4500,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 30,
        ratioTargetDailyLoss: 3.00,
        ratioTargetDrawdown: 2.00,
        ratioDrawdownPrice: 8.53,
        tradingNewsAllowed: true,
        activationFees: 0,
        isRecursively: 'Unique',
        payoutBonus: 0,
        profitSharing: 90,
        payoutPolicy: 'Same Day',
        balanceRequired: 154600,
        minTradingDaysForPayout: 10,
        minPayout: 250,
        maxPayout: 'No',
        maxFundedAccounts: 5,
      },
    },
  },
  takeProfitTrader: {
    name: "Take Profit Trader",
    accountSizes: {
      "25K": {
        name: "$25K",
        balance: 25000,
        price: 150,
        priceWithPromo: 150,
        evaluation: true,
        minDays: 5,
        target: 1500,
        dailyLoss: null,
        drawdown: 1500,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 50,
        ratioTargetDailyLoss: null,
        ratioTargetDrawdown: 1,
        ratioDrawdownPrice: 10,
        tradingNewsAllowed: false,
        activationFees: 0,
        isRecursively: 'Monthly',
        payoutBonus: 0,
        profitSharing: 80,
        payoutPolicy: "Bi-weekly payouts once funded and consistent.",
        balanceRequired: 0,
        minTradingDaysForPayout: 10,
        minPayout: 100,
        maxPayout: "Unlimited",
        maxFundedAccounts: 1,
        tradingNewsRules: "No trading bots. Max profit day must be ≤ 50% of total profit."
      },
      "50K": {
        name: "$50K",
        balance: 50000,
        price: 170,
        priceWithPromo: 170,
        evaluation: true,
        minDays: 5,
        target: 3000,
        dailyLoss: null,
        drawdown: 2000,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 50,
        ratioTargetDailyLoss: null,
        ratioTargetDrawdown: 1.5,
        ratioDrawdownPrice: 11.76,
        tradingNewsAllowed: false,
        activationFees: 0,
        isRecursively: 'Monthly',
        payoutBonus: 0,
        profitSharing: 80,
        payoutPolicy: "Bi-weekly payouts once funded and consistent.",
        balanceRequired: 0,
        minTradingDaysForPayout: 10,
        minPayout: 100,
        maxPayout: "Unlimited",
        maxFundedAccounts: 1,
        tradingNewsRules: "No trading bots. Max profit day must be ≤ 50% of total profit."
      },
      "75K": {
        name: "$75K",
        balance: 75000,
        price: 245,
        priceWithPromo: 245,
        evaluation: true,
        minDays: 5,
        target: 4500,
        dailyLoss: null,
        drawdown: 2500,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 50,
        ratioTargetDailyLoss: null,
        ratioTargetDrawdown: 1.8,
        ratioDrawdownPrice: 10.2,
        tradingNewsAllowed: false,
        activationFees: 0,
        isRecursively: 'Monthly',
        payoutBonus: 0,
        profitSharing: 80,
        payoutPolicy: "Bi-weekly payouts once funded and consistent.",
        balanceRequired: 0,
        minTradingDaysForPayout: 10,
        minPayout: 100,
        maxPayout: "Unlimited",
        maxFundedAccounts: 1,
        tradingNewsRules: "No trading bots. Max profit day must be ≤ 50% of total profit."
      },
      "100K": {
        name: "$100K",
        balance: 100000,
        price: 330,
        priceWithPromo: 330,
        evaluation: true,
        minDays: 5,
        target: 6000,
        dailyLoss: null,
        drawdown: 3000,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 50,
        ratioTargetDailyLoss: null,
        ratioTargetDrawdown: 2,
        ratioDrawdownPrice: 9.09,
        tradingNewsAllowed: false,
        activationFees: 0,
        isRecursively: 'Monthly',
        payoutBonus: 0,
        profitSharing: 80,
        payoutPolicy: "Bi-weekly payouts once funded and consistent.",
        balanceRequired: 0,
        minTradingDaysForPayout: 10,
        minPayout: 100,
        maxPayout: "Unlimited",
        maxFundedAccounts: 1,
        tradingNewsRules: "No trading bots. Max profit day must be ≤ 50% of total profit."
      },
      "150K": {
        name: "$150K",
        balance: 150000,
        price: 360,
        priceWithPromo: 360,
        evaluation: true,
        minDays: 5,
        target: 9000,
        dailyLoss: null,
        drawdown: 4500,
        rulesDailyLoss: 'No',
        trailing: 'EOD',
        consistency: 50,
        ratioTargetDailyLoss: null,
        ratioTargetDrawdown: 2,
        ratioDrawdownPrice: 8,
        tradingNewsAllowed: false,
        activationFees: 0,
        isRecursively: 'Monthly',
        payoutBonus: 0,
        profitSharing: 80,
        payoutPolicy: "Bi-weekly payouts once funded and consistent.",
        balanceRequired: 0,
        minTradingDaysForPayout: 10,
        minPayout: 100,
        maxPayout: "Unlimited",
        maxFundedAccounts: 1,
        tradingNewsRules: "No trading bots. Max profit day must be ≤ 50% of total profit."
      },
    }
  },
};

export type { AccountSize, PropFirm };
