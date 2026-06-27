import type { QuestionDto } from "@/types/practice";
import { getDecisionTypeDisplayText } from "@/lib/display-language";

export function QuestionMeta({ question }: { question: QuestionDto }) {
  const decisionType = getDecisionTypeDisplayText(question.decisionType);

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-rr-muted"
      aria-label={`${decisionType} in ${question.specialty}${question.system ? `, ${question.system}` : ""}, ${question.topic}`}
    >
      <span className="border border-rr-soft-line px-2 py-1 text-rr-foreground">
        Task: {decisionType}
      </span>
    </div>
  );
}
