export interface StatisticsProps {
  cumulativeFees: number;
  cumulativePnl: number;
  winningStreak: number;
  winRate: number;
  nbTrades: number;
  nbBe: number;
  nbWin: number;
  nbLoss: number;
  totalPositionTime: number;
  averagePositionTime: string;
  profitFactor: number;
  grossLosses: number;
  grossWin: number;
  // Payout statistics
  totalPayouts: number;
  nbPayouts: number;
}
