"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { getProfile } from "@/lib/mbti/profiles";
import { useQuizStore } from "@/store/quiz-store";
import { ShareCard } from "@/components/result/ShareCard";
import { PRICING_CONFIG } from "@/lib/config/pricing";
import { confirmPayment, createOrder, generateAdvancedReport, generateBasicReport } from "@/lib/ai/report-client";
import { AIReport, GenerationState, PaymentProvider, ProfileInput } from "@/lib/ai/report-types";

const axisLabel = {
  EI: ["外向 E", "内向 I"],
  SN: ["实感 S", "直觉 N"],
  TF: ["思考 T", "情感 F"],
  JP: ["判断 J", "感知 P"]
} as const;

const stateText: Record<GenerationState, string> = {
  idle: "待生成",
  creating_order: "创建订单中...",
  paying: "支付处理中...",
  paid: "支付成功，准备生成...",
  generating: "AI生成中...",
  ready: "生成完成",
  failed: "生成失败"
};

const ageRanges = ["18岁以下", "18-24", "25-29", "30-34", "35-39", "40+"];
const occupationCategories = [
  "互联网/产品/技术",
  "市场/销售/运营",
  "设计/内容/传媒",
  "教育/科研",
  "金融/咨询/法务",
  "医疗/公共服务",
  "制造/供应链",
  "自由职业/创业",
  "其他"
];
const lifeStages = ["学生", "求职期", "在职上升期", "转型期", "管理期"];
const concerns = ["职业规划", "晋升加薪", "转行选择", "工作与生活平衡", "沟通协作", "执行效率"];

function ReportBlock({ title, report }: { title: string; report: AIReport }) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{title} · 报告编号 {report.reportNo}</p>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
        <section>
          <h4 className="font-semibold text-slate-900">总体画像</h4>
          <p>{report.content.overallProfile}</p>
        </section>
        <section>
          <h4 className="font-semibold text-slate-900">职业倾向</h4>
          <p>{report.content.careerTendency}</p>
        </section>
        <section>
          <h4 className="font-semibold text-slate-900">未来3个月行动建议</h4>
          <ul className="list-disc pl-5">
            {report.content.next3MonthsActions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h4 className="font-semibold text-slate-900">风险提醒</h4>
          <p>{report.content.riskAlerts}</p>
        </section>
        <section>
          <h4 className="font-semibold text-slate-900">鼓励总结</h4>
          <p>{report.content.encouragement}</p>
        </section>
      </div>
    </div>
  );
}

function ResultContent() {
  const params = useSearchParams();
  const typeFromUrl = params.get("type");
  const result = useQuizStore((s) => s.result);

  const type = typeFromUrl || result?.type || "INFP";
  const profile = useMemo(() => getProfile(type), [type]);

  const [basicState, setBasicState] = useState<GenerationState>("idle");
  const [advancedState, setAdvancedState] = useState<GenerationState>("idle");
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>("alipay");
  const [basicError, setBasicError] = useState<string>("");
  const [advancedError, setAdvancedError] = useState<string>("");
  const [basicReport, setBasicReport] = useState<AIReport | null>(null);
  const [advancedReport, setAdvancedReport] = useState<AIReport | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [profileInput, setProfileInput] = useState<ProfileInput>({});
  const canGenerate = Boolean(result);
  const isBasicBusy = basicState === "creating_order" || basicState === "paying" || basicState === "generating";
  const isAdvancedBusy = advancedState === "creating_order" || advancedState === "paying" || advancedState === "generating";
  const basicReady = Boolean(basicReport) && basicState === "ready";
  const advancedReady = Boolean(advancedReport) && advancedState === "ready";

  const basicPriceLabel = PRICING_CONFIG.displayOriginalPrice
    ? `原价¥${PRICING_CONFIG.basicOriginalCny}，限时0元体验`
    : "限时0元体验";
  const advancedPriceLabel = PRICING_CONFIG.displayOriginalPrice
    ? `原价+¥${PRICING_CONFIG.advancedAddonOriginalCny}，限时0元体验`
    : "限时0元体验";

  const handleGenerateBasic = async () => {
    // Fix Bug #5: lock duplicate clicks while request is in flight or report already exists.
    if (isBasicBusy || basicReady) return;
    if (!result) {
      setBasicError("当前会话缺少分数数据，请从测试页完成一次作答后再生成。");
      return;
    }

      setBasicError("");
      setBasicState("creating_order");
      try {
      const order = await createOrder({ productType: "basic", provider: selectedProvider, resultSnapshot: result });
      setBasicState("paying");
      const payResult = await confirmPayment(order.orderNo, selectedProvider);
      if (!payResult.paid) {
        throw new Error("支付未完成");
      }
      setBasicState("paid");
      setBasicState("generating");
      const report = await generateBasicReport(order.orderNo);
      setBasicReport(report);
      setBasicState("ready");
    } catch (error) {
      setBasicState("failed");
      setBasicError(error instanceof Error ? error.message : "基础报告生成失败，请重试");
    }
  };

  const handleGenerateAdvanced = async () => {
    // Fix Bug #5: lock duplicate clicks while request is in flight or report already exists.
    if (isAdvancedBusy || advancedReady) return;
    if (!result) {
      setAdvancedError("当前会话缺少分数数据，请从测试页完成一次作答后再生成。");
      return;
    }

    setAdvancedError("");
    setAdvancedState("creating_order");
    try {
      const order = await createOrder({ productType: "advanced", provider: selectedProvider, resultSnapshot: result });
      setAdvancedState("paying");
      const payResult = await confirmPayment(order.orderNo, selectedProvider);
      if (!payResult.paid) {
        throw new Error("支付未完成");
      }
      setAdvancedState("paid");
      setAdvancedState("generating");
      const report = await generateAdvancedReport(order.orderNo, profileInput);
      setAdvancedReport(report);
      setAdvancedState("ready");
      setShowDrawer(false);
    } catch (error) {
      setAdvancedState("failed");
      setAdvancedError(error instanceof Error ? error.message : "增强报告生成失败，请重试");
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-8 sm:px-6">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-3xl bg-white/85 p-6 shadow-[0_14px_36px_rgba(15,23,42,0.12)] sm:p-8"
      >
        <p className="text-sm font-medium text-slate-500">你的测试结果</p>
        <h1 className="mt-2 bg-gradient-to-r from-sky-500 to-pink-500 bg-clip-text text-5xl font-black text-transparent">
          {profile.code}
        </h1>
        <p className="mt-1 text-xl font-semibold text-slate-700">{profile.title}</p>
        <p className="mt-5 text-base leading-8 text-slate-700">{profile.summary}</p>

        {result && (
          <div className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-600">四维度倾向</p>
            {(Object.keys(result.axisPercent) as Array<keyof typeof result.axisPercent>).map((axis, idx) => {
              const pair = axisLabel[axis];
              const pct = result.axisPercent[axis];
              return (
                <motion.div
                  key={axis}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.26, delay: 0.06 * idx }}
                >
                  <div className="mb-1 flex justify-between text-xs text-slate-600">
                    <span>{pair[0]} {pct.first}%</span>
                    <span>{pair[1]} {pct.second}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <motion.div
                      className="h-full bg-gradient-to-r from-sky to-pink-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct.first}%` }}
                      transition={{ duration: 0.55, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <h3 className="font-bold text-emerald-900">经典优点</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-800">
              {profile.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <h3 className="font-bold text-amber-900">潜在盲点</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
              {profile.blindSpots.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12 }}
        className="mt-6 rounded-3xl bg-white/85 p-6 shadow-[0_14px_36px_rgba(15,23,42,0.12)]"
      >
        <h2 className="text-xl font-bold text-slate-900">AI深度报告</h2>
        <p className="mt-2 text-sm text-slate-600">先解锁基础AI深度报告（600字），再选择是否增购个性化增强版（900字）。</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setSelectedProvider("alipay")}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedProvider === "alipay" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            支付宝
          </button>
          <button
            type="button"
            onClick={() => setSelectedProvider("wechat")}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedProvider === "wechat" ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            微信支付
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">基础AI深度报告</p>
          <p className="mt-1 text-xs text-slate-500">{basicPriceLabel}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGenerateBasic}
              disabled={isBasicBusy || !canGenerate || basicReady}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {basicReady ? "已生成基础报告" : (basicState === "idle" || basicState === "failed" ? "解锁AI深度解读" : stateText[basicState])}
            </button>
            {basicState === "failed" && (
              <button
                type="button"
                onClick={handleGenerateBasic}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                重新生成（不重复扣费）
              </button>
            )}
            {basicReady && (
              <button
                type="button"
                onClick={() => {
                  setBasicReport(null);
                  setBasicState("idle");
                }}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                重新生成
              </button>
            )}
          </div>
          {!canGenerate && <p className="mt-2 text-xs text-rose-500">当前页面没有会话分数，需从测试页完成一次答题。</p>}
          {basicError && <p className="mt-2 text-xs text-rose-500">{basicError}</p>}
          <p className="mt-2 text-xs text-slate-500">当前状态：{stateText[basicState]}</p>
        </div>

        {basicReport && (
          <>
            <ReportBlock title="基础AI报告（600字）" report={basicReport} />
            {/* Fix Bug #4: hide purchase prompt after advanced report has been generated. */}
            {!advancedReport && (
              <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="text-sm font-semibold text-indigo-900">想更个性化？</p>
                <p className="mt-1 text-xs text-indigo-700">补充年龄段、职业和当前阶段，可解锁更细化的未来规划与职业分析。</p>
                <p className="mt-1 text-xs text-indigo-700">{advancedPriceLabel}</p>
                <button
                  type="button"
                  onClick={() => setShowDrawer(true)}
                  className="mt-3 rounded-2xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  补充信息，生成增强版报告
                </button>
              </div>
            )}
          </>
        )}

        {advancedReport && <ReportBlock title="个性化增强报告（900字）" report={advancedReport} />}
        {advancedError && <p className="mt-2 text-xs text-rose-500">{advancedError}</p>}

        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500">
          {/* Fix Bug #1: keep only compliance note, remove all config/debug text from UI. */}
          <p>合规提示：内容仅用于娱乐与自我探索，不构成心理诊断或职业专业建议。</p>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.16 }}
        className="mt-6 grid gap-4 sm:grid-cols-2"
      >
        <ShareCard type={profile.code} title={profile.title} summary={profile.summary} />
        <div className="rounded-3xl bg-white/80 p-6 shadow-[0_14px_36px_rgba(15,23,42,0.12)]">
          <h2 className="text-xl font-bold text-slate-900">下一步做什么？</h2>
          <p className="mt-2 text-slate-600">把结果图发给朋友，让他们也来测。对比你们的类型组合，看看谁更像计划派，谁是灵感派。</p>
          <div className="mt-6 flex gap-3">
            <Link href="/" className="rounded-2xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50">
              返回首页
            </Link>
            <Link href="/quiz" className="rounded-2xl bg-slate-900 px-4 py-2 font-semibold text-white hover:opacity-90">
              再测一次
            </Link>
          </div>
        </div>
      </motion.section>

      {showDrawer && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          {/* Fix Bug #3: center modal with backdrop instead of bottom sheet layout. */}
          <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">补充信息（可选）</h3>
              <button type="button" onClick={() => setShowDrawer(false)} className="text-sm text-slate-500">关闭</button>
            </div>
            <p className="mb-4 text-xs text-slate-500">这些信息只用于本次生成更个性化内容，你可以全部留空。</p>

            <div className="grid gap-3">
              <label className="text-xs text-slate-600">
                年龄段
                <select
                  value={profileInput.ageRange ?? ""}
                  onChange={(e) => setProfileInput((prev) => ({ ...prev, ageRange: e.target.value || undefined }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">不填写</option>
                  {ageRanges.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>

              <label className="text-xs text-slate-600">
                职业大类
                <select
                  value={profileInput.occupationCategory ?? ""}
                  onChange={(e) => setProfileInput((prev) => ({ ...prev, occupationCategory: e.target.value || undefined }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">不填写</option>
                  {occupationCategories.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>

              <label className="text-xs text-slate-600">
                当前阶段
                <select
                  value={profileInput.lifeStage ?? ""}
                  onChange={(e) => setProfileInput((prev) => ({ ...prev, lifeStage: e.target.value || undefined }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">不填写</option>
                  {lifeStages.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>

              <label className="text-xs text-slate-600">
                当前困扰（可选）
                <select
                  value={profileInput.currentConcern ?? ""}
                  onChange={(e) => setProfileInput((prev) => ({ ...prev, currentConcern: e.target.value || undefined }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">不填写</option>
                  {concerns.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>

              <label className="text-xs text-slate-600">
                你还想补充什么（可选）
                <textarea
                  value={profileInput.concernText ?? ""}
                  onChange={(e) => setProfileInput((prev) => ({ ...prev, concernText: e.target.value || undefined }))}
                  rows={3}
                  maxLength={120}
                  placeholder="比如：最近在考虑转岗，但担心收入波动"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                跳过，先看当前报告
              </button>
              <button
                type="button"
                onClick={handleGenerateAdvanced}
                disabled={isAdvancedBusy || advancedReady}
                className="rounded-2xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {advancedReady ? "已生成增强报告" : (advancedState === "idle" || advancedState === "failed" ? "确认并生成增强版" : stateText[advancedState])}
              </button>
            </div>
            {advancedReady && (
              <button
                type="button"
                onClick={() => {
                  setAdvancedReport(null);
                  setAdvancedState("idle");
                }}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                重新生成增强版
              </button>
            )}
            <p className="mt-2 text-center text-xs text-slate-500">{advancedPriceLabel}</p>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">加载中...</div>}>
      <ResultContent />
    </Suspense>
  );
}
