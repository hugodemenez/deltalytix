export interface PropFirmAccount {
  id: string
  accountNumber: string
  accountName: string
  balanceSetDate: Date
  balanceSetAmount: number
  profitTarget: number
  drawdownThreshold: number
  isPerformance: boolean
  startingBalance: number
} 