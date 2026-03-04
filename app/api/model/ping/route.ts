import { MODEL_CONFIG } from "@/lib/config/model";

function endpoint() {
  if (MODEL_CONFIG.baseUrl.endsWith("/chat/completions")) return MODEL_CONFIG.baseUrl;
  return `${MODEL_CONFIG.baseUrl}${MODEL_CONFIG.apiPath.startsWith("/") ? MODEL_CONFIG.apiPath : `/${MODEL_CONFIG.apiPath}`}`;
}

export async function GET() {
  if (!MODEL_CONFIG.baseUrl || !MODEL_CONFIG.modelName || !process.env.MODEL_API_KEY) {
    return Response.json({
      code: 1001,
      message: "MODEL_BASE_URL / MODEL_NAME / MODEL_API_KEY not configured"
    }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(MODEL_CONFIG.timeoutMs, 15000));

  try {
    const res = await fetch(endpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MODEL_API_KEY}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL_CONFIG.modelName,
        temperature: 0,
        max_tokens: 40,
        response_format: { type: "json_object" },
        enable_thinking: false,
        messages: [
          { role: "system", content: "Return JSON only." },
          { role: "user", content: '{"ok":true,"msg":"ping"}' }
        ]
      })
    });

    const rawText = await res.text();

    return Response.json({
      code: res.ok ? 0 : 5001,
      data: {
        ok: res.ok,
        status: res.status,
        endpoint: endpoint(),
        model: MODEL_CONFIG.modelName,
        preview: rawText.slice(0, 300)
      }
    }, { status: res.ok ? 200 : 502 });
  } catch (error) {
    return Response.json({
      code: 5001,
      message: error instanceof Error ? error.message : "ping failed",
      data: {
        endpoint: endpoint(),
        model: MODEL_CONFIG.modelName
      }
    }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
