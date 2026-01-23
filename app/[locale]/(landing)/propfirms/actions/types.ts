export interface PropfirmPayoutStats {
  propfirmName: string;
  pendingAmount: number;
  pendingCount: number;
  refusedAmount: number;
  refusedCount: number;
  paidAmount: number;
  paidCount: number;
}

export interface PropfirmCatalogueStats {
  propfirmName: string;
  accountsCount: number;
  payouts: PropfirmPayoutStats;
}

export interface PropfirmCatalogueData {
  stats: PropfirmCatalogueStats[];
}