export interface IRequestTokenPayload {
    rechargeAmount: number;
}

export interface IRechargeTokenPayload {
    TokenNo: string;
}

export interface IReportOutagePayload {
    OutageSeverity: string;
    issueTitle?: string;
    description?: string;
    outageStartTime?: Date | string;
    isOngoing?: boolean;
    address?: string;
}
