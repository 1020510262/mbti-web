import { PAYMENT_CONFIG } from "@/lib/config/payment";
import { MODEL_CONFIG } from "@/lib/config/model";
import { bootstrapStore, getStore } from "@/lib/server/store";

export async function GET() {
  await bootstrapStore();
  const store = getStore();

  return Response.json({
    code: 0,
    data: {
      status: "ok",
      paymentMode: PAYMENT_CONFIG.mode,
      modelConfigured: Boolean(MODEL_CONFIG.baseUrl && process.env.MODEL_API_KEY && MODEL_CONFIG.modelName),
      counts: {
        orders: store.orders.size,
        reports: store.reports.size,
        usageBuckets: store.usage.size
      },
      timestamp: new Date().toISOString()
    }
  });
}
