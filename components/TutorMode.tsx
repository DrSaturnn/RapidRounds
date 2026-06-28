"use client";

import type { FormEvent, ReactNode } from "react";
import { Button } from "@/components/Button";
import { TeachingCard } from "@/components/TeachingCard";
import { getComparisonFeatureDisplayText } from "@/lib/display-language";
import { dedupeDisplayStrings } from "@/lib/display-strings";
import { getLearningTrajectory } from "@/lib/learning-trajectory";
import type { TutorContent, VignetteFindingAnnotation } from "@/types/practice";

const inputGuardProps = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false
} as const;

type TeachingBlockTone =
  | "default"
  | "recognition"
  | "comparison"
  | "memory"
  | "pivot"
  | "repair"
  | "takeaway";

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

function isSameDisplayValue(left?: string, right?: string) {
  return left?.trim().replace(/\s+/g, " ").toLowerCase() === right?.trim().replace(/\s+/g, " ").toLowerCase();
}

function getDecisionTaskLabel(tutor: TutorContent) {
  const label = tutor.repair.answerLabel?.trim();

  if (!label) {
    return "Choose the clinical decision";
  }

  if (/action|management|treatment|step/i.test(label)) {
    return "Choose the next step";
  }

  if (/diagnosis/i.test(label)) {
    return "Name the diagnosis";
  }

  return label;
}

function getCompactReasoning(tutor: TutorContent) {
  const why = tutor.repair.why?.trim();
  const clueMeaning = tutor.repair.clueMeaning?.trim();

  if (!why || why === "Correct.") {
    return undefined;
  }

  if (
    isSameDisplayValue(why, tutor.repair.clueMeaning) ||
    (clueMeaning && why.includes(clueMeaning)) ||
    why.includes(`${tutor.repair.clue} -> ${tutor.repair.correctAnswer}`)
  ) {
    return undefined;
  }

  return why;
}

function getFindingRoleLabel(role: VignetteFindingAnnotation["role"]) {
  switch (role) {
    case "context":
      return "Context";
    case "supporting":
      return "Supporting";
    case "pivot_clue":
      return "Pivot clue";
    case "neutral":
      return "Neutral";
    case "noise":
      return "Noise";
  }
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
  const repairTitle = "Build the pattern";
  const learningTrajectory = getLearningTrajectory({
    correctAnswer: tutor.correctAnswer,
    wasCorrect: tutor.repair.style === "CORRECT",
    comparisonConcept: tutor.comparison.competingDiagnosis,
    managementConcept: tutor.managementPearl
  });
  const comparisonRows = tutor.comparison.rows;
  const modules = tutor.teachingPlan.modules;
  const hasComparison = modules.comparison && comparisonRows.length > 0;
  const recognitionClues = dedupeDisplayStrings(tutor.repair.recognitionClues ?? [tutor.repair.clue])
    .filter((clue) => clue.toLowerCase() !== tutor.repair.clue.trim().replace(/\s+/g, " ").toLowerCase());
  const visibleRecognitionClues = recognitionClues.length > 0 ? recognitionClues : [tutor.repair.clue];
  const hasCommonConfusion = Boolean(tutor.comparison.competingDiagnosis?.trim());
  const nextChallenge = formatNextChallenge(learningTrajectory.recommendation?.concept);
  const hasMeaningfulBoardPearl =
    Boolean(tutor.repair.fingerprint?.trim()) &&
    tutor.repair.fingerprint.trim() !== tutor.nbmePivot?.trim() &&
    tutor.repair.fingerprint.trim() !== tutor.illnessScript.classicPresentation.trim();
  const hasTypicalPatientFindings = Boolean(tutor.illnessScript.typicalPatientFindings?.length);
  const hasRecognitionGoal = Boolean(tutor.illnessScript.recognitionGoal?.trim());
  const hasKeyNegativeFindings = Boolean(tutor.illnessScript.keyNegativeFindings?.length);
  const shouldShowIllnessScriptProse =
    Boolean(tutor.illnessScript.classicPresentation?.trim()) &&
    !hasTypicalPatientFindings &&
    !hasRecognitionGoal;
  const visualFlowSteps = [
    { label: "Clinical pattern", value: visibleRecognitionClues[0] },
    { label: "Pivot clue", value: tutor.repair.clue },
    { label: "Decision", value: getDecisionTaskLabel(tutor) },
    { label: "Correct answer", value: tutor.repair.correctAnswer }
  ].filter((step) => step.value.trim().length > 0);
  const compactReasoning = getCompactReasoning(tutor);
  const hasVignetteFindings = Boolean(tutor.vignetteFindings?.length);
  const showComparisonInRightPanel = hasComparison;
  const hasTeachingContent = Boolean(
    (modules.retrieval && tutor.teachingPlan.retrieval) ||
    (modules.contraindication && tutor.teachingPlan.contraindication) ||
    modules.expertRecognition ||
    (modules.expertCorrection && tutor.cognitiveError) ||
    hasComparison ||
    modules.nbmePivot ||
    modules.illnessScript ||
    (modules.whyTempting && tutor.whyTempting) ||
    hasMeaningfulBoardPearl
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (tutor.reinforcement && reinforcementAnswer.trim().length > 0 && reinforcementResult === null) {
      submitReinforcementAnswer();
    }
  };

  const repairSurface = (
    <div className={`rr-notebook-section rr-explanation-column space-y-4 ${isUnknown ? "rr-concept-card" : "rr-repair-card"}`}>
        <p className="rr-section-header">{repairTitle}</p>
        {isUnknown ? (
          <div className="space-y-3 text-sm leading-6">
            <ClinicalReasoningFlow steps={visualFlowSteps} />
            <RepairSummary tutor={tutor} />
            {hasVignetteFindings ? <VignetteAttentionMap findings={tutor.vignetteFindings ?? []} /> : null}
            <TeachingFact label="What mattered" value={tutor.repair.clueMeaning} />
            {compactReasoning ? <TeachingFact label="What to remember" value={compactReasoning} /> : null}
            {tutor.coaching ? (
              <div className="rr-callout rr-coaching-callout">
                <p className="rr-meta">Pattern to watch</p>
                <p>{tutor.coaching.message}</p>
              </div>
            ) : null}
            {hasCommonConfusion ? (
              <div>
                <p className="rr-meta">Common confusion</p>
                <p>{tutor.comparison.competingDiagnosis}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <ClinicalReasoningFlow steps={visualFlowSteps} />
            <RepairSummary tutor={tutor} />
            {hasVignetteFindings ? <VignetteAttentionMap findings={tutor.vignetteFindings ?? []} /> : null}
            <div className="grid gap-3 text-sm leading-6 sm:grid-cols-2">
              <TeachingFact label="What mattered" value={tutor.repair.clueMeaning} />
              {compactReasoning ? <TeachingFact label="What to remember" value={compactReasoning} /> : null}
            </div>
            {tutor.coaching ? (
              <div className="rr-callout rr-coaching-callout">
                <p className="rr-meta">Pattern to watch</p>
                <p>{tutor.coaching.message}</p>
              </div>
            ) : null}
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
  );

  const teachingSurface = (
      hasTeachingContent ? (
      <TeachingCard title="Teach Me More" defaultOpen={false}>
        <div className="rr-teaching-blocks">
          {modules.retrieval && tutor.teachingPlan.retrieval ? (
            <TeachingBlock title="Retrieval target" tone="memory">
              <div className="rr-teaching-facts">
                <TeachingFact label="What you got right" value={tutor.teachingPlan.retrieval.whatYouGotRight} />
                <TeachingFact label="What was missing" value={tutor.teachingPlan.retrieval.whatWasMissing} />
                <TeachingFact label="Specific target" value={tutor.teachingPlan.retrieval.target} />
                {tutor.teachingPlan.retrieval.memoryHook ? (
                  <TeachingFact label="Memory hook" value={tutor.teachingPlan.retrieval.memoryHook} />
                ) : null}
              </div>
            </TeachingBlock>
          ) : null}
          {modules.contraindication && tutor.teachingPlan.contraindication ? (
            <TeachingBlock title="Contraindication rule" tone="repair">
              <div className="rr-teaching-facts">
                <TeachingFact label="Rule" value={tutor.teachingPlan.contraindication.rule} />
                <TeachingFact label="Why avoid it" value={tutor.teachingPlan.contraindication.whyAvoid} />
                {tutor.teachingPlan.contraindication.alternative ? (
                  <TeachingFact label="Safer direction" value={tutor.teachingPlan.contraindication.alternative} />
                ) : null}
              </div>
            </TeachingBlock>
          ) : null}
          {modules.expertRecognition ? (
          <TeachingBlock title="Expert recognition" tone="recognition">
            {!hasRecognitionGoal ? <TeachingFact label="Recognition goal" value={tutor.repair.clueMeaning} /> : null}
            <RecognitionPath value={tutor.recognitionPath ?? tutor.managementPearl} />
          </TeachingBlock>
          ) : null}
          {modules.expertCorrection && tutor.cognitiveError ? (
            <TeachingBlock title="Expert correction" tone="repair">
              <p>{tutor.cognitiveError.expertCorrection}</p>
            </TeachingBlock>
          ) : null}
          {hasComparison && !showComparisonInRightPanel ? (
            <TeachingBlock title="Don't confuse with" tone="comparison">
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
                    {comparisonRows.map((row) => (
                      <tr key={row.feature}>
                        <td className="font-medium">{getComparisonFeatureDisplayText(row.feature)}</td>
                        <td>{row.correct}</td>
                        <td>{row.competing}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TeachingBlock>
          ) : null}
          {modules.nbmePivot ? (
          <TeachingBlock title="Decision boundary" tone="pivot">
            <TeachingFact label="NBME pivot" value={tutor.nbmePivot} />
          </TeachingBlock>
          ) : null}
          {modules.illnessScript ? (
          <TeachingBlock title="Illness script" tone="recognition">
            {shouldShowIllnessScriptProse ? <p>{tutor.illnessScript.classicPresentation}</p> : null}
            {hasTypicalPatientFindings ? (
              <TeachingList title="Typical patient" items={tutor.illnessScript.typicalPatientFindings ?? []} />
            ) : null}
            {hasRecognitionGoal ? (
              <TeachingFact label="Recognition goal" value={tutor.illnessScript.recognitionGoal} />
            ) : null}
            {hasKeyNegativeFindings ? (
              <TeachingList title="Key negatives" items={tutor.illnessScript.keyNegativeFindings ?? []} />
            ) : null}
          </TeachingBlock>
          ) : null}
          {modules.whyTempting && tutor.whyTempting ? (
            <TeachingBlock title="Why this was tempting" tone="memory">
              <p>{tutor.whyTempting}</p>
            </TeachingBlock>
          ) : null}
          {hasMeaningfulBoardPearl ? (
            <TeachingBlock title="Board pearl" tone="takeaway">
              <p>{tutor.repair.fingerprint}</p>
            </TeachingBlock>
          ) : null}
        </div>
      </TeachingCard>
      ) : null
  );

  const nextChallengeSurface = (
      <div className="rr-notebook-section rr-adaptive-card space-y-3">
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
  );

  return (
    <section className="rr-post-answer-workspace rr-explanation-notebook">
      <div className="rr-post-answer-repair">{repairSurface}</div>
      <section className="rr-post-answer-depth" aria-label="Understand the pattern" data-rr-teaching-depth>
        <p className="rr-section-header rr-depth-heading">Understand the pattern</p>
        <RightPanelExplanation tutor={tutor} showComparison={showComparisonInRightPanel} />
        {teachingSurface}
        <div className="rr-post-answer-next mt-4">{nextChallengeSurface}</div>
      </section>
    </section>
  );
}

function RightPanelExplanation({ tutor, showComparison }: { tutor: TutorContent; showComparison: boolean }) {
  const hasAlternative = Boolean(tutor.comparison.competingDiagnosis?.trim());

  return (
    <div className="rr-right-explanation-stack">
      <section className="rr-right-explanation-block">
        <h2>Why this is correct</h2>
        <p>{tutor.repair.clueMeaning || tutor.repair.why}</p>
      </section>
      {hasAlternative ? (
        <section className="rr-right-explanation-block">
          <h2>Why others are wrong</h2>
          <p>
            <span>{tutor.comparison.competingDiagnosis}:</span>{" "}
            {tutor.whyTempting ?? `the pivot clue points to ${tutor.repair.correctAnswer}, not this alternative.`}
          </p>
        </section>
      ) : null}
      {showComparison ? (
        <section className="rr-right-explanation-block rr-separate-two">
          <h2>Separate These Two</h2>
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
        </section>
      ) : null}
      <section className="rr-right-explanation-block">
        <h2>Reasoning diagnosis</h2>
        <p>
          {tutor.cognitiveError
            ? tutor.cognitiveError.expertCorrection
            : `You matched the key clue to ${tutor.repair.correctAnswer}. Keep anchoring the decision to the pivot clue.`}
        </p>
      </section>
    </div>
  );
}

function RepairSummary({ tutor }: { tutor: TutorContent }) {
  return (
    <div className="rr-repair-summary">
      <div>
        <p className="rr-meta">Correct answer</p>
        <p className="rr-repair-summary-value rr-repair-summary-correct">{tutor.repair.correctAnswer}</p>
      </div>
      <div>
        <p className="rr-meta">Pivot clue</p>
        <p className="rr-repair-summary-value rr-repair-summary-clue">{tutor.repair.clue}</p>
      </div>
    </div>
  );
}

function VignetteAttentionMap({ findings }: { findings: VignetteFindingAnnotation[] }) {
  return (
    <section className="rr-attention-map" aria-label="What the vignette was telling you">
      <p className="rr-attention-map-title">What the vignette was telling you</p>
      <div className="rr-attention-map-list">
        {findings.map((finding) => (
          <div
            key={`${finding.role}-${finding.text}`}
            className={`rr-attention-map-item rr-attention-map-${finding.role.replace("_", "-")}`}
          >
            <div className="rr-attention-map-row">
              <p className="rr-attention-map-text">{finding.text}</p>
              <span className="rr-attention-map-role">{getFindingRoleLabel(finding.role)}</span>
            </div>
            {finding.explanation ? (
              <p className="rr-attention-map-explanation">{finding.explanation}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function ClinicalReasoningFlow({ steps }: { steps: Array<{ label: string; value: string }> }) {
  const visibleSteps = steps.filter((step) => step.value.trim().length > 0);

  return (
    <div className="rr-clinical-flow" aria-label="Clinical reasoning flow">
      <p className="rr-clinical-flow-title">Clinical pattern</p>
      <div className="rr-clinical-flow-steps">
        {visibleSteps.map((step, index) => {
          const isPivot = step.label === "Pivot clue";
          const isTerminal = index === visibleSteps.length - 1;

          return (
            <div
              key={`${step.label}-${step.value}-${index}`}
              className={`rr-clinical-flow-step ${isPivot ? "rr-clinical-flow-pivot" : ""} ${
                isTerminal ? "rr-clinical-flow-terminal" : ""
              }`}
            >
              <span className="rr-clinical-flow-label">{step.label}</span>
              <span className="rr-clinical-flow-node">{step.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecognitionPath({ value }: { value: string }) {
  const steps = dedupeDisplayStrings(value
    .split(/\s*(?:->|\u2192|=>)\s*/)
    .map((step) => step.trim())
    .filter(Boolean));

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

function TeachingBlock({
  title,
  tone = "default",
  children
}: {
  title: string;
  tone?: TeachingBlockTone;
  children: ReactNode;
}) {
  return (
    <section className={`rr-teaching-block rr-teaching-block-${tone}`}>
      <p className="rr-teaching-block-title">{title}</p>
      <div className="rr-teaching-block-body">{children}</div>
    </section>
  );
}

function TeachingFact({ label, value }: { label: string; value?: string }) {
  const cleaned = value?.trim();

  if (!cleaned) {
    return null;
  }

  return (
    <p className="rr-teaching-fact">
      <span>{label}</span>
      {cleaned}
    </p>
  );
}

function TeachingList({ title, items }: { title: string; items: string[] }) {
  const visibleItems = dedupeDisplayStrings(items).filter(Boolean);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="rr-teaching-list">
      <p className="rr-meta">{title}</p>
      <ul>
        {visibleItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
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
