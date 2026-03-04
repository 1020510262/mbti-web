import { OrderRecord, ReportRecord, UsageBucket } from "@/lib/server/types";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type Store = {
  orders: Map<string, OrderRecord>;
  reports: Map<string, ReportRecord>;
  reportByOrderAndType: Map<string, string>;
  orderByIdempotency: Map<string, string>;
  reportByIdempotency: Map<string, string>;
  usage: Map<string, UsageBucket>;
};

declare global {
  var __MBTI_V2_STORE__: Store | undefined;
  var __MBTI_V2_STORE_BOOTSTRAPPED__: boolean | undefined;
}

const storeFilePath = process.env.STORE_PERSIST_PATH || "/tmp/mbti-v2-store.json";

type PersistedStore = {
  orders: Array<[string, OrderRecord]>;
  reports: Array<[string, ReportRecord]>;
  reportByOrderAndType: Array<[string, string]>;
  orderByIdempotency: Array<[string, string]>;
  reportByIdempotency: Array<[string, string]>;
  usage: Array<[string, UsageBucket]>;
};

export function getStore(): Store {
  if (!globalThis.__MBTI_V2_STORE__) {
    globalThis.__MBTI_V2_STORE__ = {
      orders: new Map(),
      reports: new Map(),
      reportByOrderAndType: new Map(),
      orderByIdempotency: new Map(),
      reportByIdempotency: new Map(),
      usage: new Map()
    };
  }
  return globalThis.__MBTI_V2_STORE__;
}

export async function bootstrapStore(): Promise<void> {
  if (globalThis.__MBTI_V2_STORE_BOOTSTRAPPED__) return;
  const store = getStore();

  if (!existsSync(storeFilePath)) {
    globalThis.__MBTI_V2_STORE_BOOTSTRAPPED__ = true;
    return;
  }

  try {
    const raw = await readFile(storeFilePath, "utf-8");
    const parsed = JSON.parse(raw) as PersistedStore;
    store.orders = new Map(parsed.orders || []);
    store.reports = new Map(parsed.reports || []);
    store.reportByOrderAndType = new Map(parsed.reportByOrderAndType || []);
    store.orderByIdempotency = new Map(parsed.orderByIdempotency || []);
    store.reportByIdempotency = new Map(parsed.reportByIdempotency || []);
    store.usage = new Map(parsed.usage || []);
  } catch (error) {
    console.warn("[store] bootstrap failed, continue with empty store", error instanceof Error ? error.message : "unknown");
  }

  globalThis.__MBTI_V2_STORE_BOOTSTRAPPED__ = true;
}

export async function persistStore(): Promise<void> {
  const store = getStore();
  const payload: PersistedStore = {
    orders: [...store.orders.entries()],
    reports: [...store.reports.entries()],
    reportByOrderAndType: [...store.reportByOrderAndType.entries()],
    orderByIdempotency: [...store.orderByIdempotency.entries()],
    reportByIdempotency: [...store.reportByIdempotency.entries()],
    usage: [...store.usage.entries()]
  };

  try {
    await mkdir(dirname(storeFilePath), { recursive: true });
    await writeFile(storeFilePath, JSON.stringify(payload), "utf-8");
  } catch (error) {
    console.warn("[store] persist failed", error instanceof Error ? error.message : "unknown");
  }
}
