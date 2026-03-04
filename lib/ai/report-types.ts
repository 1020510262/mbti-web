export type ReportType = "basic" | "advanced";
export type PaymentProvider = "alipay" | "wechat";

export type GenerationState =
  | "idle"
  | "creating_order"
  | "paying"
  | "paid"
  | "generating"
  | "ready"
  | "failed";

export interface ProfileInput {
  ageRange?: string;
  occupationCategory?: string;
  lifeStage?: string;
  currentConcern?: string;
  concernText?: string;
}

export interface AIReportContent {
  overallProfile: string;
  careerTendency: string;
  next3MonthsActions: string[];
  riskAlerts: string;
  encouragement: string;
}

export interface AIReport {
  reportNo: string;
  reportType: ReportType;
  content: AIReportContent;
  createdAt: string;
}

export interface CreateOrderResult {
  orderNo: string;
  amountCents: number;
  status: "created" | "paid";
  provider: "alipay" | "wechat" | "mock";
}
