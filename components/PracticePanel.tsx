"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { QuestionMeta } from "@/components/QuestionMeta";
import { TutorMode } from "@/components/TutorMode";
import { getRapidRoundsVariantDisplayText } from "@/lib/rapidrounds-case";
import { usePracticeSession } from "@/hooks/usePracticeSession";
import { getClinicalPromptText, getDecisionQuestionText } from "@/lib/decision-question-text";

type PracticeTool = "repair" | "notes" | "settings" | null;

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
  const [repairSource, setRepairSource] = useState("");
  const [repairTopic, setRepairTopic] = useState("");
  const [repairAnswer, setRepairAnswer] = useState("");
  const [repairCorrectAnswer, setRepairCorrectAnswer] = useState("");
  const [repairReasoning, setRepairReasoning] = useState("");
  const [repairClues, setRepairClues] = useState("");
  const [repairSaved, setRepairSaved] = useState<string | null>(null);

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
    setRepairTopic(question.topic);
    setRepairSaved(null);
  }, [question]);

  useEffect(() => {
    if (!question) {
      return;
    }

    window.localStorage.setItem(`rr-notes-${question.id}`, notes);
  }, [notes, question]);

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

  const showTeaching = () => {
    setActiveTool(null);
    if (mode !== "tutor") {
      void requestTeaching();
      return;
    }

    window.requestAnimationFrame(() => {
      document.querySelector("[data-rr-teaching-depth]")?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };

  const saveRepairMiss = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = repairTopic.trim() || repairCorrectAnswer.trim() || question.topic;
    const payload = {
      source: repairSource.trim(),
      topic: target,
      learnerAnswer: repairAnswer.trim(),
      correctAnswer: repairCorrectAnswer.trim(),
      why: repairReasoning.trim(),
      clues: repairClues.trim(),
      createdAt: new Date().toISOString()
    };

    window.localStorage.setItem(`rr-repair-miss-${Date.now()}`, JSON.stringify(payload));
    setRepairSaved(`Saved. Launching a repair case for ${target}.`);
    setActiveTool(null);
    void loadQuestion(target);
  };

  return (
    <div className="practice-focus rr-practice-shell min-h-screen">
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
            disabled={isTeaching}
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
          <button
            type="button"
            className={`rr-tool-button ${activeTool === "repair" ? "rr-tool-button-active" : ""}`}
            onClick={() => setActiveTool(activeTool === "repair" ? null : "repair")}
          >
            <span aria-hidden="true">↺</span>
            Repair a Miss
          </button>
          <button type="button" className="rr-tool-button" onClick={showTeaching} disabled={isTeaching}>
            <span aria-hidden="true">◇</span>
            Teach Me More
          </button>
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
          <section className="rr-card rr-question-card space-y-7 px-5 py-6 motion-safe:animate-[fadeIn_180ms_var(--rr-ease-standard)] sm:space-y-8 sm:px-7 sm:py-7">
            <div className="space-y-5 sm:space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rr-badge rr-badge-learning">{mode === "tutor" ? "Explanation" : "Question"}</span>
                <span className="rr-meta">Think through the vignette first.</span>
              </div>
              <h1 className="rr-question-stem">
                {clinicalPrompt}
              </h1>
              <p className="text-lg font-medium leading-7 text-rr-foreground sm:text-xl">
                {decisionQuestion}
              </p>
            </div>

            <form onSubmit={onSubmit} className="rr-answer-dock space-y-4">
              <label className="sr-only" htmlFor="answer">
                Answer
              </label>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
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
                <Button
                  type="button"
                  variant="secondary"
                  className="px-4"
                  onClick={() => void requestTeaching()}
                  disabled={isTeaching || mode === "tutor"}
                >
                  {isTeaching ? "Preparing" : "Teach me why"}
                </Button>
              </div>
              <div className="flex min-h-11 flex-wrap items-center gap-3 pt-1">
                {result?.isCorrect ? (
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
            {activeTool === "repair" ? (
              <form className="space-y-3" onSubmit={saveRepairMiss}>
                <p className="rr-section-header">Repair a miss</p>
                <p className="rr-supporting">Summarize your reasoning. RapidRounds will launch a related repair case without storing a copied question stem.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className="rr-text-input" value={repairSource} onChange={(event) => setRepairSource(event.target.value)} placeholder="Source, optional" />
                  <input className="rr-text-input" value={repairTopic} onChange={(event) => setRepairTopic(event.target.value)} placeholder="Topic" />
                  <input className="rr-text-input" value={repairAnswer} onChange={(event) => setRepairAnswer(event.target.value)} placeholder="Your answer" />
                  <input className="rr-text-input" value={repairCorrectAnswer} onChange={(event) => setRepairCorrectAnswer(event.target.value)} placeholder="Correct answer" />
                </div>
                <textarea className="rr-notes-input" value={repairReasoning} onChange={(event) => setRepairReasoning(event.target.value)} placeholder="Why did you choose it?" />
                <textarea className="rr-notes-input" value={repairClues} onChange={(event) => setRepairClues(event.target.value)} placeholder="Key clues you remember" />
                <Button type="submit">Launch repair case</Button>
              </form>
            ) : null}
            {activeTool === "settings" ? (
              <div className="space-y-3">
                <p className="rr-section-header">Session settings</p>
                <p className="rr-supporting">Keyboard: Enter submits. Enter or N moves to the next case after feedback.</p>
                <Button type="button" variant="secondary" onClick={() => setShowEndSessionConfirm(true)}>
                  End session
                </Button>
              </div>
            ) : null}
          </section>
        ) : null}
        {repairSaved ? <p className="mt-3 rr-meta">{repairSaved}</p> : null}

        {mode === "tutor" && tutor ? (
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
