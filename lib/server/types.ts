import { ScoreResult } from "@/lib/mbti/types";
import { AIReportContent, ProfileInput, ReportType } from "@/lib/ai/report-types";

export type Provider = "alipay" | "wechat" | "mock";
export type OrderStatus = "created" | "paid" | "failed" | "refunded";

export interface OrderRecord {
  orderNo: string;
  sessionId: string;
  provider: Provider;
  providerOrderId: string;
  productType: ReportType;
  amountCents: number;
  status: OrderStatus;
  idempotencyKey: string;
  resultSnapshot: ScoreResult;
  createdAt: string;
  paidAt?: string;
  failedReason?: string;
}

export interface ReportRecord {
  reportNo: string;
  orderNo: string;
  sessionId: string;
  reportType: ReportType;
  status: "generating" | "ready" | "failed";
  profileInput?: ProfileInput;
  content?: AIReportContent;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
  idempotencyKey: string;
}

export interface UsageBucket {
  count: number;
  windowStart: number;
  blockUntil?: number;
}
