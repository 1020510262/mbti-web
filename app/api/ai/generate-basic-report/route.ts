import { NextRequest } from "next/server";
import { generateReportContent } from "@/lib/server/model-adapter";
import { bootstrapStore, getStore, persistStore } from "@/lib/server/store";
import { checkLimit, ensureString, getSessionId, jsonErr, jsonOk, makeNo, nowIso } from "@/lib/server/helpers";
import { ReportRecord } from "@/lib/server/types";

interface Body {
  orderNo?: string;
  idempotencyKey?: string;
}

export async function POST(req: NextRequest) {
  await bootstrapStore();
  const sessionId = getSessionId(req);
  if (!sessionId) return jsonErr(1002, "missing session id", 401);

  const limit = checkLimit(sessionId, "generate_basic", 3, 10 * 60_000);
  if (!limit.ok) return jsonErr(3001, `rate limited, retry in ${limit.retryAfterSec}s`, 429);

  const body = (await req.json()) as Body;
  const orderNo = ensureString(body.orderNo);
  const idempotencyKey = ensureString(body.idempotencyKey);
  if (!orderNo || !idempotencyKey) {
    return jsonErr(1001, "orderNo and idempotencyKey required");
  }

  const store = getStore();
  const idemReportNo = store.reportByIdempotency.get(idempotencyKey);
  if (idemReportNo) {
    const idemReport = store.reports.get(idemReportNo);
    if (!idemReport) return jsonErr(5002, "idempotency report missing", 500);
    return jsonOk({ reportNo: idemReport.reportNo, status: idemReport.status, reportType: idemReport.reportType });
  }

  const order = store.orders.get(orderNo);
  if (!order) return jsonErr(2001, "order not found", 404);
  if (order.sessionId !== sessionId) return jsonErr(1002, "session mismatch", 403);
  if (order.status !== "paid") return jsonErr(2002, "order not paid", 403);
  if (order.productType !== "basic") return jsonErr(2003, "invalid order product for basic", 400);

  const existingKey = `${orderNo}:basic`;
  const existingReportNo = store.reportByOrderAndType.get(existingKey);
  if (existingReportNo) {
    const existing = store.reports.get(existingReportNo);
    if (existing?.status === "ready") {
      store.reportByIdempotency.set(idempotencyKey, existingReportNo);
      return jsonOk({ reportNo: existing.reportNo, status: existing.status, reportType: existing.reportType });
    }
  }

  const reportNo = makeNo("RPTB");
  const record: ReportRecord = {
    reportNo,
    orderNo,
    sessionId,
    reportType: "basic",
    status: "generating",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    idempotencyKey
  };

  store.reports.set(reportNo, record);
  store.reportByOrderAndType.set(existingKey, reportNo);
  store.reportByIdempotency.set(idempotencyKey, reportNo);
  await persistStore();

  try {
    const content = await generateReportContent({
      result: order.resultSnapshot,
      reportType: "basic"
    });
    record.content = content;
    record.status = "ready";
    record.updatedAt = nowIso();
    await persistStore();
  } catch (error) {
    record.status = "failed";
    record.errorMessage = error instanceof Error ? error.message : "generate basic failed";
    record.updatedAt = nowIso();
    await persistStore();
    return jsonErr(5001, "model generate failed", 500);
  }

  return jsonOk({ reportNo: record.reportNo, status: record.status, reportType: record.reportType });
}
