"use client";

import { create } from "zustand";
import { questions } from "@/lib/mbti/questions";
import { OptionValue, ScoreResult } from "@/lib/mbti/types";
import { calculateMbtiResult } from "@/lib/mbti/scoring";

type QuizStore = {
  currentIndex: number;
  answers: Record<string, OptionValue>;
  result: ScoreResult | null;
  setAnswer: (questionId: string, value: OptionValue) => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
  canSubmit: () => boolean;
  submit: () => ScoreResult;
};

export const useQuizStore = create<QuizStore>((set, get) => ({
  currentIndex: 0,
  answers: {},
  result: null,
  setAnswer: (questionId, value) =>
    set((state) => ({ answers: { ...state.answers, [questionId]: value } })),
  next: () => set((state) => ({ currentIndex: Math.min(state.currentIndex + 1, questions.length - 1) })),
  prev: () => set((state) => ({ currentIndex: Math.max(state.currentIndex - 1, 0) })),
  reset: () => set({ currentIndex: 0, answers: {}, result: null }),
  canSubmit: () => Object.keys(get().answers).length === questions.length,
  submit: () => {
    const computed = calculateMbtiResult(questions, get().answers);
    set({ result: computed });
    return computed;
  }
}));
