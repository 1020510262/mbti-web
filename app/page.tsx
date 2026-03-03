"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useQuizStore } from "@/store/quiz-store";

export default function HomePage() {
  const reset = useQuizStore((s) => s.reset);

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute -left-16 top-14 h-36 w-36 rounded-full bg-pink-200/60 blur-2xl" />
      <div className="pointer-events-none absolute -right-10 bottom-24 h-36 w-36 rounded-full bg-sky-200/70 blur-2xl" />
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full rounded-3xl bg-white/80 p-8 text-center shadow-[0_14px_36px_rgba(15,23,42,0.12)] backdrop-blur"
      >
        <p className="text-sm font-medium text-slate-500">娱乐向人格测试</p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-slate-900 sm:text-5xl">你的 MBTI 是哪一型？</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
          64 道题，约 6-10 分钟。完成后立刻解锁你的四字人格、有梗解读、优缺点雷达，还有可下载分享图。
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/quiz"
            onClick={() => reset()}
            className="rounded-2xl bg-slate-900 px-6 py-3 text-lg font-semibold text-white transition hover:opacity-90"
          >
            开始测试
          </Link>
          <a
            href="#how"
            className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-lg font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            先看说明
          </a>
        </div>
      </motion.section>

      <motion.section
        id="how"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="mt-8 w-full rounded-3xl bg-white/70 p-6 shadow-[0_14px_36px_rgba(15,23,42,0.12)]"
      >
        <h2 className="text-xl font-bold text-slate-900">测试说明</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-600">
          <li>没有标准答案，按第一反应选更准。</li>
          <li>每题 4 选 1，请尽量全部作答。</li>
          <li>结果用于娱乐和自我观察，不是心理诊断。</li>
        </ul>
      </motion.section>
    </main>
  );
}
