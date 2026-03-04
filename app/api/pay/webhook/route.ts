import { NextRequest } from "next/server";
import { bootstrapStore, getStore, persistStore } from "@/lib/server/store";
import { jsonErr, jsonOk, nowIso } from "@/lib/server/helpers";

interface Body {
  provider?: "alipay" | "wechat" | "mock";
  orderNo?: string;
  providerOrderId?: string;
  tradeStatus?: "SUCCESS" | "FAILED";
  sign?: string;
}

function verifySignature(body: Body): boolean {
  // Test mode signature; replace with provider RSA verify in production.
  return body.sign === "mock-sign";
}

export async function POST(req: NextRequest) {
  await bootstrapStore();
  const body = (await req.json()) as Body;
  if (!body.orderNo || !body.tradeStatus) {
    return jsonErr(1001, "invalid payload");
  }

  if (!verifySignature(body)) {
    return jsonErr(4002, "invalid signature", 401);
  }

  const store = getStore();
  const order = store.orders.get(body.orderNo);
  if (!order) return jsonErr(2001, "order not found", 404);

  // Idempotent callback handling.
  if (order.status === "paid" && body.tradeStatus === "SUCCESS") {
    return jsonOk({ orderNo: order.orderNo, status: order.status });
  }

  if (body.tradeStatus === "SUCCESS") {
    order.status = "paid";
    order.paidAt = nowIso();
    if (body.providerOrderId) order.providerOrderId = body.providerOrderId;
  } else {
    order.status = "failed";
    order.failedReason = "provider failed";
  }
  await persistStore();

  return jsonOk({ orderNo: order.orderNo, status: order.status });
}
