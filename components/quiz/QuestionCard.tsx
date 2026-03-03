import { Question, OptionValue } from "@/lib/mbti/types";

interface QuestionCardProps {
  question: Question;
  selected?: OptionValue;
  onSelect: (value: OptionValue) => void;
}

const optionStyles = [
  "bg-sky/10 border-sky/30 hover:bg-sky/20",
  "bg-emerald-100 border-emerald-200 hover:bg-emerald-200",
  "bg-amber-50 border-orange-200 hover:bg-orange-100",
  "bg-rose-50 border-rose-200 hover:bg-rose-100"
];

export function QuestionCard({ question, selected, onSelect }: QuestionCardProps) {
  return (
    <article className="rounded-3xl bg-white/90 p-6 shadow-[0_14px_36px_rgba(15,23,42,0.12)] backdrop-blur">
      <p className="mb-6 text-xl font-semibold leading-relaxed text-slate-900">{question.text}</p>
      <div className="grid gap-3">
        {question.options.map((option, idx) => {
          const value = idx as OptionValue;
          const active = selected === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(value)}
              className={`w-full rounded-2xl border px-4 py-3 text-left text-base transition ${optionStyles[idx]} ${
                active ? "ring-2 ring-offset-2 ring-slate-900" : ""
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </article>
  );
}
