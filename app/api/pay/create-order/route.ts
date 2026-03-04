import { NextRequest } from "next/server";
import { ScoreResult } from "@/lib/mbti/types";
import { getDisplayPriceCents } from "@/lib/config/pricing";
import { bootstrapStore, getStore, persistStore } from "@/lib/server/store";
import { checkLimit, ensureString, getSessionId, jsonErr, jsonOk, makeNo, nowIso } from "@/lib/server/helpers";
import { OrderRecord } from "@/lib/server/types";

interface Body {
  productType?: "basic" | "advanced";
  provider?: "alipay" | "wechat";
  idempotencyKey?: string;
  resultSnapshot?: ScoreResult;
}

export async function POST(req: NextRequest) {
  await bootstrapStore();
  const sessionId = getSessionId(req);
  if (!sessionId) return jsonErr(1002, "missing session id", 401);

  const limit = checkLimit(sessionId, "create_order", 5, 10 * 60_000);
  if (!limit.ok) return jsonErr(3001, `rate limited, retry in ${limit.retryAfterSec}s`, 429);

  const body = (await req.json()) as Body;
  const productType = body.productType;
  const provider = body.provider;
  const idempotencyKey = ensureString(body.idempotencyKey);

  if (!productType || (productType !== "basic" && productType !== "advanced")) {
    return jsonErr(1001, "invalid productType");
  }
  if (!provider || (provider !== "alipay" && provider !== "wechat")) {
    return jsonErr(1001, "invalid provider");
  }
  if (!idempotencyKey) {
    return jsonErr(1001, "idempotencyKey required");
  }
  if (!body.resultSnapshot) {
    return jsonErr(1001, "resultSnapshot required");
  }

  const store = getStore();
  const existingOrderNo = store.orderByIdempotency.get(idempotencyKey);
  if (existingOrderNo) {
    const existing = store.orders.get(existingOrderNo);
    if (!existing) return jsonErr(2001, "order not found", 404);
    return jsonOk({
      orderNo: existing.orderNo,
      amountCents: existing.amountCents,
      status: existing.status,
      provider: existing.provider,
      payMode: "mock",
      payParams: {}
    });
  }

  const orderNo = makeNo("ORD");
  const record: OrderRecord = {
    orderNo,
    sessionId,
    provider,
    providerOrderId: makeNo("PVD"),
    productType,
    amountCents: getDisplayPriceCents(productType),
    status: "created",
    idempotencyKey,
    resultSnapshot: body.resultSnapshot,
    createdAt: nowIso()
  };

  store.orders.set(orderNo, record);
  store.orderByIdempotency.set(idempotencyKey, orderNo);
  await persistStore();

  return jsonOk({
    orderNo,
    amountCents: record.amountCents,
    status: record.status,
    provider: record.provider,
    payMode: "mock",
    payParams: {}
  });
}
