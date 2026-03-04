export const PAYMENT_CONFIG = {
  mode: (process.env.NEXT_PUBLIC_PAYMENT_MODE ?? "mock") as "mock" | "provider",
  providers: {
    alipay: {
      enabled: true,
      createOrderPath: "/api/pay/create-order",
      webhookPath: "/api/pay/webhook"
    },
    wechat: {
      enabled: true,
      createOrderPath: "/api/pay/create-order",
      webhookPath: "/api/pay/webhook"
    }
  }
} as const;
