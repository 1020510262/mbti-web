import { NextRequest } from "next/server";
import { bootstrapStore, getStore } from "@/lib/server/store";
import { getSessionId, jsonErr, jsonOk } from "@/lib/server/helpers";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await bootstrapStore();
  const sessionId = getSessionId(req);
  if (!sessionId) return jsonErr(1002, "missing session id", 401);

  const { id } = await ctx.params;
  const store = getStore();
  const report = store.reports.get(id);
  if (!report) return jsonErr(2001, "report not found", 404);
  if (report.sessionId !== sessionId) return jsonErr(1002, "session mismatch", 403);

  return jsonOk({
    reportNo: report.reportNo,
    status: report.status,
    reportType: report.reportType,
    content: report.content,
    createdAt: report.createdAt
  });
}
