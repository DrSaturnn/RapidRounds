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
    <section className="space-y-4 border-t border-rr-line bg-rr-surface px-0 py-5 sm:px-5">
      <div className="space-y-3 border-b border-rr-soft-line pb-4">
        <p className="text-xs tracking-normal text-rr-muted">{isUnknown ? "Concept build" : "Decision repair"}</p>
        {isUnknown ? (
          <div className="space-y-3 text-sm leading-6">
            <div>
              <p className="text-xs text-rr-muted">Correct answer</p>
              <p className="text-base font-semibold">{tutor.repair.correctAnswer}</p>
            </div>
            <p>{tutor.repair.why}</p>
            <div>
              <p className="text-xs text-rr-muted">Recognize it by</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {(tutor.repair.recognitionClues ?? [tutor.repair.clue]).map((clue) => (
                  <li key={clue}>{clue}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <>
            {tutor.repair.cognitiveError ? (
              <div>
                <p className="text-xs text-rr-muted">Your reasoning pattern</p>
                <p className="text-base font-semibold">Cognitive Error: {tutor.repair.cognitiveError.type}</p>
              </div>
            ) : null}
            <div className="grid gap-3 text-sm leading-6 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div>
                <p className="text-xs text-rr-muted">Correct answer</p>
                <p className="text-base font-semibold">{tutor.repair.correctAnswer}</p>
              </div>
              <div>
                <p className="text-xs text-rr-muted">Key clue</p>
                <p>{tutor.repair.clue}</p>
              </div>
            </div>
            <p className="text-sm leading-6">{tutor.repair.why}</p>
            {tutor.repair.cognitiveError ? (
              <div className="space-y-1 text-sm leading-6">
                <p>{tutor.repair.cognitiveError.whyAttractive}</p>
                <p>{tutor.repair.cognitiveError.missedClue}</p>
                <p>{tutor.repair.cognitiveError.expertCorrection}</p>
              </div>
            ) : null}
          </>
        )}
        <p className="text-sm leading-6 text-rr-muted">{tutor.repair.fingerprint}</p>
      </div>

      {tutor.reinforcement ? (
        <form onSubmit={onSubmit} className="space-y-3">
          <p className="text-sm font-medium leading-6">{tutor.reinforcement.question}</p>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              {...inputGuardProps}
              name={`repair-${tutor.repair.style.toLowerCase()}-response`}
              value={reinforcementAnswer}
              onChange={(event) => setReinforcementAnswer(event.target.value)}
              disabled={reinforcementResult !== null}
              className="h-11 w-full border border-black bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:text-neutral-500"
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
            <p className="text-sm text-neutral-700">
              {reinforcementResult ? "Correct." : "Not quite."} {tutor.reinforcement.boardPearl}
            </p>
          ) : null}
        </form>
      ) : (
        <Button type="button" onClick={loadQuestion}>
          Next
        </Button>
      )}

      <TeachingCard title="Teach me more" defaultOpen={false}>
        <div className="space-y-5">
          <div>
            <p className="font-medium">Illness Script</p>
            <p>{tutor.illnessScript.classicPresentation}</p>
          </div>
          <div>
            <p className="font-medium">Expert Recognition</p>
            <p>{tutor.recognitionPath ?? tutor.managementPearl}</p>
          </div>
          {tutor.cognitiveError ? (
            <div>
              <p className="font-medium">Expert Correction</p>
              <p>{tutor.cognitiveError.expertCorrection}</p>
            </div>
          ) : null}
          <div>
            <p className="font-medium">Don't Confuse With</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-black">
                    <th className="py-2 pr-3 font-semibold">Feature</th>
                    <th className="py-2 pr-3 font-semibold">{tutor.comparison.correctDiagnosis}</th>
                    <th className="py-2 font-semibold">{tutor.comparison.competingDiagnosis}</th>
                  </tr>
                </thead>
                <tbody>
                  {tutor.comparison.rows.map((row) => (
                    <tr key={row.feature} className="border-b border-neutral-300 last:border-b-0">
                      <td className="py-2 pr-3 font-medium">{getComparisonFeatureDisplayText(row.feature)}</td>
                      <td className="py-2 pr-3">{row.correct}</td>
                      <td className="py-2">{row.competing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
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

      <div className="space-y-3 border-t border-rr-soft-line pt-4">
        <p className="text-xs font-medium uppercase tracking-normal text-rr-muted">Related Concepts</p>
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
            className="border border-rr-soft-line bg-white px-2 py-1 text-xs text-rr-foreground transition-colors hover:border-rr-line"
          >
            {concept}
          </button>
        ))}
      </div>
    </div>
  );
}
