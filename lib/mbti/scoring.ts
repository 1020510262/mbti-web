import { Question, OptionValue, ScoreResult, Dimension } from "@/lib/mbti/types";

const baseScoreMap: Record<OptionValue, number> = {
  0: 2,
  1: 1,
  2: -1,
  3: -2
};

const axisLetterMap: Record<Dimension, [string, string]> = {
  EI: ["E", "I"],
  SN: ["S", "N"],
  TF: ["T", "F"],
  JP: ["J", "P"]
};

export function calculateMbtiResult(
  questions: Question[],
  answers: Record<string, OptionValue>
): ScoreResult {
  const axisScore: Record<Dimension, number> = { EI: 0, SN: 0, TF: 0, JP: 0 };

  for (const q of questions) {
    const value = answers[q.id];
    if (value === undefined) continue;
    const signed = baseScoreMap[value] * (q.direction === "forward" ? 1 : -1);
    axisScore[q.dimension] += signed;
  }

  const type = (["EI", "SN", "TF", "JP"] as Dimension[])
    .map((axis) => {
      const [first, second] = axisLetterMap[axis];
      return axisScore[axis] >= 0 ? first : second;
    })
    .join("");

  const axisPercent = (["EI", "SN", "TF", "JP"] as Dimension[]).reduce((acc, axis) => {
    const count = questions.filter((q) => q.dimension === axis).length;
    const maxAbs = count * 2;
    const normalized = ((axisScore[axis] + maxAbs) / (2 * maxAbs)) * 100;
    const first = Math.max(0, Math.min(100, Math.round(normalized)));
    acc[axis] = { first, second: 100 - first };
    return acc;
  }, {} as ScoreResult["axisPercent"]);

  return { type, axisScore, axisPercent };
}
