import { NextRequest } from "next/server";
import { getStore } from "@/lib/server/store";

export function makeNo(prefix: string): string {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function jsonOk<T>(data: T) {
  return Response.json({ code: 0, data });
}

export function jsonErr(code: number, message: string, status = 400) {
  return Response.json({ code, message }, { status });
}

export function getSessionId(req: NextRequest): string | null {
  const sessionId = req.headers.get("x-session-id");
  if (sessionId && sessionId.trim()) return sessionId.trim();
  return null;
}

export function checkLimit(sessionId: string, action: string, maxCount: number, windowMs: number): { ok: boolean; retryAfterSec?: number } {
  const store = getStore();
  const key = `${sessionId}:${action}`;
  const now = Date.now();
  const existing = store.usage.get(key);

  if (!existing || now - existing.windowStart > windowMs) {
    store.usage.set(key, { count: 1, windowStart: now });
    return { ok: true };
  }

  if (existing.blockUntil && now < existing.blockUntil) {
    return { ok: false, retryAfterSec: Math.ceil((existing.blockUntil - now) / 1000) };
  }

  existing.count += 1;
  if (existing.count > maxCount) {
    existing.blockUntil = now + 60_000;
    return { ok: false, retryAfterSec: 60 };
  }

  return { ok: true };
}

export function ensureString(v: unknown): string {
  return typeof v === "string" ? v : "";
}
