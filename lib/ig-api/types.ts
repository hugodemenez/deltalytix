export type IgApiEnvironment = "live" | "demo";

export interface IgApiSessionTokens {
  cst: string;
  securityToken: string;
}

export interface IgApiAccount {
  accountId: string;
  accountName: string;
  accountType?: string;
  preferred?: boolean;
  currency?: string;
}

export interface IgApiTransaction {
  cashTransaction: boolean;
  closeLevel: string;
  currency: string;
  date: string;
  dateUtc: string;
  instrumentName: string;
  openDateUtc: string;
  openLevel: string;
  period: string;
  profitAndLoss: string;
  reference: string;
  size: string;
  transactionType: string;
}

export interface IgApiErrorBody {
  errorCode?: string;
  error?: string;
  message?: string;
}

export class IgApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "IgApiError";
  }
}

export function igApiBaseUrl(environment: IgApiEnvironment): string {
  return environment === "demo"
    ? "https://demo-api.ig.com/gateway/deal"
    : "https://api.ig.com/gateway/deal";
}
