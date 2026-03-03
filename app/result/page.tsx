"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { getProfile } from "@/lib/mbti/profiles";
import { useQuizStore } from "@/store/quiz-store";
import { ShareCard } from "@/components/result/ShareCard";

const axisLabel = {
  EI: ["外向 E", "内向 I"],
  SN: ["实感 S", "直觉 N"],
  TF: ["思考 T", "情感 F"],
  JP: ["判断 J", "感知 P"]
} as const;

export default function ResultPage() {
  const params = useSearchParams();
  const typeFromUrl = params.get("type");
  const result = useQuizStore((s) => s.result);

  const type = typeFromUrl || result?.type || "INFP";
  const profile = useMemo(() => getProfile(type), [type]);

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
    </main>
  );
}
