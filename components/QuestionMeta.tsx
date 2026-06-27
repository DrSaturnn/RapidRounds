import type { QuestionDto } from "@/types/practice";
import { getDecisionTypeDisplayText } from "@/lib/display-language";

export function QuestionMeta({ question }: { question: QuestionDto }) {
  const decisionType = getDecisionTypeDisplayText(question.decisionType);

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-2"
      aria-label={`${decisionType} in ${question.specialty}${question.system ? `, ${question.system}` : ""}, ${question.topic}`}
    >
      <span className="rr-badge">
        Task: {decisionType}
      </span>
    </div>
  );
}
