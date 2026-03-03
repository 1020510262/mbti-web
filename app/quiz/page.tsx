"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { questions } from "@/lib/mbti/questions";
import { OptionValue } from "@/lib/mbti/types";
import { useQuizStore } from "@/store/quiz-store";
import { ProgressBar } from "@/components/quiz/ProgressBar";
import { QuestionCard } from "@/components/quiz/QuestionCard";

export default function QuizPage() {
  const router = useRouter();
  const { currentIndex, answers, setAnswer, next, prev, canSubmit, submit } = useQuizStore();
  const [direction, setDirection] = useState(1);
  const current = questions[currentIndex];
  const selected = answers[current.id];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setDirection(1);
      next();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      prev();
    }
  };

  const handleSubmit = () => {
    const result = submit();
    router.push(`/result?type=${result.type}`);
  };

  const onDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -90 && currentIndex < questions.length - 1) {
      setDirection(1);
      next();
      return;
    }
    if (info.offset.x > 90 && currentIndex > 0) {
      setDirection(-1);
      prev();
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-8 sm:px-6">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-6 rounded-2xl bg-white/80 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.12)]"
      >
        <ProgressBar current={currentIndex + 1} total={questions.length} />
        <p className="mt-3 text-sm text-slate-600">已作答 {answeredCount} / {questions.length}</p>
        <p className="mt-1 text-xs text-slate-500">左右轻滑也可以切题</p>
      </motion.header>

      <div className="relative min-h-[320px] overflow-hidden">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={current.id}
            custom={direction}
            variants={{
              enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 })
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: "easeOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={onDragEnd}
          >
            <QuestionCard
              question={current}
              selected={selected}
              onSelect={(value: OptionValue) => setAnswer(current.id, value)}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          上一题
        </button>

        {currentIndex < questions.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className="rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:opacity-90"
          >
            下一题
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit()}
            className="rounded-2xl bg-gradient-to-r from-sky to-pink-400 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            提交并查看结果
          </button>
        )}
      </footer>
    </main>
  );
}
