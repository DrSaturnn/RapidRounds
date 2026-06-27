"use client";

import { FormEvent } from "react";
import { Button } from "@/components/Button";
import { TeachingCard } from "@/components/TeachingCard";
import { getConceptGraph } from "@/lib/concept-graph";
import { getComparisonFeatureDisplayText } from "@/lib/display-language";
import type { TutorContent } from "@/types/practice";

const inputGuardProps = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false
} as const;

export function TutorMode({
  tutor,
  reinforcementAnswer,
  reinforcementResult,
  setReinforcementAnswer,
  submitReinforcementAnswer,
  loadQuestion
}: {
  tutor: TutorContent;
  reinforcementAnswer: string;
  reinforcementResult: boolean | null;
  setReinforcementAnswer: (answer: string) => void;
  submitReinforcementAnswer: () => void;
  loadQuestion: () => void;
}) {
  const isUnknown = tutor.repair.style === "UNKNOWN";
  const conceptGraph = getConceptGraph({
    correctAnswer: tutor.correctAnswer,
    comparisonConcept: tutor.comparison.competingDiagnosis,
    managementConcept: tutor.managementPearl
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (tutor.reinforcement && reinforcementAnswer.trim().length > 0 && reinforcementResult === null) {
      submitReinforcementAnswer();
    }
  };

  return (
    <section className="space-y-4">
      <div className="rr-card rr-card-section space-y-2.5">
        <p className="rr-section-header">{isUnknown ? "Concept build" : "Decision repair"}</p>
        {isUnknown ? (
          <div className="space-y-2.5 text-sm leading-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="rr-meta">Correct answer</p>
                <p className="text-base font-semibold">{tutor.repair.correctAnswer}</p>
              </div>
              <div>
                <p className="rr-meta">Key clue</p>
                <p>{tutor.repair.clue}</p>
              </div>
            </div>
            <p>{tutor.repair.why}</p>
            <div>
              <p className="text-xs text-rr-muted">Recognize it by</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {(tutor.repair.recognitionClues ?? [tutor.repair.clue]).map((clue) => (
                  <li key={clue}>{clue}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 text-sm leading-6 sm:grid-cols-2">
              <div>
                <p className="rr-meta">Correct answer</p>
                <p className="text-base font-semibold">{tutor.repair.correctAnswer}</p>
              </div>
              <div>
                <p className="rr-meta">Key clue</p>
                <p>{tutor.repair.clue}</p>
              </div>
            </div>
            <p className="text-sm leading-6">{tutor.repair.why}</p>
          </>
        )}

        {tutor.reinforcement ? (
          <form onSubmit={onSubmit} className="space-y-2.5 border-t border-rr-soft-line pt-3">
            <p className="text-sm font-medium leading-6">{tutor.reinforcement.question}</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                {...inputGuardProps}
                name={`repair-${tutor.repair.style.toLowerCase()}-response`}
                value={reinforcementAnswer}
                onChange={(event) => setReinforcementAnswer(event.target.value)}
                disabled={reinforcementResult !== null}
                className="rr-text-input"
              />
              {reinforcementResult === null ? (
                <Button type="submit" disabled={reinforcementAnswer.trim().length === 0}>
                  Check
                </Button>
              ) : (
                <Button type="button" onClick={loadQuestion}>
                  Next
                </Button>
              )}
            </div>
            {reinforcementResult !== null ? (
              <p className="rr-supporting">
                {reinforcementResult ? "Correct." : "Not quite."} {tutor.reinforcement.boardPearl}
              </p>
            ) : null}
          </form>
        ) : (
          <div className="pt-1">
            <Button type="button" onClick={loadQuestion}>
              Next
            </Button>
          </div>
        )}
      </div>

      <TeachingCard title="Teach me more" defaultOpen={false}>
        <div className="space-y-5">
          <div>
            <p className="font-medium">Illness Script</p>
            <p>{tutor.illnessScript.classicPresentation}</p>
          </div>
          <div>
            <p className="font-medium">Expert Recognition</p>
            <p className="rr-path mt-2">{tutor.recognitionPath ?? tutor.managementPearl}</p>
          </div>
          {tutor.cognitiveError ? (
            <div className="rr-callout">
              <p className="font-medium">Expert Correction</p>
              <p>{tutor.cognitiveError.expertCorrection}</p>
            </div>
          ) : null}
          <div>
            <p className="font-medium">Don't Confuse With</p>
            <div className="mt-2 overflow-x-auto">
              <table className="rr-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>{tutor.comparison.correctDiagnosis}</th>
                    <th>{tutor.comparison.competingDiagnosis}</th>
                  </tr>
                </thead>
                <tbody>
                  {tutor.comparison.rows.map((row) => (
                    <tr key={row.feature}>
                      <td className="font-medium">{getComparisonFeatureDisplayText(row.feature)}</td>
                      <td>{row.correct}</td>
                      <td>{row.competing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rr-callout rr-callout-pivot">
            <p className="font-medium">NBME Pivot</p>
            <p>{tutor.nbmePivot}</p>
          </div>
          {tutor.whyTempting ? (
            <div>
              <p className="font-medium">Why This Was Tempting</p>
              <p>{tutor.whyTempting}</p>
            </div>
          ) : null}
        </div>
      </TeachingCard>

      <div className="rr-card rr-card-section space-y-3">
        <p className="rr-section-header">Related Concepts</p>
        <div className="space-y-2 text-sm leading-6">
          <p>
            You just learned: <span className="font-semibold">{conceptGraph.primaryConcept}</span>
          </p>
          <ConceptChipGroup label="Frequently confused with" concepts={conceptGraph.relatedConcepts} />
          <ConceptChipGroup label="Next concepts to strengthen" concepts={conceptGraph.managementConcepts} />
        </div>
      </div>
    </section>
  );
}

function ConceptChipGroup({ label, concepts }: { label: string; concepts: string[] }) {
  if (concepts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      <p className="text-rr-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {concepts.map((concept) => (
          <button
            key={concept}
            type="button"
            className="rr-chip"
          >
            {concept}
          </button>
        ))}
      </div>
    </div>
  );
}
