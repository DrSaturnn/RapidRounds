import type { QuestionDto } from "@/types/practice";
import { getDecisionTypeDisplayText } from "@/lib/display-language";
import { getRapidRoundsVariantDisplayText } from "@/lib/rapidrounds-case";

export function QuestionMeta({ question }: { question: QuestionDto }) {
  const decisionType = getDecisionTypeDisplayText(question.decisionType);
  const variantType = getRapidRoundsVariantDisplayText(question.variantType);

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-2"
      aria-label={`${decisionType} in ${question.specialty}${question.system ? `, ${question.system}` : ""}, ${question.topic}`}
    >
      <span className="rr-badge rr-badge-task">
        Decision type: {decisionType}
      </span>
      {question.canonicalProblem ? (
        <span className="rr-meta">Illness script: {question.canonicalProblem}</span>
      ) : null}
      {variantType ? <span className="rr-meta">Variant: {variantType}</span> : null}
    </div>
  );
}
