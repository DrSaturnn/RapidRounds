"use client";

import { CSSProperties, FormEvent, KeyboardEvent, ReactNode, RefObject, forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { QuestionMeta } from "@/components/QuestionMeta";
import { TutorMode } from "@/components/TutorMode";
import { getRapidRoundsVariantDisplayText } from "@/lib/rapidrounds-case";
import { usePracticeSession } from "@/hooks/usePracticeSession";
import { getClinicalPromptText, getDecisionQuestionText } from "@/lib/decision-question-text";
import type { VignetteFindingAnnotation } from "@/types/practice";

type PracticeTool = "notes" | null;
type PracticeSkin = "modern-academic" | "warm-notebook" | "dark-clinical" | "editorial";
type SettingsAnchor = "top" | "rail" | null;

const requiredSubjects = [
  "Internal Medicine",
  "Surgery",
  "Pediatrics",
  "OB/GYN",
  "Psychiatry",
  "Family Medicine",
  "Emergency Medicine",
  "Neurology"
];

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
    activeSubject,
    canGoBack,
    subjectSummaries,
    setAnswer,
    setReinforcementAnswer,
    submitAnswer,
    requestTeaching,
    submitReinforcementAnswer,
    selectSubject,
    loadQuestion,
    goBack,
    resetCurrentQuestion
  } = usePracticeSession();
  const answerInputRef = useRef<HTMLInputElement>(null);
  const stayButtonRef = useRef<HTMLButtonElement>(null);
  const asterButtonRef = useRef<HTMLButtonElement>(null);
  const asterPanelRef = useRef<HTMLDivElement>(null);
  const topSettingsRef = useRef<HTMLDivElement>(null);
  const railSettingsRef = useRef<HTMLDivElement>(null);
  const subjectSelectorRef = useRef<HTMLDivElement>(null);
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false);
  const [activeTool, setActiveTool] = useState<PracticeTool>(null);
  const [settingsAnchor, setSettingsAnchor] = useState<SettingsAnchor>(null);
  const [isSubjectSelectorOpen, setIsSubjectSelectorOpen] = useState(false);
  const [isAsterOpen, setIsAsterOpen] = useState(false);
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

        if (isSubjectSelectorOpen || settingsAnchor || isAsterOpen || activeTool) {
          setIsSubjectSelectorOpen(false);
          setSettingsAnchor(null);
          setIsAsterOpen(false);
          setActiveTool(null);
        } else if (showEndSessionConfirm) {
          setShowEndSessionConfirm(false);
        }

        return;
      }

      if (showEndSessionConfirm) {
        return;
      }

      if (isSubjectSelectorOpen || settingsAnchor || isAsterOpen) {
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
    activeTool,
    isSubjectSelectorOpen,
    isAsterOpen,
    isLoading,
    isSubmitting,
    loadQuestion,
    mode,
    reinforcementAnswer,
    reinforcementResult,
    result,
    settingsAnchor,
    showEndSessionConfirm,
    submitAnswer,
    submitReinforcementAnswer,
    tutor
  ]);

  useEffect(() => {
    if (!isSubjectSelectorOpen && !settingsAnchor && !isAsterOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (isSubjectSelectorOpen && !subjectSelectorRef.current?.contains(target)) {
        setIsSubjectSelectorOpen(false);
      }

      if (
        settingsAnchor &&
        !topSettingsRef.current?.contains(target) &&
        !railSettingsRef.current?.contains(target)
      ) {
        setSettingsAnchor(null);
      }

      if (
        isAsterOpen &&
        !asterPanelRef.current?.contains(target) &&
        !asterButtonRef.current?.contains(target)
      ) {
        setIsAsterOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isAsterOpen, isSubjectSelectorOpen, settingsAnchor]);

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

  const isExplanationState = mode === "tutor" && Boolean(tutor);
  const hasAnsweredCurrentQuestion = Boolean(result) || isExplanationState;
  const clinicalPrompt = getClinicalPromptText(hasAnsweredCurrentQuestion ? question.displayStem ?? question.stem : question.stem);
  const decisionQuestion = getDecisionQuestionText(question.decisionType);
  const learningGoal = question.topic ? `Learning goal: ${question.topic}` : "Learning goal: make the next clinical decision";
  const displayDecisionCount = Math.max(sessionDecisionCount, 1);
  const totalDecisionCount = 96;
  const topicLabel = question.canonicalProblem ?? question.system ?? question.topic;
  const variantLabel = getRapidRoundsVariantDisplayText(question.variantType);
  const visibleVignetteFindings = hasAnsweredCurrentQuestion
    ? tutor?.vignetteFindings ?? question.vignetteFindings ?? []
    : [];
  const subjectCountByName = new Map(subjectSummaries.map((item) => [item.subject, item.count]));
  const subjectOptions = requiredSubjects.map((subject) => ({
    subject,
    count: subjectCountByName.get(subject) ?? 0
  }));
  const activeSubjectCount = subjectCountByName.get(activeSubject) ?? subjectCountByName.get(question.specialty) ?? 0;
  const displayedTotalDecisionCount = activeSubjectCount || totalDecisionCount;
  const progressPercent = Math.min(100, Math.max(1, (displayDecisionCount / displayedTotalDecisionCount) * 100));
  const progressDots = Array.from({ length: 18 }, (_, index) => index < Math.round((progressPercent / 100) * 18));

  const showTeaching = () => {
    setActiveTool(null);
    setIsSubjectSelectorOpen(false);
    setSettingsAnchor(null);
    if (!isExplanationState) {
      answerInputRef.current?.focus();
      return;
    }

    window.requestAnimationFrame(() => {
      document.querySelector("[data-rr-teaching-depth]")?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };

  const handleContinue = () => {
    setIsSubjectSelectorOpen(false);
    setSettingsAnchor(null);
    setIsAsterOpen(false);

    if (isExplanationState || result?.isCorrect) {
      void loadQuestion();
      return;
    }

    answerInputRef.current?.focus();
  };

  const canAdvance = Boolean(isExplanationState || result?.isCorrect);

  const handleBack = () => {
    setActiveTool(null);
    setSettingsAnchor(null);
    setIsAsterOpen(false);
    setIsSubjectSelectorOpen(false);
    goBack();
  };

  const handleReset = () => {
    setActiveTool(null);
    setSettingsAnchor(null);
    setIsAsterOpen(false);
    setIsSubjectSelectorOpen(false);
    resetCurrentQuestion();
    window.requestAnimationFrame(() => {
      answerInputRef.current?.focus();
    });
  };

  const handleNextCase = () => {
    if (!canAdvance) {
      return;
    }

    void loadQuestion();
  };

  const toggleSettings = (anchor: Exclude<SettingsAnchor, null>) => {
    setActiveTool(null);
    setIsAsterOpen(false);
    setIsSubjectSelectorOpen(false);
    setSettingsAnchor(settingsAnchor === anchor ? null : anchor);
  };

  const selectSkin = (nextSkin: PracticeSkin) => {
    setSkin(nextSkin);
    setSettingsAnchor(null);
  };

  const toggleAster = () => {
    setActiveTool(null);
    setSettingsAnchor(null);
    setIsSubjectSelectorOpen(false);
    setIsAsterOpen((current) => !current);
  };

  const toggleSubjectSelector = () => {
    setActiveTool(null);
    setSettingsAnchor(null);
    setIsAsterOpen(false);
    setIsSubjectSelectorOpen((current) => !current);
  };

  const handleSubjectSelect = (subject: string) => {
    setIsSubjectSelectorOpen(false);
    if (subject !== activeSubject) {
      selectSubject(subject);
    }
  };

  const renderSubjectSelector = () => (
    <div className="rr-popover rr-subject-popover" role="dialog" aria-label="Choose shelf">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="rr-section-header">Choose shelf</p>
          <p className="rr-meta mt-1">Only shelves with real cases are selectable.</p>
        </div>
        <button type="button" className="rr-icon-button" aria-label="Close shelf selector" onClick={() => setIsSubjectSelectorOpen(false)}>
          ×
        </button>
      </div>
      <div className="rr-subject-grid">
        {subjectOptions.map(({ subject, count }) => {
          const isSelected = subject === activeSubject;
          const isAvailable = count > 0;

          return (
            <button
              key={subject}
              type="button"
              className={`rr-subject-option ${isSelected ? "rr-subject-option-active" : ""}`}
              onClick={() => handleSubjectSelect(subject)}
              disabled={!isAvailable}
              aria-pressed={isSelected}
            >
              <span>{subject}</span>
              <small>{isAvailable ? `${count} cases` : "Coming soon"}</small>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderThemePopover = () => (
    <div className="rr-popover rr-theme-popover" role="dialog" aria-label="Choose visual skin">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="rr-section-header">Visual skin</p>
          <p className="rr-meta mt-1">Applies immediately and stays on this device.</p>
        </div>
        <button type="button" className="rr-icon-button" aria-label="Close visual skin picker" onClick={() => setSettingsAnchor(null)}>
          ×
        </button>
      </div>
      <div className="rr-skin-list" role="radiogroup" aria-label="Choose visual skin">
        {practiceSkins.map((practiceSkin) => (
          <button
            key={practiceSkin.value}
            type="button"
            className={`rr-skin-option ${skin === practiceSkin.value ? "rr-skin-option-active" : ""}`}
            onClick={() => selectSkin(practiceSkin.value)}
            role="radio"
            aria-checked={skin === practiceSkin.value}
          >
            <span>{practiceSkin.label}</span>
            <small>{practiceSkin.description}</small>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="rr-session-link mt-4"
        onClick={() => {
          setSettingsAnchor(null);
          setShowEndSessionConfirm(true);
        }}
      >
        End session
      </button>
    </div>
  );

  const renderTopSessionActions = () => (
    <div className="rr-product-actions" aria-label="Session tools">
      <button
        ref={asterButtonRef}
        type="button"
        className="rr-aster-button"
        aria-label="Ask Aster to explain this decision"
        aria-expanded={isAsterOpen}
        aria-controls="aster-companion"
        onClick={toggleAster}
      >
        <span aria-hidden="true">✧</span>
        <span className="rr-action-label">Aster</span>
      </button>
      <div className="rr-menu-anchor" ref={topSettingsRef}>
        <button
          type="button"
          className="rr-menu-button"
          aria-label="Open session settings"
          aria-expanded={settingsAnchor === "top"}
          onClick={() => toggleSettings("top")}
        >
          ☰
        </button>
        {settingsAnchor === "top" ? renderThemePopover() : null}
      </div>
    </div>
  );

  const renderDesktopCaseControls = () => (
    <>
      <button type="button" className="rr-tool-button rr-desktop-session-control" onClick={handleBack} disabled={!canGoBack}>
        <span aria-hidden="true">←</span>
        Back
      </button>
      <button type="button" className="rr-tool-button rr-desktop-session-control" onClick={handleReset}>
        <span aria-hidden="true">↺</span>
        Reset
      </button>
    </>
  );

  const renderMobilePracticeActions = () => (
    <nav className="rr-mobile-practice-actions" aria-label="Mobile practice actions">
      <button type="button" className="rr-mobile-action" onClick={handleBack} disabled={!canGoBack}>
        <span aria-hidden="true">←</span>
        <span>Back</span>
      </button>
      <button type="button" className="rr-mobile-action" onClick={handleReset}>
        <span aria-hidden="true">↺</span>
        <span>Reset</span>
      </button>
      <button type="button" className="rr-mobile-action rr-mobile-action-primary" onClick={handleNextCase} disabled={!canAdvance}>
        <span>Next</span>
        <span aria-hidden="true">→</span>
      </button>
    </nav>
  );

  if (skin === "warm-notebook") {
    return (
      <MoleskinePracticeLayout
        topbar={
          <header className="rr-product-nav rr-moleskine-topbar">
            <div className="rr-product-brand">
              <span className="rr-brand-mark" aria-hidden="true">✳</span>
              <span>RapidRounds</span>
              <span className="rr-brand-subtitle">with Aster</span>
            </div>
            <div className="rr-product-context" aria-label="Current training context">
              <div className="rr-subject-anchor" ref={subjectSelectorRef}>
                <button
                  type="button"
                  className="rr-subject-pill"
                  aria-label="Choose shelf"
                  aria-expanded={isSubjectSelectorOpen}
                  onClick={toggleSubjectSelector}
                >
                  {activeSubject}
                  <span aria-hidden="true">⌄</span>
                </button>
                {isSubjectSelectorOpen ? renderSubjectSelector() : null}
              </div>
              <span className="rr-context-divider" aria-hidden="true" />
              <span className="rr-context-topic">{topicLabel}</span>
              {variantLabel ? <span className="rr-context-variant">{variantLabel}</span> : null}
            </div>
            <div className="rr-product-progress" aria-label={`Question ${displayDecisionCount} of ${displayedTotalDecisionCount}`}>
              <span className="rr-progress-count">Q {displayDecisionCount} / {displayedTotalDecisionCount}</span>
              <span className="rr-progress-dots" aria-hidden="true">
                {progressDots.map((isActive, index) => (
                  <span key={index} className={isActive ? "rr-progress-dot-active" : ""} />
                ))}
              </span>
            </div>
            {renderTopSessionActions()}
          </header>
        }
        sidebar={
          <MoleskineSidebar>
            <button type="button" className="rr-tool-button" onClick={handleContinue}>
              <span aria-hidden="true">▷</span>
              Continue
            </button>
            {renderDesktopCaseControls()}
            {isExplanationState ? (
              <button type="button" className="rr-tool-button" onClick={showTeaching} disabled={isTeaching}>
                <span aria-hidden="true">◇</span>
                Teach Me More
              </button>
            ) : null}
            <button
              type="button"
              className={`rr-tool-button ${activeTool === "notes" ? "rr-tool-button-active" : ""}`}
              onClick={() => {
                setSettingsAnchor(null);
                setIsAsterOpen(false);
                setIsSubjectSelectorOpen(false);
                setActiveTool(activeTool === "notes" ? null : "notes");
              }}
            >
              <span aria-hidden="true">□</span>
              Notes
            </button>
            <div className="rr-tool-popover-anchor" ref={railSettingsRef}>
              <button
                type="button"
                className={`rr-tool-button w-full ${settingsAnchor === "rail" ? "rr-tool-button-active" : ""}`}
                aria-expanded={settingsAnchor === "rail"}
                onClick={() => toggleSettings("rail")}
              >
                <span aria-hidden="true">☾</span>
                Settings
              </button>
              {settingsAnchor === "rail" ? renderThemePopover() : null}
            </div>
          </MoleskineSidebar>
        }
        spread={
          <MoleskineNotebookSpread isExplanationState={isExplanationState}>
            <div className="rr-moleskine-page-goal">
              <QuestionMeta question={question} />
              <p className="rr-meta">{learningGoal}</p>
            </div>
            {isExplanationState && tutor ? (
              <TutorMode
                tutor={tutor}
                reinforcementAnswer={reinforcementAnswer}
                reinforcementResult={reinforcementResult}
                setReinforcementAnswer={setReinforcementAnswer}
                submitReinforcementAnswer={submitReinforcementAnswer}
                loadQuestion={(targetConcept?: string) => void loadQuestion(targetConcept)}
                presentation="moleskine"
                moleskineLeftPageContent={
                  <>
                    <div className="rr-moleskine-question-intro">
                      <span className="rr-badge rr-badge-learning">Explanation</span>
                      <span className="rr-meta">Think through the vignette first.</span>
                    </div>
                    <AnnotatedClinicalPrompt prompt={clinicalPrompt} findings={visibleVignetteFindings} />
                    <p className="rr-decision-question">{decisionQuestion}</p>
                  </>
                }
              />
            ) : (
              <>
                <MoleskineLeftPage>
                  <div className="rr-moleskine-question-intro">
                    <span className="rr-badge rr-badge-learning">Question</span>
                    <span className="rr-meta">Think through the vignette first.</span>
                  </div>
                  <AnnotatedClinicalPrompt prompt={clinicalPrompt} findings={visibleVignetteFindings} />
                  <p className="rr-decision-question">{decisionQuestion}</p>
                <form onSubmit={onSubmit} className="rr-answer-dock rr-moleskine-solve-form">
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
                      <Button type="submit" disabled={isSubmitting || mode === "tutor"}>
                        {isSubmitting ? "Checking" : "Submit"}
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-xs text-rr-muted" aria-live="polite">
                    {keyboardHint}
                  </p>
                  {error ? <p className="text-sm text-rr-muted">{error}</p> : null}
                </form>
                </MoleskineLeftPage>
              </>
            )}
          </MoleskineNotebookSpread>
        }
        notes={
          activeTool === "notes" ? (
            <section className="rr-tool-panel rr-panel rr-moleskine-page-section">
              <p className="rr-section-header">Notes for this case</p>
              <textarea
                className="rr-notes-input"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Capture the clue or heuristic you want to remember."
              />
              <p className="rr-meta">Saved on this device for the current case.</p>
            </section>
          ) : null
        }
        footer={
          isExplanationState ? (
            <MoleskineFooterActions>
              <button type="button" className="rr-bottom-action" onClick={() => setActiveTool("notes")}>
                □ Add to Notes
              </button>
              <Button type="button" onClick={() => void loadQuestion()}>
                Next Case →
              </Button>
            </MoleskineFooterActions>
          ) : null
        }
        overlays={
          <>
            {isAsterOpen ? (
              <AsterCompanion
                ref={asterPanelRef}
                currentCaseTitle={topicLabel}
                onClose={() => setIsAsterOpen(false)}
              />
            ) : null}
            {showEndSessionConfirm ? (
              <EndSessionDialog
                stayButtonRef={stayButtonRef}
                onStay={() => setShowEndSessionConfirm(false)}
                onEnd={() => { window.location.href = "/"; }}
              />
            ) : null}
            {renderMobilePracticeActions()}
          </>
        }
      />
    );
  }

  return (
    <div className="practice-focus rr-practice-shell rr-moleskine-root min-h-screen" data-theme={skin}>
      <header className="rr-product-nav rr-moleskine-topbar">
        <div className="rr-product-brand">
          <span className="rr-brand-mark" aria-hidden="true">✳</span>
          <span>RapidRounds</span>
          <span className="rr-brand-subtitle">with Aster</span>
        </div>
        <div className="rr-product-context" aria-label="Current training context">
          <div className="rr-subject-anchor" ref={subjectSelectorRef}>
            <button
              type="button"
              className="rr-subject-pill"
              aria-label="Choose shelf"
              aria-expanded={isSubjectSelectorOpen}
              onClick={toggleSubjectSelector}
            >
              {activeSubject}
              <span aria-hidden="true">⌄</span>
            </button>
            {isSubjectSelectorOpen ? renderSubjectSelector() : null}
          </div>
          <span className="rr-context-divider" aria-hidden="true" />
          <span className="rr-context-topic">{topicLabel}</span>
          {variantLabel ? <span className="rr-context-variant">{variantLabel}</span> : null}
        </div>
        <div className="rr-product-progress" aria-label={`Question ${displayDecisionCount} of ${displayedTotalDecisionCount}`}>
          <span className="rr-progress-count">Q {displayDecisionCount} / {displayedTotalDecisionCount}</span>
          <span className="rr-progress-dots" aria-hidden="true">
            {progressDots.map((isActive, index) => (
              <span key={index} className={isActive ? "rr-progress-dot-active" : ""} />
            ))}
          </span>
        </div>
        {renderTopSessionActions()}
      </header>

      <div className="rr-notebook-shell rr-notebook-surface rr-moleskine-shell">
        <aside className="rr-tool-rail rr-panel rr-moleskine-sidebar-page" aria-label="Practice tools">
          <button type="button" className="rr-tool-button" onClick={handleContinue}>
            <span aria-hidden="true">▷</span>
            Continue
          </button>
          {renderDesktopCaseControls()}
          {isExplanationState ? (
            <button type="button" className="rr-tool-button" onClick={showTeaching} disabled={isTeaching}>
              <span aria-hidden="true">◇</span>
              Teach Me More
            </button>
          ) : null}
          <button
            type="button"
            className={`rr-tool-button ${activeTool === "notes" ? "rr-tool-button-active" : ""}`}
            onClick={() => {
              setSettingsAnchor(null);
              setIsAsterOpen(false);
              setIsSubjectSelectorOpen(false);
              setActiveTool(activeTool === "notes" ? null : "notes");
            }}
          >
            <span aria-hidden="true">□</span>
            Notes
          </button>
          <div className="rr-tool-popover-anchor" ref={railSettingsRef}>
            <button
              type="button"
              className={`rr-tool-button w-full ${settingsAnchor === "rail" ? "rr-tool-button-active" : ""}`}
              aria-expanded={settingsAnchor === "rail"}
              onClick={() => toggleSettings("rail")}
            >
              <span aria-hidden="true">☾</span>
              Settings
            </button>
            {settingsAnchor === "rail" ? renderThemePopover() : null}
          </div>
        </aside>

        <main className={`rr-practice-main rr-moleskine-main-spread ${mode === "tutor" ? "rr-practice-main-wide" : ""}`}>
          <div className="rr-moleskine-page-goal mb-5 flex flex-wrap items-center justify-between gap-3">
            <QuestionMeta question={question} />
            <p className="rr-meta">{learningGoal}</p>
          </div>
          <section className={`rr-card rr-question-card rr-vignette-card rr-card-paper rr-moleskine-left-page space-y-5 px-5 py-5 motion-safe:animate-[fadeIn_180ms_var(--rr-ease-standard)] sm:px-7 ${isExplanationState ? "rr-question-card-compact" : "sm:py-7"}`}>
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

        {activeTool === "notes" ? (
          <section className="rr-tool-panel rr-panel rr-moleskine-page-section mt-5 motion-safe:animate-[fadeIn_180ms_var(--rr-ease-standard)]">
            <p className="rr-section-header">Notes for this case</p>
            <textarea
              className="rr-notes-input"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Capture the clue or heuristic you want to remember."
            />
            <p className="rr-meta">Saved on this device for the current case.</p>
          </section>
        ) : null}

        {isExplanationState && tutor ? (
          <div className="rr-moleskine-learning-layer mt-7 motion-safe:animate-[whiteboardOpen_220ms_var(--rr-ease-standard)] sm:mt-8">
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
        <nav className="rr-bottom-nav rr-panel rr-moleskine-footer-strip mt-5" aria-label="Practice navigation">
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
      {isAsterOpen ? (
        <AsterCompanion
          ref={asterPanelRef}
          currentCaseTitle={topicLabel}
          onClose={() => setIsAsterOpen(false)}
        />
      ) : null}
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
      {renderMobilePracticeActions()}
    </div>
  );
}

function MoleskinePracticeLayout({
  topbar,
  sidebar,
  spread,
  notes,
  footer,
  overlays
}: {
  topbar: ReactNode;
  sidebar: ReactNode;
  spread: ReactNode;
  notes: ReactNode;
  footer: ReactNode;
  overlays: ReactNode;
}) {
  return (
    <div className="practice-focus rr-practice-shell rr-moleskine-root min-h-screen" data-theme="warm-notebook">
      {topbar}
      <MoleskineShell>
        {sidebar}
        <main className="rr-practice-main rr-practice-main-wide rr-moleskine-main-spread">
          {spread}
          {notes}
          {footer}
        </main>
      </MoleskineShell>
      {overlays}
    </div>
  );
}

function MoleskineShell({ children }: { children: ReactNode }) {
  return <div className="rr-notebook-shell rr-notebook-surface rr-moleskine-shell">{children}</div>;
}

function MoleskineSidebar({ children }: { children: ReactNode }) {
  return (
    <aside className="rr-tool-rail rr-panel rr-moleskine-sidebar-page" aria-label="Practice tools">
      {children}
    </aside>
  );
}

function MoleskineNotebookSpread({
  children,
  isExplanationState
}: {
  children: ReactNode;
  isExplanationState: boolean;
}) {
  return (
    <div className={`rr-moleskine-notebook-spread ${isExplanationState ? "rr-moleskine-learn-spread" : "rr-moleskine-solve-spread"}`}>
      {children}
    </div>
  );
}

function MoleskineLeftPage({ children }: { children: ReactNode }) {
  return (
    <section className="rr-card rr-question-card rr-vignette-card rr-card-paper rr-moleskine-left-page">
      {children}
    </section>
  );
}

function MoleskineFooterActions({ children }: { children: ReactNode }) {
  return (
    <nav className="rr-bottom-nav rr-panel rr-moleskine-footer-strip" aria-label="Practice navigation">
      {children}
    </nav>
  );
}

function EndSessionDialog({
  stayButtonRef,
  onStay,
  onEnd
}: {
  stayButtonRef: RefObject<HTMLButtonElement | null>;
  onStay: () => void;
  onEnd: () => void;
}) {
  return (
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
            onClick={onStay}
          >
            Stay
          </Button>
          <Button type="button" onClick={onEnd}>
            End session
          </Button>
        </div>
      </div>
    </div>
  );
}

const AsterCompanion = forwardRef<
  HTMLDivElement,
  {
    currentCaseTitle: string;
    onClose: () => void;
  }
>(function AsterCompanion({ currentCaseTitle, onClose }, ref) {
  return (
    <aside
      ref={ref}
      id="aster-companion"
      className="rr-aster-companion"
      aria-label="Aster companion"
      role="dialog"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="rr-section-header">Aster</p>
          <h2 className="mt-1 text-lg font-semibold text-rr-foreground">Ask about this case.</h2>
        </div>
        <button type="button" className="rr-icon-button" aria-label="Close Aster" onClick={onClose}>
          ×
        </button>
      </div>
      <p className="mt-4 text-sm leading-6 text-rr-muted">
        Aster will eventually answer questions about the current case, your reasoning, and the explanation.
        Case-aware chat is coming soon.
      </p>
      <div className="rr-panel-collapsed mt-4">
        <p className="rr-meta">Current case</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-rr-foreground">{currentCaseTitle}</p>
      </div>
      {/* Future Aster should receive current case, learner answer, correct answer, explanation, decision boundary, and learner state. */}
      <input
        className="rr-text-input mt-4"
        disabled
        placeholder="Case-aware chat coming soon"
        aria-label="Aster chat coming soon"
      />
    </aside>
  );
});

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
