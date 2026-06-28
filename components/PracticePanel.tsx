"use client";

import { CSSProperties, FormEvent, KeyboardEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { QuestionMeta } from "@/components/QuestionMeta";
import { TutorMode } from "@/components/TutorMode";
import { getRapidRoundsVariantDisplayText } from "@/lib/rapidrounds-case";
import { usePracticeSession } from "@/hooks/usePracticeSession";
import { getClinicalPromptText, getDecisionQuestionText } from "@/lib/decision-question-text";
import type { VignetteFindingAnnotation } from "@/types/practice";

type PracticeTool = "notes" | "settings" | null;
type PracticeSkin = "modern-academic" | "warm-notebook" | "dark-clinical" | "editorial";

const SKIN_STORAGE_KEY = "rapidrounds.practiceSkin.v2";
const practiceSkins: Array<{ value: PracticeSkin; label: string; description: string }> = [
  {
    value: "modern-academic",
    label: "Modern Academic",
    description: "Clean light workspace with purple academic accents."
  },
  {
    value: "warm-notebook",
    label: "Moleskine Notebook",
    description: "Warm white paper with quiet journal-style emphasis."
  },
  {
    value: "dark-clinical",
    label: "Dark Clinical",
    description: "Low-glare clinical workstation for focused review."
  },
  {
    value: "editorial",
    label: "Editorial Magazine",
    description: "Article-like spacing with deep navy accents."
  }
];

function isPracticeSkin(value: string | null): value is PracticeSkin {
  return Boolean(value && practiceSkins.some((skin) => skin.value === value));
}

export function PracticePanel() {
  const {
    question,
    answer,
    result,
    mode,
    tutor,
    reinforcementAnswer,
    reinforcementResult,
    sessionDecisionCount,
    isLoading,
    isSubmitting,
    isTeaching,
    error,
    setAnswer,
    setReinforcementAnswer,
    submitAnswer,
    requestTeaching,
    submitReinforcementAnswer,
    loadQuestion
  } = usePracticeSession();
  const answerInputRef = useRef<HTMLInputElement>(null);
  const stayButtonRef = useRef<HTMLButtonElement>(null);
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false);
  const [activeTool, setActiveTool] = useState<PracticeTool>(null);
  const [notes, setNotes] = useState("");
  const [skin, setSkin] = useState<PracticeSkin>("modern-academic");

  const keyboardHint = useMemo(() => {
    if (mode === "tutor") {
      if (!tutor?.reinforcement) {
        return "Enter or N for next";
      }

      if (reinforcementResult !== null) {
        return "Enter or N for next";
      }

      return reinforcementAnswer.trim().length > 0
        ? "Enter to submit"
        : "Answer the focused repair to continue";
    }

    if (result?.isCorrect) {
      return "Enter or N for next";
    }

    return "Enter to submit";
  }, [mode, reinforcementAnswer, reinforcementResult, result, tutor]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isSubmitting && mode === "rapid" && !result) {
      void submitAnswer();
    }
  };

  const onAnswerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (!isSubmitting && mode === "rapid" && !result) {
        void submitAnswer();
      }
    }
  };

  useEffect(() => {
    if (!isLoading && question && mode === "rapid" && !result) {
      window.requestAnimationFrame(() => {
        answerInputRef.current?.focus();
      });
    }
  }, [isLoading, mode, question, result]);

  useEffect(() => {
    if (!question) {
      return;
    }

    setNotes(window.localStorage.getItem(`rr-notes-${question.id}`) ?? "");
  }, [question]);

  useEffect(() => {
    if (!question) {
      return;
    }

    window.localStorage.setItem(`rr-notes-${question.id}`, notes);
  }, [notes, question]);

  useEffect(() => {
    const savedSkin = window.localStorage.getItem(SKIN_STORAGE_KEY);
    if (isPracticeSkin(savedSkin)) {
      setSkin(savedSkin);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SKIN_STORAGE_KEY, skin);
  }, [skin]);

  useEffect(() => {
    if (showEndSessionConfirm) {
      window.requestAnimationFrame(() => {
        stayButtonRef.current?.focus();
      });
    }
  }, [showEndSessionConfirm]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      const tagName = target.tagName.toLowerCase();
      return (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target.isContentEditable
      );
    };

    const isButtonTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement && Boolean(target.closest("button"));

    const isInteractiveTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      Boolean(target.closest("button, a, summary, input, textarea, select"));

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();

        if (showEndSessionConfirm) {
          setShowEndSessionConfirm(false);
        } else {
          setShowEndSessionConfirm(true);
        }

        return;
      }

      if (showEndSessionConfirm) {
        return;
      }

      const isEnter = event.key === "Enter";
      const isNextKey = event.key.toLowerCase() === "n";
      const editableTarget = isEditableTarget(event.target);

      if (mode === "tutor") {
        if (
          (!tutor?.reinforcement || reinforcementResult !== null) &&
          (isEnter || isNextKey) &&
          !(isEnter && isButtonTarget(event.target))
        ) {
          event.preventDefault();
          void loadQuestion();
          return;
        }

        if (
          reinforcementResult === null &&
          Boolean(tutor?.reinforcement) &&
          isEnter &&
          !isInteractiveTarget(event.target) &&
          reinforcementAnswer.trim().length > 0
        ) {
          event.preventDefault();
          submitReinforcementAnswer();
        }

        return;
      }

      if (result?.isCorrect && (isEnter || isNextKey) && !(isEnter && isButtonTarget(event.target))) {
        event.preventDefault();
        void loadQuestion();
        return;
      }

      if (
        !result &&
        isEnter &&
        !editableTarget &&
        !isSubmitting
      ) {
        event.preventDefault();
        void submitAnswer();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    answer,
    isLoading,
    isSubmitting,
    loadQuestion,
    mode,
    reinforcementAnswer,
    reinforcementResult,
    result,
    showEndSessionConfirm,
    submitAnswer,
    submitReinforcementAnswer,
    tutor
  ]);

  if (isLoading) {
    return (
      <div className="practice-focus flex min-h-screen items-center justify-center">
        <p className="rr-loading">Loading...</p>
      </div>
    );
  }

  if (!question) {
    return (
      <EmptyState
        title="Nothing to practice yet"
        body={error ?? "Add practice content, then come back for a round."}
      />
    );
  }

  const clinicalPrompt = getClinicalPromptText(question.stem);
  const decisionQuestion = getDecisionQuestionText(question.decisionType);
  const learningGoal = question.topic ? `Learning goal: ${question.topic}` : "Learning goal: make the next clinical decision";
  const displayDecisionCount = Math.max(sessionDecisionCount, 1);
  const totalDecisionCount = 96;
  const progressPercent = Math.min(100, Math.max(1, (displayDecisionCount / totalDecisionCount) * 100));
  const progressDots = Array.from({ length: 18 }, (_, index) => index < Math.round((progressPercent / 100) * 18));
  const topicLabel = question.canonicalProblem ?? question.system ?? question.topic;
  const variantLabel = getRapidRoundsVariantDisplayText(question.variantType);
  const isExplanationState = mode === "tutor" && Boolean(tutor);
  const visibleVignetteFindings = isExplanationState ? tutor?.vignetteFindings ?? [] : [];

  const showTeaching = () => {
    setActiveTool(null);
    if (!isExplanationState) {
      answerInputRef.current?.focus();
      return;
    }

    window.requestAnimationFrame(() => {
      document.querySelector("[data-rr-teaching-depth]")?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };

  return (
    <div className="practice-focus rr-practice-shell min-h-screen" data-theme={skin}>
      <header className="rr-product-nav">
        <div className="rr-product-brand">
          <span className="rr-brand-mark" aria-hidden="true">✳</span>
          <span>RapidRounds</span>
          <span className="rr-brand-subtitle">with Aster</span>
        </div>
        <div className="rr-product-context" aria-label="Current training context">
          <span className="rr-subject-pill">{question.specialty}</span>
          <span className="rr-context-divider" aria-hidden="true" />
          <span className="rr-context-topic">{topicLabel}</span>
          {variantLabel ? <span className="rr-context-variant">{variantLabel}</span> : null}
        </div>
        <div className="rr-product-progress" aria-label={`Question ${displayDecisionCount} of ${totalDecisionCount}`}>
          <span className="rr-progress-count">Q {displayDecisionCount} / {totalDecisionCount}</span>
          <span className="rr-progress-dots" aria-hidden="true">
            {progressDots.map((isActive, index) => (
              <span key={index} className={isActive ? "rr-progress-dot-active" : ""} />
            ))}
          </span>
        </div>
        <div className="rr-product-actions" aria-label="Session tools">
          <button
            type="button"
            className="rr-aster-button"
            aria-label="Ask Aster to explain this decision"
            onClick={showTeaching}
            disabled={isTeaching || !isExplanationState}
          >
            ✧ Aster
          </button>
          <button
            type="button"
            className="rr-menu-button"
            aria-label="Open session settings"
            onClick={() => setActiveTool(activeTool === "settings" ? null : "settings")}
          >
            ☰
          </button>
        </div>
      </header>

      <div className="rr-notebook-shell">
        <aside className="rr-tool-rail" aria-label="Practice tools">
          <button type="button" className="rr-tool-button" onClick={() => void loadQuestion()}>
            <span aria-hidden="true">▷</span>
            Continue
          </button>
          {isExplanationState ? (
            <button type="button" className="rr-tool-button" onClick={showTeaching} disabled={isTeaching}>
              <span aria-hidden="true">◇</span>
              Teach Me More
            </button>
          ) : null}
          <button
            type="button"
            className={`rr-tool-button ${activeTool === "notes" ? "rr-tool-button-active" : ""}`}
            onClick={() => setActiveTool(activeTool === "notes" ? null : "notes")}
          >
            <span aria-hidden="true">□</span>
            Notes
          </button>
          <button
            type="button"
            className={`rr-tool-button ${activeTool === "settings" ? "rr-tool-button-active" : ""}`}
            onClick={() => setActiveTool(activeTool === "settings" ? null : "settings")}
          >
            <span aria-hidden="true">☾</span>
            Settings
          </button>
        </aside>

        <main className={`rr-practice-main ${mode === "tutor" ? "rr-practice-main-wide" : ""}`}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <QuestionMeta question={question} />
            <p className="rr-meta">{learningGoal}</p>
          </div>
          <section className={`rr-card rr-question-card space-y-5 px-5 py-5 motion-safe:animate-[fadeIn_180ms_var(--rr-ease-standard)] sm:px-7 ${isExplanationState ? "rr-question-card-compact" : "sm:py-7"}`}>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rr-badge rr-badge-learning">{isExplanationState ? "Explanation" : "Question"}</span>
                <span className="rr-meta">Think through the vignette first.</span>
              </div>
              <AnnotatedClinicalPrompt prompt={clinicalPrompt} findings={visibleVignetteFindings} />
              <p className="rr-decision-question">
                {decisionQuestion}
              </p>
            </div>

            <form onSubmit={onSubmit} className="rr-answer-dock space-y-4">
              <label className="sr-only" htmlFor="answer">
                Answer
              </label>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  ref={answerInputRef}
                  id="answer"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  onKeyDown={onAnswerKeyDown}
                  disabled={Boolean(result) || mode === "tutor"}
                  placeholder="Type your answer"
                  name={`rr-answer-${question.id.slice(-6)}`}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="rr-input"
                  autoFocus
                />
                {!result ? (
                  <Button
                    type="submit"
                    disabled={isSubmitting || mode === "tutor"}
                  >
                    {isSubmitting ? "Checking" : "Submit"}
                  </Button>
                ) : null}
              </div>
              <div className="flex min-h-11 flex-wrap items-center gap-3 pt-1">
                {mode === "rapid" && result?.isCorrect ? (
                  <Button type="button" onClick={() => void loadQuestion()}>
                    Next
                  </Button>
                ) : null}
                {mode === "rapid" && result?.isCorrect ? (
                  <div className="rr-correct-inline max-w-xl text-sm leading-6 motion-safe:animate-[fadeIn_180ms_var(--rr-ease-standard)]">
                    <span className="font-semibold text-rr-correct">Correct.</span>
                    <span className="ml-3 text-rr-muted">{result.boardPearl}</span>
                  </div>
                ) : null}
                {mode === "rapid" && result && !result.isCorrect ? (
                  <p className="text-sm font-medium text-rr-repair">Not quite. Let&apos;s refine this decision.</p>
                ) : null}
                {error ? <p className="text-sm text-rr-muted">{error}</p> : null}
              </div>
              <p className="text-xs text-rr-muted" aria-live="polite">
                {keyboardHint}
              </p>
            </form>
          </section>

        {activeTool ? (
          <section className="rr-tool-panel mt-5 motion-safe:animate-[fadeIn_180ms_var(--rr-ease-standard)]">
            {activeTool === "notes" ? (
              <>
                <p className="rr-section-header">Notes for this case</p>
                <textarea
                  className="rr-notes-input"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Capture the clue or heuristic you want to remember."
                />
                <p className="rr-meta">Saved on this device for the current case.</p>
              </>
            ) : null}
            {activeTool === "settings" ? (
              <div className="space-y-5">
                <p className="rr-section-header">Session settings</p>
                <p className="rr-supporting">Keyboard: Enter submits. Enter or N moves to the next case after feedback.</p>
                <div className="space-y-3">
                  <p className="rr-meta">Visual skin</p>
                  <div className="rr-skin-grid" role="radiogroup" aria-label="Choose visual skin">
                    {practiceSkins.map((practiceSkin) => (
                      <button
                        key={practiceSkin.value}
                        type="button"
                        className={`rr-skin-option ${skin === practiceSkin.value ? "rr-skin-option-active" : ""}`}
                        onClick={() => setSkin(practiceSkin.value)}
                        role="radio"
                        aria-checked={skin === practiceSkin.value}
                      >
                        <span>{practiceSkin.label}</span>
                        <small>{practiceSkin.description}</small>
                      </button>
                    ))}
                  </div>
                </div>
                <Button type="button" variant="secondary" onClick={() => setShowEndSessionConfirm(true)}>
                  End session
                </Button>
              </div>
            ) : null}
          </section>
        ) : null}

        {isExplanationState && tutor ? (
          <div className="mt-7 motion-safe:animate-[whiteboardOpen_220ms_var(--rr-ease-standard)] sm:mt-8">
            <TutorMode
              tutor={tutor}
              reinforcementAnswer={reinforcementAnswer}
              reinforcementResult={reinforcementResult}
              setReinforcementAnswer={setReinforcementAnswer}
              submitReinforcementAnswer={submitReinforcementAnswer}
              loadQuestion={(targetConcept?: string) => void loadQuestion(targetConcept)}
            />
          </div>
        ) : null}

        {isExplanationState ? (
        <nav className="rr-bottom-nav mt-5" aria-label="Practice navigation">
          <button type="button" className="rr-bottom-action" onClick={() => setActiveTool("notes")}>
            □ Add to Notes
          </button>
          <Button type="button" onClick={() => void loadQuestion()}>
            Next Case →
          </Button>
        </nav>
        ) : null}
        </main>
      </div>
      {showEndSessionConfirm ? (
        <div
          className="rr-overlay fixed inset-0 z-50 flex items-center justify-center px-5 motion-safe:animate-[fadeIn_180ms_var(--rr-ease-standard)]"
          role="presentation"
        >
          <div
            aria-labelledby="end-session-title"
            aria-describedby="end-session-body"
            aria-modal="true"
            className="rr-card w-full max-w-sm p-5"
            role="dialog"
          >
            <h2 id="end-session-title" className="text-lg font-semibold">
              End this session?
            </h2>
            <p id="end-session-body" className="mt-2 text-sm leading-6 text-rr-muted">
              Your progress has been saved.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button
                ref={stayButtonRef}
                type="button"
                variant="secondary"
                onClick={() => setShowEndSessionConfirm(false)}
              >
                Stay
              </Button>
              <Button type="button" onClick={() => { window.location.href = "/"; }}>
                End session
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getFindingRoleLabel(role: VignetteFindingAnnotation["role"]) {
  switch (role) {
    case "pivot_clue":
      return "Pivot clue";
    case "supporting":
      return "Supporting clue";
    case "noise":
      return "Distractor";
    case "context":
      return "Context";
    case "neutral":
      return "Neutral";
  }
}

function getOrderedPromptFindings(prompt: string, findings: VignetteFindingAnnotation[]) {
  return findings
    .map((finding, originalIndex) => ({
      finding,
      originalIndex,
      index: prompt.toLowerCase().indexOf(finding.text.toLowerCase())
    }))
    .filter((entry) => entry.index >= 0)
    .sort((left, right) => left.index - right.index || left.originalIndex - right.originalIndex)
    .slice(0, 5);
}

function AnnotatedClinicalPrompt({
  prompt,
  findings
}: {
  prompt: string;
  findings: VignetteFindingAnnotation[];
}) {
  const orderedFindings = getOrderedPromptFindings(prompt, findings);

  if (orderedFindings.length === 0) {
    return <h1 className="rr-question-stem">{prompt}</h1>;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  orderedFindings.forEach(({ finding, index }, annotationIndex) => {
    if (index < cursor) {
      return;
    }

    if (index > cursor) {
      nodes.push(prompt.slice(cursor, index));
    }

    const end = index + finding.text.length;
    const displayText = prompt.slice(index, end);
    nodes.push(
      <span
        key={`${finding.role}-${finding.text}-${index}`}
        className={`rr-vignette-annotation rr-vignette-annotation-${finding.role.replace("_", "-")}`}
        style={{ "--rr-annotation-index": annotationIndex } as CSSProperties}
      >
        <span className="rr-vignette-highlight">{displayText}</span>
        <span className="rr-vignette-label" aria-label={`${getFindingRoleLabel(finding.role)}: ${finding.explanation ?? finding.text}`}>
          <span aria-hidden="true">←</span>
          {getFindingRoleLabel(finding.role)}
        </span>
      </span>
    );
    cursor = end;
  });

  if (cursor < prompt.length) {
    nodes.push(prompt.slice(cursor));
  }

  return <h1 className="rr-question-stem rr-question-stem-annotated">{nodes}</h1>;
}
