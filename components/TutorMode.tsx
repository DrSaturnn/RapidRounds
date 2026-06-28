"use client";

import { FormEvent } from "react";
import { Button } from "@/components/Button";
import { TeachingCard } from "@/components/TeachingCard";
import { getComparisonFeatureDisplayText } from "@/lib/display-language";
import { getLearningTrajectory } from "@/lib/learning-trajectory";
import type { TutorContent } from "@/types/practice";

const inputGuardProps = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false
} as const;

function normalizeCue(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function formatNextChallenge(concept?: string) {
  const value = concept?.trim();

  if (!value) {
    return "Practice the next management step.";
  }

  if (/\?$/.test(value)) {
    return value;
  }

  if (/\b(management|step|first|treatment|therapy|prophylaxis|delivery|avoid|choose)\b/i.test(value)) {
    return "Practice the next management step.";
  }

  return `How would you recognize ${value} next time?`;
}

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
  loadQuestion: (targetConcept?: string) => void;
}) {
  const isUnknown = tutor.repair.style === "UNKNOWN";
  const repairTitle = isUnknown ? "Build the pattern" : "Repair this decision";
  const learningTrajectory = getLearningTrajectory({
    correctAnswer: tutor.correctAnswer,
    wasCorrect: tutor.repair.style === "CORRECT",
    comparisonConcept: tutor.comparison.competingDiagnosis,
    managementConcept: tutor.managementPearl
  });
  const recognitionClues = Array.from(
    new Map(
      (tutor.repair.recognitionClues ?? [tutor.repair.clue])
        .map((clue) => clue.trim())
        .filter(Boolean)
        .map((clue) => [normalizeCue(clue), clue] as const)
    ).values()
  ).filter((clue) => normalizeCue(clue) !== normalizeCue(tutor.repair.clue));
  const visibleRecognitionClues = recognitionClues.length > 0 ? recognitionClues : [tutor.repair.clue];
  const hasCommonConfusion = Boolean(tutor.comparison.competingDiagnosis?.trim());
  const nextChallenge = formatNextChallenge(learningTrajectory.recommendation?.concept);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (tutor.reinforcement && reinforcementAnswer.trim().length > 0 && reinforcementResult === null) {
      submitReinforcementAnswer();
    }
  };

  return (
    <section className="space-y-3.5">
      <div className={`rr-card rr-card-section space-y-4 ${isUnknown ? "rr-concept-card" : "rr-repair-card"}`}>
        <p className="rr-section-header">{repairTitle}</p>
        {isUnknown ? (
          <div className="space-y-3 text-sm leading-6">
            <div className="rr-callout rr-callout-clue rr-pivot-panel">
              <p className="rr-meta">Pivot clue</p>
              <p>{tutor.repair.clue}</p>
              <p className="rr-meta mt-1">Meaning: supports {tutor.repair.correctAnswer}.</p>
            </div>
            <div className="rr-callout rr-correct-panel">
              <p className="rr-meta">Correct action</p>
              <p className="text-base font-semibold text-rr-mastery">{tutor.repair.correctAnswer}</p>
            </div>
            <div>
              <p className="rr-meta">Expert reasoning</p>
              <p>{tutor.repair["why"]}</p>
            </div>
            {tutor.coaching ? (
              <div className="rr-callout rr-coaching-callout">
                <p className="rr-meta">Pattern to watch</p>
                <p>{tutor.coaching.message}</p>
              </div>
            ) : null}
            <div>
              <p className="rr-meta">Recognition path</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {visibleRecognitionClues.map((clue) => (
                  <li key={clue}>{clue}</li>
                ))}
              </ul>
            </div>
            {hasCommonConfusion ? (
              <div>
                <p className="rr-meta">Common confusion</p>
                <p>{tutor.comparison.competingDiagnosis}</p>
              </div>
            ) : null}
            {learningTrajectory.recommendation ? (
              <div>
                <p className="rr-meta">Next challenge</p>
                <p>{nextChallenge}</p>
              </div>
            ) : null}
            <div className="rr-callout">
              <p className="rr-meta">Go deeper</p>
              <p>Open Teach me more for the illness script and comparison.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 text-sm leading-6 sm:grid-cols-2">
              <div className="rr-callout rr-callout-clue rr-pivot-panel">
                <p className="rr-meta">Pivot clue</p>
                <p>{tutor.repair.clue}</p>
                <p className="rr-meta mt-1">Meaning: supports {tutor.repair.correctAnswer}.</p>
              </div>
              <div className="rr-callout rr-correct-panel">
                <p className="rr-meta">Correct action</p>
                <p className="text-base font-semibold text-rr-mastery">{tutor.repair.correctAnswer}</p>
              </div>
            </div>
            <div>
              <p className="rr-meta">Expert reasoning</p>
              <p className="text-sm leading-6">{tutor.repair.why}</p>
            </div>
            {tutor.coaching ? (
              <div className="rr-callout rr-coaching-callout">
                <p className="rr-meta">Pattern to watch</p>
                <p>{tutor.coaching.message}</p>
              </div>
            ) : null}
            <div className="rr-callout">
              <p className="rr-meta">Go deeper</p>
              <p>Open Teach me more for the full illness script and comparison.</p>
            </div>
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
                <Button type="button" onClick={() => loadQuestion()}>
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
            <Button type="button" onClick={() => loadQuestion()}>
              Next
            </Button>
          </div>
        )}
      </div>

      <TeachingCard title="Teach me more: illness script and comparison" defaultOpen={false}>
        <div className="space-y-5">
          <div>
            <p className="font-medium">Illness Script</p>
            <p>{tutor.illnessScript.classicPresentation}</p>
          </div>
          <div>
            <p className="font-medium">Expert Recognition</p>
            <RecognitionPath value={tutor.recognitionPath ?? tutor.managementPearl} />
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

      <div className="rr-card rr-card-section rr-adaptive-card space-y-3">
        <p className="rr-section-header">Next challenge</p>
        <div className="space-y-3 text-sm leading-6">
          <p>
            You just learned: <span className="font-semibold">{learningTrajectory.primaryConcept}</span>
          </p>
          {learningTrajectory.recommendation ? (
            <div className="rr-adaptive-action rounded-md border px-3 py-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="rr-meta">Next challenge</p>
                  <p className="font-medium">{nextChallenge}</p>
                  <p className="rr-meta">{learningTrajectory.recommendation.reason}</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => loadQuestion(learningTrajectory.recommendation?.concept)}
                >
                  Start
                </Button>
              </div>
            </div>
          ) : null}
          <LearningChoiceGroup
            items={learningTrajectory.items.filter((item) => item.priority !== "recommended")}
            loadQuestion={loadQuestion}
          />
        </div>
      </div>
    </section>
  );
}

function RecognitionPath({ value }: { value: string }) {
  const steps = value
    .split(/\s*(?:->|\u2192|=>)\s*/)
    .map((step) => step.trim())
    .filter(Boolean);

  const visibleSteps = steps.length > 0 ? steps : [value];

  return (
    <div className="rr-path mt-2" aria-label="Expert recognition pathway">
      {visibleSteps.map((step, index) => {
        const isTerminal = index === visibleSteps.length - 1;

        return (
          <div key={`${step}-${index}`} className={`rr-path-step ${isTerminal ? "rr-path-terminal" : ""}`}>
            <span className="rr-path-marker" aria-hidden="true">
              {index + 1}
            </span>
            <span className="rr-path-node">{step}</span>
          </div>
        );
      })}
    </div>
  );
}

function LearningChoiceGroup({
  items,
  loadQuestion
}: {
  items: Array<{ concept: string; reason: string }>;
  loadQuestion: (targetConcept?: string) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      <p className="text-rr-muted">Optional exploration</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.concept}
            type="button"
            className="rr-chip"
            title={item.reason}
            onClick={() => loadQuestion(item.concept)}
          >
            {item.concept}
          </button>
        ))}
      </div>
    </div>
  );
}
