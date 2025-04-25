export interface PropFirmAccount {
  id: string
  accountNumber: string
  balanceToDate: number
  profitTarget: number
  drawdownThreshold: number
  isPerformance: boolean
  startingBalance: number
  propfirm: string
  lastBalanceUpdate?: Date
  lastBalanceAmount?: number
  payouts: Array<{
    id: string
    amount: number
    date: Date
    status: string
  }>
  trailingDrawdown: boolean
  trailingStopProfit: number
  resetDate: Date | null | undefined
  consistencyPercentage: number
  accountSize?: string
  accountSizeName?: string
  price?: number
  priceWithPromo?: number
  evaluation?: boolean
  minDays?: number
  dailyLoss?: number
  rulesDailyLoss?: string
  trailing?: string
  tradingNewsAllowed?: boolean
  activationFees?: number
  isRecursively?: string
  payoutBonus?: number
  profitSharing?: number
  payoutPolicy?: string
  balanceRequired?: number
  minTradingDaysForPayout?: number
  minPayout?: number
  maxPayout?: string
  maxFundedAccounts?: number
}
