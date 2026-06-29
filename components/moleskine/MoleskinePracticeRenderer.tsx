"use client";

import type { CSSProperties, FormEvent, KeyboardEvent, ReactNode, RefObject } from "react";
import { Button } from "@/components/Button";
import type { ClinicalNotebookAnnotation, ClinicalNotebookViewModel } from "@/lib/clinical-notebook-view-model";

type MoleskinePracticeRendererProps = {
  notebook: ClinicalNotebookViewModel;
  subjectSelector: ReactNode;
  studyModeSelector: ReactNode;
  topActions: ReactNode;
  sidebar: ReactNode;
  notes: ReactNode;
  overlays: ReactNode;
  answer: string;
  answerInputRef: RefObject<HTMLInputElement | null>;
  onAnswerChange: (answer: string) => void;
  onAnswerKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
  keyboardHint: string;
  clinicalCuePanel?: ReactNode;
  error?: string | null;
  canAdvance: boolean;
  onNext: () => void;
  onAddNotes: () => void;
};

function getAnnotationClass(annotation: ClinicalNotebookAnnotation) {
  return `rr-vignette-annotation rr-vignette-annotation-${annotation.role === "pivot" ? "pivot-clue" : annotation.role}`;
}

function getOrderedAnnotations(prompt: string, annotations: ClinicalNotebookAnnotation[]) {
  return annotations
    .map((annotation, originalIndex) => ({
      annotation,
      originalIndex,
      index: prompt.toLowerCase().indexOf(annotation.text.toLowerCase())
    }))
    .filter((entry) => entry.index >= 0)
    .sort((left, right) => left.index - right.index || left.originalIndex - right.originalIndex)
    .slice(0, 5);
}

function NotebookPrompt({
  prompt,
  annotations
}: {
  prompt: string;
  annotations: ClinicalNotebookAnnotation[];
}) {
  const orderedAnnotations = getOrderedAnnotations(prompt, annotations);

  if (orderedAnnotations.length === 0) {
    return <h1 className="rr-question-stem rr-notebook-prompt">{prompt}</h1>;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  orderedAnnotations.forEach(({ annotation, index }, annotationIndex) => {
    if (index < cursor) {
      return;
    }

    if (index > cursor) {
      nodes.push(prompt.slice(cursor, index));
    }

    const end = index + annotation.text.length;
    nodes.push(
      <span
        key={`${annotation.role}-${annotation.text}-${index}`}
        className={getAnnotationClass(annotation)}
        style={{ "--rr-annotation-index": annotationIndex } as CSSProperties}
      >
        <span className="rr-vignette-highlight">{prompt.slice(index, end)}</span>
        <span className="rr-vignette-label" aria-label={`${annotation.label}: ${annotation.note ?? annotation.text}`}>
          <span aria-hidden="true">←</span>
          {annotation.label}
        </span>
      </span>
    );
    cursor = end;
  });

  if (cursor < prompt.length) {
    nodes.push(prompt.slice(cursor));
  }

  return <h1 className="rr-question-stem rr-question-stem-annotated rr-notebook-prompt">{nodes}</h1>;
}

function NotebookReasoning({ notebook }: { notebook: ClinicalNotebookViewModel }) {
  if (notebook.state !== "explanation" || !notebook.postAnswerTeaching) {
    return null;
  }

  return (
    <section className="rr-notebook-reasoning" aria-label="Build the pattern">
      <p className="rr-notebook-section-title">{notebook.reasoning.title}</p>
      <NotebookPostAnswerTeaching teaching={notebook.postAnswerTeaching} />
    </section>
  );
}

function NotebookSchemaChain({ steps }: { steps: string[] }) {
  return (
    <div className="rr-notebook-schema-chain" aria-label="Activated schema">
      {steps.map((step, index) => (
        <span key={`${step}-${index}`}>{step}</span>
      ))}
    </div>
  );
}

function NotebookPostAnswerTeaching({ teaching }: { teaching: NonNullable<ClinicalNotebookViewModel["postAnswerTeaching"]> }) {
  const learnerLabel = teaching.learnerAnswer || "your answer";
  const intro = teaching.isCorrect
    ? "Correct. You recognized the schema:"
    : `Not quite. You put ${learnerLabel}. The typical schema for ${learnerLabel} is:`;

  return (
    <div className="rr-notebook-post-answer-model">
      <section className="rr-notebook-schema-activation">
        <p>{intro}</p>
        <NotebookSchemaChain steps={teaching.learnerAnswerSchema} />
      </section>
      <section className="rr-notebook-pivot-event">
        <span>Pivot</span>
        <strong>{teaching.pivotClue}</strong>
      </section>
      {teaching.semanticLinks.length > 0 ? (
        <section className="rr-notebook-semantic-bridge">
          {teaching.semanticLinks.map((link) => (
            <div key={`${link.sourceText}-${link.relationship}-${link.targetConcept}`}>
              <span>{link.sourceText}</span>
              <strong>{link.relationship.replace("_", " ")}</strong>
              <span>{link.targetDiagnosis ?? link.targetConcept}</span>
            </div>
          ))}
        </section>
      ) : null}
      {teaching.intendedDiscriminatorPair ? (
        <NotebookBoundaryPair pair={teaching.intendedDiscriminatorPair} />
      ) : null}
      <section className="rr-notebook-clinical-resolution">
        <span>Clinical Resolution</span>
        <strong>{teaching.clinicalResolution}</strong>
      </section>
      <section className="rr-notebook-next-time-rule">
        <span>Next-time rule</span>
        <p>{teaching.nextTimeRule}</p>
      </section>
    </div>
  );
}

function NotebookBoundaryPair({
  pair
}: {
  pair: NonNullable<NonNullable<ClinicalNotebookViewModel["postAnswerTeaching"]>["intendedDiscriminatorPair"]>;
}) {
  return (
    <section className="rr-notebook-schema-discriminator" aria-label="Decision boundary">
      <h2>Decision boundary</h2>
      <div className="rr-notebook-comparison-table rr-notebook-schema-table" role="region" aria-label="Discriminator comparison">
        <table>
          <thead>
            <tr>
              <th scope="col">Field</th>
              <th scope="col">{pair.conceptA}</th>
              <th scope="col">{pair.conceptB}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Defining schema</th>
              <td><NotebookSchemaChain steps={pair.schemaA} /></td>
              <td><NotebookSchemaChain steps={pair.schemaB} /></td>
            </tr>
            <tr>
              <th scope="row">What the pivot supports</th>
              <td>{pair.pivotSupports}</td>
              <td>Not supported by the pivot here.</td>
            </tr>
            <tr>
              <th scope="row">Alternative would need</th>
              <td>The current pivot instead.</td>
              <td>{pair.alternativeWouldNeed}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NotebookRightPage({ notebook }: { notebook: ClinicalNotebookViewModel }) {
  const rightPage = notebook.rightPage;

  if (notebook.state !== "explanation" || !rightPage) {
    return (
      <aside className="rr-notebook-right-page rr-notebook-quiet-page" aria-label="Reasoning will unfold after answer">
        <p>Answer first. The reasoning will unfold here.</p>
      </aside>
    );
  }

  return (
    <aside className="rr-notebook-right-page" aria-label="Optional depth">
      <p className="rr-notebook-section-title">Optional depth</p>
      {rightPage.teachMeMore ? (
        <details className="rr-notebook-teach-more">
          <summary>
            <span>Teach Me More</span>
            <span aria-hidden="true">⌄</span>
          </summary>
          <div className="rr-notebook-teach-more-body">
            {rightPage.teachMeMore.illnessScript ? (
              <section>
                <h3>Illness script</h3>
                <p>{rightPage.teachMeMore.illnessScript}</p>
              </section>
            ) : null}
            {rightPage.teachMeMore.recognitionGoal ? (
              <section>
                <h3>Recognition goal</h3>
                <p>{rightPage.teachMeMore.recognitionGoal}</p>
              </section>
            ) : null}
            {rightPage.teachMeMore.comparisonRows.length > 0 ? (
              <section>
                <h3>Discriminator table</h3>
                <div className="rr-notebook-comparison-table" role="region" aria-label="Discriminator comparison">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Feature</th>
                        <th scope="col">{notebook.reasoning.correctAnswer ?? "Clinical resolution"}</th>
                        <th scope="col">{rightPage.whyWrong?.label ?? "Common confusion"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rightPage.teachMeMore.comparisonRows.map((row) => (
                        <tr key={row.feature}>
                          <th scope="row">{row.feature}</th>
                          <td>{row.correct}</td>
                          <td>{row.competing}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
            {rightPage.teachMeMore.nbmePivot ? (
              <section>
                <h3>NBME pivot</h3>
                <p>{rightPage.teachMeMore.nbmePivot}</p>
              </section>
            ) : null}
          </div>
        </details>
      ) : null}
    </aside>
  );
}

export function MoleskinePracticeRenderer({
  notebook,
  subjectSelector,
  studyModeSelector,
  topActions,
  sidebar,
  notes,
  overlays,
  answer,
  answerInputRef,
  onAnswerChange,
  onAnswerKeyDown,
  onSubmit,
  isSubmitting,
  keyboardHint,
  clinicalCuePanel,
  error,
  canAdvance,
  onNext,
  onAddNotes
}: MoleskinePracticeRendererProps) {
  return (
    <div className="practice-focus rr-practice-shell rr-moleskine-root rr-moleskine-book-mode rr-clinical-notebook-shell min-h-screen" data-theme="warm-notebook">
      <header className="rr-product-nav rr-moleskine-topbar rr-notebook-topbar">
        <div className="rr-product-brand">
          <span className="rr-brand-mark" aria-hidden="true">✳</span>
          <span>RapidRounds</span>
          <span className="rr-brand-subtitle">with Aster</span>
        </div>
        <div className="rr-product-context" aria-label="Current training context">
          {subjectSelector}
          <span className="rr-context-divider" aria-hidden="true" />
          {studyModeSelector}
        </div>
        <div className="rr-product-progress" aria-label={notebook.header.progressLabel}>
          <span className="rr-progress-count">{notebook.header.progressLabel}</span>
          <span className="rr-progress-dots" aria-hidden="true">
            {notebook.header.progressDots.map((isActive, index) => (
              <span key={index} className={isActive ? "rr-progress-dot-active" : ""} />
            ))}
          </span>
        </div>
        <div className="rr-notebook-top-actions">{topActions}</div>
      </header>
      <div className="rr-notebook-shell rr-notebook-surface rr-moleskine-shell rr-moleskine-physical-book rr-clinical-notebook-book">
        <aside className="rr-tool-rail rr-panel rr-moleskine-sidebar-page rr-notebook-sidebar rr-notebook-tool-page" aria-label="Practice tools">
          {sidebar}
        </aside>
        <main className={`rr-practice-main rr-practice-main-wide rr-clinical-notebook-spread rr-notebook-spread ${notebook.state === "explanation" ? "rr-clinical-notebook-spread-learn" : "rr-clinical-notebook-spread-question"}`}>
          <div className="rr-notebook-learning-goal">
            <p>{notebook.header.learningGoal}</p>
          </div>
          <section className="rr-card rr-question-card rr-vignette-card rr-card-paper rr-moleskine-left-page rr-notebook-left-page rr-notebook-primary-page">
            <div className="rr-moleskine-question-intro rr-notebook-question-intro">
              <span className="rr-badge rr-badge-learning">{notebook.state === "explanation" ? "Explanation" : "Question"}</span>
              <span className="rr-meta">Think through the vignette first.</span>
            </div>
            <NotebookPrompt prompt={notebook.vignette.prompt} annotations={notebook.vignette.annotations} />
            <p className="rr-decision-question">{notebook.vignette.question}</p>
            {notebook.state === "question" ? (
              <form onSubmit={onSubmit} className="rr-answer-dock rr-moleskine-solve-form rr-notebook-answer-form">
                <label className="sr-only" htmlFor="answer">Answer</label>
                <div className="rr-notebook-answer-row">
                  <input
                    ref={answerInputRef}
                    id="answer"
                    value={answer}
                    onChange={(event) => onAnswerChange(event.target.value)}
                    onKeyDown={onAnswerKeyDown}
                    placeholder="Type your answer"
                    name="rr-moleskine-answer"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="rr-input"
                    autoFocus
                  />
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Checking" : "Submit"}
                  </Button>
                </div>
                {clinicalCuePanel}
                <p className="text-xs text-rr-muted" aria-live="polite">{keyboardHint}</p>
                {error ? <p className="text-sm text-rr-muted">{error}</p> : null}
              </form>
            ) : null}
            <NotebookReasoning notebook={notebook} />
          </section>
          <NotebookRightPage notebook={notebook} />
          {notes}
        </main>
        <nav className="rr-bottom-nav rr-panel rr-moleskine-footer-strip rr-notebook-footer" aria-label="Practice navigation">
          <button type="button" className="rr-bottom-action" onClick={onAddNotes}>
            □ Add to Notes
          </button>
          {notebook.state === "explanation" ? (
            <Button type="button" onClick={onNext} disabled={!canAdvance}>
              Next Case →
            </Button>
          ) : (
            <span className="rr-notebook-footer-hint">Answer first. Then the notebook will unfold.</span>
          )}
        </nav>
      </div>
      {overlays}
    </div>
  );
}
