"use client";

import { FormEvent } from "react";
import { Button } from "@/components/Button";
import { TeachingCard } from "@/components/TeachingCard";
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
            <p className="font-medium">Illness script</p>
            <p>{tutor.illnessScript.classicPresentation}</p>
            <p className="text-rr-muted">{tutor.illnessScript.buzzwords.join(", ")}</p>
          </div>
          <div>
            <p className="font-medium">Recognition path</p>
            <p>{tutor.managementPearl}</p>
          </div>
          <div className="overflow-x-auto">
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
      </TeachingCard>
    </section>
  );
}
