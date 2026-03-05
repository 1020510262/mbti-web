import { MODEL_CONFIG } from "@/lib/config/model";
import { AIReportContent, ProfileInput, ReportType } from "@/lib/ai/report-types";
import { ScoreResult } from "@/lib/mbti/types";
import { getProfile } from "@/lib/mbti/profiles";

function truncate(text: string, targetChars: number): string {
  if (text.length <= targetChars) return text;
  return `${text.slice(0, targetChars - 1)}…`;
}

function parseModelJson(content: unknown): AIReportContent {
  if (typeof content === "object" && content !== null) {
    return content as AIReportContent;
  }
  if (typeof content !== "string") {
    throw new Error("invalid_model_content_type");
  }

  const raw = content.trim();

  // Prefer fenced JSON block if model returns markdown.
  const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i) || raw.match(/```\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1]) as AIReportContent;
  }

  try {
    return JSON.parse(raw) as AIReportContent;
  } catch {
    // Try to locate most likely JSON payload by key anchor.
    const anchor = raw.indexOf("\"overallProfile\"");
    if (anchor >= 0) {
      const start = raw.lastIndexOf("{", anchor);
      const end = raw.lastIndexOf("}");
      if (start >= 0 && end > start) {
        return JSON.parse(raw.slice(start, end + 1)) as AIReportContent;
      }
    }

    // Fallback: greedy first/last braces.
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1)) as AIReportContent;
    }
    throw new Error("invalid_model_json");
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mockReport(result: ScoreResult, reportType: ReportType, profileInput?: ProfileInput): AIReportContent {
  const p = getProfile(result.type);
  const target = reportType === "basic" ? 600 : 900;
  const extra = profileInput
    ? `你补充的信息显示：年龄段${profileInput.ageRange || "未填"}，职业${profileInput.occupationCategory || "未填"}，阶段${profileInput.lifeStage || "未填"}。`
    : "";

  const overall = truncate(`${p.summary}${extra} 从分数结构看，你的优势与盲点非常清晰，关键是建立可持续节奏。`, Math.round(target * 0.36));
  const career = truncate(`职业倾向上，建议围绕你最稳定的两项优势打造长期标签，避免目标过多并行。把“可见成果”作为主线，每月至少产出一个可被展示的结果。`, Math.round(target * 0.24));
  const risk = truncate("风险点主要是节奏失衡和优先级漂移。避免情绪驱动做重大决策，建议固定复盘周期，用数据回看执行质量。", Math.round(target * 0.18));
  const encourage = truncate("你的潜力不缺，缺的是持续稳定地把优势复利化。稳住主线、减少分散，三个月后你会看到实质变化。", Math.round(target * 0.16));

  return {
    overallProfile: overall,
    careerTendency: career,
    next3MonthsActions: [
      "第1个月：确定1个主目标，拆成每周可执行清单并打卡。",
      "第2个月：产出1份可展示成果，收集至少2条外部反馈。",
      "第3个月：复盘迭代，保留高收益动作，砍掉低价值任务。"
    ],
    riskAlerts: risk,
    encouragement: encourage
  };
}

export async function generateReportContent(params: {
  result: ScoreResult;
  reportType: ReportType;
  profileInput?: ProfileInput;
}): Promise<AIReportContent> {
  const { result, reportType, profileInput } = params;

  // If model config is not ready, return deterministic mock content for test mode.
  if (!MODEL_CONFIG.baseUrl || !MODEL_CONFIG.modelName) {
    return mockReport(result, reportType, profileInput);
  }

  // TODO(stage4+): switch prompt to strict JSON schema and stronger moderation.
  const prompt = {
    task: "Generate MBTI entertainment report in Chinese",
    reportType,
    targetLength: reportType === "basic" ? 600 : 900,
    constraints: {
      disclaimer: "仅用于娱乐与自我探索，不构成专业建议",
      tone: "friendly, practical, witty"
    },
    mbti: result,
    profileInput: profileInput || null,
    outputSchema: {
      overallProfile: "string",
      careerTendency: "string",
      next3MonthsActions: ["string", "string", "string"],
      riskAlerts: "string",
      encouragement: "string"
    }
  };

  const endpoint = MODEL_CONFIG.baseUrl.endsWith("/chat/completions")
    ? MODEL_CONFIG.baseUrl
    : `${MODEL_CONFIG.baseUrl}${MODEL_CONFIG.apiPath.startsWith("/") ? MODEL_CONFIG.apiPath : `/${MODEL_CONFIG.apiPath}`}`;

  try {
    const maxAttempts = Math.max(1, MODEL_CONFIG.retryCount + 1);
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (attempt > 0) {
        await sleep(MODEL_CONFIG.retryBackoffMs * attempt);
      }

      const payload: Record<string, unknown> = {
        model: MODEL_CONFIG.modelName,
        temperature: 0.5,
        max_tokens: reportType === "basic" ? MODEL_CONFIG.maxTokensBasic : MODEL_CONFIG.maxTokensAdvanced,
        messages: [
          { role: "system", content: "Return only valid JSON." },
          { role: "user", content: JSON.stringify(prompt) }
        ]
      };

      if (MODEL_CONFIG.forceJsonMode) {
        payload.response_format = { type: "json_object" };
      }
      if (MODEL_CONFIG.disableThinking) {
        // DashScope compatible models can reduce latency by disabling long reasoning traces.
        payload.enable_thinking = false;
      }

      let timeout: ReturnType<typeof setTimeout> | null = null;
      try {
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), MODEL_CONFIG.timeoutMs);
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.MODEL_API_KEY || ""}`
          },
          signal: controller.signal,
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error(`model_http_${res.status}`);
        }

        const raw = await res.json();
        const parsed = parseModelJson(raw?.choices?.[0]?.message?.content);

        if (!parsed?.overallProfile || !Array.isArray(parsed?.next3MonthsActions)) {
          throw new Error("invalid_model_payload");
        }

        return parsed as AIReportContent;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("unknown_model_error");
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    }

    throw lastError ?? new Error("model_all_attempts_failed");
  } catch (error) {
    if (process.env.MODEL_FALLBACK_TO_MOCK !== "false") {
      console.warn("[model-adapter] model call failed; fallback to mock", error instanceof Error ? error.message : "unknown_error");
      return mockReport(result, reportType, profileInput);
    }
    throw error;
  }
}
