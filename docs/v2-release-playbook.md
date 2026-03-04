# MBTI V2 Release Playbook

## 1. Scope
V2 includes:
- Free fixed MBTI result block
- Paid Basic AI report (target ~600 chars)
- Optional add-on form + Paid Advanced AI report (target ~900 chars)
- Payment providers selector (Alipay / WeChat)
- Server-side payment verification gate before AI generation
- Idempotency and rate limiting safeguards

## 2. Test Checklist

### 2.1 Functional
- [ ] User completes quiz and sees free result
- [ ] Basic report flow: create order -> pay success -> generate -> render report
- [ ] Advanced report flow with empty form fields works
- [ ] Advanced report flow with filled form fields works
- [ ] Provider selector toggles between Alipay and WeChat
- [ ] Retry button works after generation failure
- [ ] Report can be fetched by `GET /api/report/:id`

### 2.2 Required Exception Cases
- [ ] Payment success but AI generation fails: UI shows failure + retry
- [ ] Repeated click on generate buttons: no duplicate paid generation
- [ ] Empty profile form: still can generate advanced report
- [ ] Repeated webhook callbacks: order remains idempotently paid

### 2.3 Security / Cost
- [ ] Unpaid order cannot call generation API (expect 2002)
- [ ] Session mismatch blocked (expect 1002)
- [ ] Rate limiting triggers under burst calls (expect 3001)
- [ ] Idempotency keys return same order/report

### 2.4 Mobile UX
- [ ] Drawer form works on iPhone/Android viewport
- [ ] Status text readable and buttons not overlapping
- [ ] Loading states visible (creating order/paying/generating)

## 3. API Smoke Commands (Local)
Use `x-session-id` header in all requests.

```bash
# create basic order
curl -X POST http://localhost:3000/api/pay/create-order \
  -H 'Content-Type: application/json' \
  -H 'x-session-id: sess_demo_1' \
  -d '{
    "productType":"basic",
    "provider":"alipay",
    "idempotencyKey":"idem_order_001",
    "resultSnapshot":{"type":"INFP","axisScore":{"EI":-4,"SN":3,"TF":-2,"JP":1},"axisPercent":{"EI":{"first":44,"second":56},"SN":{"first":58,"second":42},"TF":{"first":46,"second":54},"JP":{"first":53,"second":47}}}
  }'

# mock webhook pay success
curl -X POST http://localhost:3000/api/pay/webhook \
  -H 'Content-Type: application/json' \
  -d '{"provider":"mock","orderNo":"<ORDER_NO>","providerOrderId":"MOCK_1","tradeStatus":"SUCCESS","sign":"mock-sign"}'

# generate basic report
curl -X POST http://localhost:3000/api/ai/generate-basic-report \
  -H 'Content-Type: application/json' \
  -H 'x-session-id: sess_demo_1' \
  -d '{"orderNo":"<ORDER_NO>","idempotencyKey":"idem_report_001"}'
```

## 4. Vercel Deployment Steps
1. Ensure env vars are set from `.env.example`.
2. Keep `NEXT_PUBLIC_PAYMENT_MODE=mock` for 0元测试阶段.
3. Connect repo in Vercel and deploy from `main`.
4. Post-deploy smoke test:
- Result page render
- Basic report generation full path
- Advanced report generation full path
- `GET /api/healthz` returns `status=ok`

## 5. Required Env Vars Before Real Model Test
These are required to test real model call (instead of mock report):
- `MODEL_BASE_URL`
- `MODEL_API_KEY`
- `MODEL_NAME`
- `MODEL_API_PATH`

Recommended extras:
- `MODEL_TIMEOUT_MS`
- `MODEL_MAX_TOKENS_BASIC`
- `MODEL_MAX_TOKENS_ADVANCED`

## 6. Rollback Plan
1. Keep last stable production deployment alias in Vercel.
2. On severe incident:
- Roll back alias to previous deployment immediately.
- Set `NEXT_PUBLIC_PAYMENT_MODE=mock` and temporarily disable provider mode.
3. Reproduce in staging and patch before re-promote.

## 7. Monitoring and Alerting
- Track API error rates by endpoint:
  - `/api/pay/create-order`
  - `/api/pay/webhook`
  - `/api/ai/generate-basic-report`
  - `/api/ai/generate-advanced-report`
- Key metrics:
  - Payment success ratio
  - Generation success ratio
  - Mean generation latency
  - 429/403/500 spikes
- Cost metrics:
  - Number of successful generations per day
  - Tokens per basic/advanced report

## 8. Current Known Limitations
- Persistent file store is used via `STORE_PERSIST_PATH` (default `/tmp/mbti-v2-store.json`), but on serverless this is still instance-local and not a durable database.
- Webhook signature is mock implementation; production must implement official signature verification.
- Queue-based async generation is not introduced yet.
