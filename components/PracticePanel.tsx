"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { QuestionMeta } from "@/components/QuestionMeta";
import { TutorMode } from "@/components/TutorMode";
import { usePracticeSession } from "@/hooks/usePracticeSession";
import { getClinicalPromptText, getDecisionQuestionText } from "@/lib/decision-question-text";

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

  return (
    <div className="practice-focus min-h-screen bg-rr-background">
      <div className="mx-auto flex min-h-screen w-full max-w-practice flex-col justify-center px-5 py-10 sm:px-6 sm:py-14">
        <div className="mb-12 flex items-center justify-between text-xs text-rr-muted sm:mb-16">
          <span>Decision {String(sessionDecisionCount).padStart(2, "0")}</span>
          <QuestionMeta question={question} />
        </div>

        <section className="rr-card space-y-8 px-5 py-6 motion-safe:animate-[fadeIn_180ms_var(--rr-ease-standard)] sm:px-6 sm:py-7">
          <div className="space-y-5">
            <h1 className="rr-question-stem">
              {clinicalPrompt}
            </h1>
            <p className="text-lg font-medium leading-7 text-rr-foreground sm:text-xl">
              {decisionQuestion}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
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
              <Button
                type="button"
                variant="secondary"
                className="px-4"
                onClick={() => void requestTeaching()}
                disabled={isTeaching || mode === "tutor"}
              >
                {isTeaching ? "Loading" : "Teach Me"}
              </Button>
            </div>
            <div className="flex min-h-11 flex-wrap items-center gap-3 pt-2">
              {!result ? (
                <Button
                  type="submit"
                  disabled={isSubmitting || mode === "tutor"}
                >
                  {isSubmitting ? "Checking" : "Submit"}
                </Button>
              ) : result.isCorrect ? (
                <Button type="button" onClick={() => void loadQuestion()}>
                  Next
                </Button>
              ) : null}
              {mode === "rapid" && result?.isCorrect ? (
                <div className="max-w-xl text-sm leading-6 motion-safe:animate-[fadeIn_180ms_var(--rr-ease-standard)]">
                  <span className="font-semibold text-rr-success">Correct.</span>
                  <span className="ml-3 text-rr-muted">{result.boardPearl}</span>
                </div>
              ) : null}
              {mode === "rapid" && result && !result.isCorrect ? (
                <p className="text-sm font-medium">Let's slow down for one teaching pass.</p>
              ) : null}
              {error ? <p className="text-sm text-rr-muted">{error}</p> : null}
            </div>
            <p className="text-xs text-rr-muted" aria-live="polite">
              {keyboardHint}
            </p>
          </form>
        </section>

        {mode === "tutor" && tutor ? (
          <div className="mt-10 motion-safe:animate-[whiteboardOpen_220ms_var(--rr-ease-standard)]">
            <TutorMode
              tutor={tutor}
              reinforcementAnswer={reinforcementAnswer}
              reinforcementResult={reinforcementResult}
              setReinforcementAnswer={setReinforcementAnswer}
              submitReinforcementAnswer={submitReinforcementAnswer}
              loadQuestion={() => void loadQuestion()}
            />
          </div>
        ) : null}
      </div>
      {showEndSessionConfirm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 px-5 motion-safe:animate-[fadeIn_180ms_var(--rr-ease-standard)]"
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
