import { ScoreResult } from "@/lib/mbti/types";
import { PAYMENT_CONFIG } from "@/lib/config/payment";
import { AIReport, CreateOrderResult, PaymentProvider, ProfileInput } from "@/lib/ai/report-types";

const SESSION_KEY = "mbti_v2_session_id";

function makeSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server_session";
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const sessionId = makeSessionId();
  window.localStorage.setItem(SESSION_KEY, sessionId);
  return sessionId;
}

async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  const sessionId = getOrCreateSessionId();
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-session-id": sessionId
    },
    body: JSON.stringify(payload)
  });

  const json = await res.json();
  if (!res.ok || json?.code !== 0) {
    throw new Error(json?.message || `request failed: ${path}`);
  }
  return json.data as T;
}

async function apiGet<T>(path: string): Promise<T> {
  const sessionId = getOrCreateSessionId();
  const res = await fetch(path, {
    method: "GET",
    headers: {
      "x-session-id": sessionId
    }
  });

  const json = await res.json();
  if (!res.ok || json?.code !== 0) {
    throw new Error(json?.message || `request failed: ${path}`);
  }
  return json.data as T;
}

async function withOneRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 900));
    return fn();
  }
}

export async function createOrder(params: {
  productType: "basic" | "advanced";
  provider: PaymentProvider;
  resultSnapshot: ScoreResult;
}): Promise<CreateOrderResult> {
  return apiPost<CreateOrderResult>("/api/pay/create-order", {
    productType: params.productType,
    provider: params.provider,
    resultSnapshot: params.resultSnapshot,
    idempotencyKey: `order_${params.productType}_${Date.now()}`
  });
}

export async function confirmPayment(orderNo: string, provider: PaymentProvider): Promise<{ paid: boolean; orderNo: string }> {
  if (PAYMENT_CONFIG.mode !== "mock") {
    // In provider mode this should be queried by order status API after callback.
    return { paid: false, orderNo };
  }

  await apiPost<{ orderNo: string; status: string }>("/api/pay/webhook", {
    provider,
    orderNo,
    providerOrderId: `MOCK_${Date.now()}`,
    tradeStatus: "SUCCESS",
    sign: "mock-sign"
  });

  return { paid: true, orderNo };
}

export async function generateBasicReport(orderNo: string): Promise<AIReport> {
  const basic = await withOneRetry(() =>
    apiPost<{ reportNo: string }>("/api/ai/generate-basic-report", {
      orderNo,
      idempotencyKey: `gen_basic_${orderNo}`
    })
  );

  return apiGet<AIReport>(`/api/report/${basic.reportNo}`);
}

export async function generateAdvancedReport(orderNo: string, profileInput: ProfileInput): Promise<AIReport> {
  const advanced = await withOneRetry(() =>
    apiPost<{ reportNo: string }>("/api/ai/generate-advanced-report", {
      orderNo,
      profileInput,
      idempotencyKey: `gen_advanced_${orderNo}`
    })
  );

  return apiGet<AIReport>(`/api/report/${advanced.reportNo}`);
}
