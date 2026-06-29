"use client";

import { CSSProperties, FormEvent, KeyboardEvent, ReactNode, RefObject, forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { MoleskinePracticeRenderer } from "@/components/moleskine/MoleskinePracticeRenderer";
import { QuestionMeta } from "@/components/QuestionMeta";
import { TutorMode } from "@/components/TutorMode";
import { buildClinicalNotebookViewModel } from "@/lib/clinical-notebook-view-model";
import { usePracticeSession } from "@/hooks/usePracticeSession";
import type { QuestionBreadth, StudySessionMode } from "@/hooks/usePracticeSession";
import { getClinicalPromptText, getDecisionQuestionText } from "@/lib/decision-question-text";
import { SUBJECTS } from "@/lib/subject-seeds";
import type { VignetteFindingAnnotation } from "@/types/practice";

type PracticeTool = "notes" | null;
type PracticeSkin = "modern-academic" | "warm-notebook" | "dark-clinical" | "editorial";
type SettingsAnchor = "top" | "rail" | null;

const requiredSubjects = SUBJECTS;

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

const studyModes: Array<{ value: StudySessionMode; label: string; description: string }> = [
  {
    value: "adaptive",
    label: "Adaptive",
    description: "RapidRounds chooses the next highest-value case."
  },
  {
    value: "new_concepts",
    label: "New Concepts",
    description: "Prefer cases you have not completed yet."
  },
  {
    value: "weak_areas",
    label: "Weak Areas",
    description: "Prioritize recent misses and fragile patterns."
  },
  {
    value: "review",
    label: "Review",
    description: "Revisit prior material for reinforcement."
  },
  {
    value: "rapid_round",
    label: "Rapid Round",
    description: "Keep moving through short clinical decisions."
  }
];

const questionBreadthOptions: Array<{ value: QuestionBreadth; label: string; description: string }> = [
  {
    value: "primary",
    label: "Primary",
    description: "Core shelf-style presentations and first decisions."
  },
  {
    value: "expanded",
    label: "Expanded",
    description: "Adds common variants and next-step transitions."
  },
  {
    value: "comprehensive",
    label: "Comprehensive",
    description: "Includes downstream branches, complications, and broad review."
  }
];

function getStudyModeLabel(studyMode: StudySessionMode) {
  return studyModes.find((mode) => mode.value === studyMode)?.label ?? "Adaptive";
}

function isPracticeSkin(value: string | null): value is PracticeSkin {
  return Boolean(value && practiceSkins.some((skin) => skin.value === value));
}

function getToolIcons(skin: PracticeSkin) {
  const icons: Record<PracticeSkin, Record<"continue" | "back" | "reset" | "teach" | "notes" | "settings", string>> = {
    "modern-academic": {
      continue: "▶",
      back: "←",
      reset: "↺",
      teach: "✦",
      notes: "▣",
      settings: "⚙"
    },
    "warm-notebook": {
      continue: "▷",
      back: "←",
      reset: "↺",
      teach: "◇",
      notes: "□",
      settings: "☾"
    },
    "dark-clinical": {
      continue: "▶",
      back: "⟵",
      reset: "⟳",
      teach: "✧",
      notes: "▤",
      settings: "☰"
    },
    editorial: {
      continue: "›",
      back: "‹",
      reset: "↻",
      teach: "※",
      notes: "◫",
      settings: "☷"
    }
  };

  return icons[skin];
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
    activeStudyMode,
    questionBreadth,
    clinicalCueLevel,
    clinicalCuePrompt,
    canGoBack,
    subjectSummaries,
    setAnswer,
    setReinforcementAnswer,
    submitAnswer,
    requestTeaching,
    requestClinicalCue,
    revealAnswer,
    submitReinforcementAnswer,
    selectSubject,
    selectStudyMode,
    selectQuestionBreadth,
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
  const studyModeSelectorRef = useRef<HTMLDivElement>(null);
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false);
  const [activeTool, setActiveTool] = useState<PracticeTool>(null);
  const [settingsAnchor, setSettingsAnchor] = useState<SettingsAnchor>(null);
  const [isSubjectSelectorOpen, setIsSubjectSelectorOpen] = useState(false);
  const [isStudyModeSelectorOpen, setIsStudyModeSelectorOpen] = useState(false);
  const [isAsterOpen, setIsAsterOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [skin, setSkin] = useState<PracticeSkin>("modern-academic");
  const toolIcons = getToolIcons(skin);

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

        if (isSubjectSelectorOpen || isStudyModeSelectorOpen || settingsAnchor || isAsterOpen || activeTool) {
          setIsSubjectSelectorOpen(false);
          setIsStudyModeSelectorOpen(false);
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

      if (isSubjectSelectorOpen || isStudyModeSelectorOpen || settingsAnchor || isAsterOpen) {
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
    isStudyModeSelectorOpen,
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
    if (!isSubjectSelectorOpen && !isStudyModeSelectorOpen && !settingsAnchor && !isAsterOpen) {
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

      if (isStudyModeSelectorOpen && !studyModeSelectorRef.current?.contains(target)) {
        setIsStudyModeSelectorOpen(false);
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
  }, [isAsterOpen, isStudyModeSelectorOpen, isSubjectSelectorOpen, settingsAnchor]);

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
  const learningGoal = "Learning goal: make the next clinical decision";
  const displayDecisionCount = Math.max(sessionDecisionCount, 1);
  const totalDecisionCount = 96;
  const topicLabel = getStudyModeLabel(activeStudyMode);
  const asterCaseTitle = question.topic || topicLabel;
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
  const clinicalNotebook = buildClinicalNotebookViewModel({
    question,
    tutor,
    result,
    hasAnswered: hasAnsweredCurrentQuestion,
    subject: activeSubject,
    sessionDecisionCount: displayDecisionCount,
    displayedTotalDecisionCount,
    progressDots,
    decisionQuestion
  });

  const showTeaching = () => {
    setActiveTool(null);
    setIsSubjectSelectorOpen(false);
    setIsStudyModeSelectorOpen(false);
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
    setIsStudyModeSelectorOpen(false);
    setSettingsAnchor(null);
    setIsAsterOpen(false);

    if (isExplanationState || result?.isCorrect) {
      void loadQuestion();
      return;
    }

    answerInputRef.current?.focus();
  };

  const canAdvance = Boolean(isExplanationState || result?.isCorrect);
  const canUseClinicalCue = Boolean(question.clinicalCues && !hasAnsweredCurrentQuestion && mode === "rapid");

  const renderClinicalCuePanel = () => {
    if (!canUseClinicalCue || !question.clinicalCues) {
      return clinicalCuePrompt ? (
        <p className="rr-clinical-cue-prompt" role="status">{clinicalCuePrompt}</p>
      ) : null;
    }

    const cues = question.clinicalCues;

    return (
      <section className="rr-clinical-cue-panel" aria-label="Clinical cue">
        <div className="rr-clinical-cue-actions">
          <button
            type="button"
            className="rr-clinical-cue-button"
            onClick={requestClinicalCue}
            disabled={clinicalCueLevel >= 3 || isSubmitting}
          >
            Clinical Cue
          </button>
          {clinicalCueLevel >= 3 ? (
            <button
              type="button"
              className="rr-clinical-cue-reveal"
              onClick={() => void revealAnswer()}
              disabled={isSubmitting}
            >
              Reveal
            </button>
          ) : null}
        </div>
        {clinicalCuePrompt ? <p className="rr-clinical-cue-prompt" role="status">{clinicalCuePrompt}</p> : null}
        {clinicalCueLevel >= 1 ? (
          <div className="rr-clinical-cue-stage">
            <span>Cue 1 · Pivot only</span>
            <strong>{cues.pivotClue}</strong>
          </div>
        ) : null}
        {clinicalCueLevel >= 2 && cues.schemaScaffold.length > 0 ? (
          <div className="rr-clinical-cue-stage">
            <span>Cue 2 · Schema scaffold</span>
            <div className="rr-clinical-cue-chain">
              {cues.schemaScaffold.map((step, index) => (
                <em key={`${step}-${index}`}>{step}</em>
              ))}
            </div>
          </div>
        ) : null}
        {clinicalCueLevel >= 3 && cues.decisionBoundary ? (
          <div className="rr-clinical-cue-stage">
            <span>Cue 3 · Decision boundary</span>
            <div className="rr-clinical-cue-boundary">
              <strong>{cues.decisionBoundary.conceptA}</strong>
              <span>vs</span>
              <strong>{cues.decisionBoundary.conceptB}</strong>
            </div>
            <p>{cues.decisionBoundary.pivot}</p>
          </div>
        ) : null}
      </section>
    );
  };

  const handleBack = () => {
    setActiveTool(null);
    setSettingsAnchor(null);
    setIsAsterOpen(false);
    setIsSubjectSelectorOpen(false);
    setIsStudyModeSelectorOpen(false);
    goBack();
  };

  const handleReset = () => {
    setActiveTool(null);
    setSettingsAnchor(null);
    setIsAsterOpen(false);
    setIsSubjectSelectorOpen(false);
    setIsStudyModeSelectorOpen(false);
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
    setIsStudyModeSelectorOpen(false);
    setSettingsAnchor(settingsAnchor === anchor ? null : anchor);
  };

  const selectSkin = (nextSkin: PracticeSkin) => {
    setSkin(nextSkin);
    setSettingsAnchor(null);
  };

  const handleQuestionBreadthSelect = (breadth: QuestionBreadth) => {
    selectQuestionBreadth(breadth);
    setSettingsAnchor(null);
  };

  const toggleAster = () => {
    setActiveTool(null);
    setSettingsAnchor(null);
    setIsSubjectSelectorOpen(false);
    setIsStudyModeSelectorOpen(false);
    setIsAsterOpen((current) => !current);
  };

  const toggleSubjectSelector = () => {
    setActiveTool(null);
    setSettingsAnchor(null);
    setIsAsterOpen(false);
    setIsStudyModeSelectorOpen(false);
    setIsSubjectSelectorOpen((current) => !current);
  };

  const handleSubjectSelect = (subject: string) => {
    setIsSubjectSelectorOpen(false);
    if (subject !== activeSubject) {
      selectSubject(subject);
    }
  };

  const handleStudyModeSelect = (studyMode: StudySessionMode) => {
    setIsStudyModeSelectorOpen(false);
    if (studyMode !== activeStudyMode) {
      selectStudyMode(studyMode);
    }
  };

  const toggleStudyModeSelector = () => {
    setActiveTool(null);
    setSettingsAnchor(null);
    setIsAsterOpen(false);
    setIsSubjectSelectorOpen(false);
    setIsStudyModeSelectorOpen((current) => !current);
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

  const renderStudyModeSelector = () => (
    <div className="rr-popover rr-study-mode-popover" role="dialog" aria-label="Choose study mode">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="rr-section-header">Study mode</p>
          <p className="rr-meta mt-1">Choose the broad session style. RapidRounds picks the specific case.</p>
        </div>
        <button type="button" className="rr-icon-button" aria-label="Close study mode selector" onClick={() => setIsStudyModeSelectorOpen(false)}>
          ×
        </button>
      </div>
      <div className="rr-study-mode-list">
        {studyModes.map((studyMode) => {
          const isSelected = studyMode.value === activeStudyMode;

          return (
            <button
              key={studyMode.value}
              type="button"
              className={`rr-study-mode-option ${isSelected ? "rr-study-mode-option-active" : ""}`}
              onClick={() => handleStudyModeSelect(studyMode.value)}
              aria-pressed={isSelected}
            >
              <span>{studyMode.label}</span>
              <small>{studyMode.description}</small>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderStudyModeControl = () => (
    <div className="rr-study-mode-anchor" ref={studyModeSelectorRef}>
      <button
        type="button"
        className="rr-study-mode-pill"
        aria-label="Choose study mode"
        aria-expanded={isStudyModeSelectorOpen}
        onClick={toggleStudyModeSelector}
      >
        {getStudyModeLabel(activeStudyMode)}
        <span aria-hidden="true">⌄</span>
      </button>
      {isStudyModeSelectorOpen ? renderStudyModeSelector() : null}
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
      <div className="rr-settings-divider" />
      <div>
        <p className="rr-section-header">Shelf breadth</p>
        <p className="rr-meta mt-1">Choose how broadly RapidRounds samples each shelf.</p>
      </div>
      <div className="rr-breadth-list mt-3" role="radiogroup" aria-label="Choose shelf breadth">
        {questionBreadthOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`rr-breadth-option ${questionBreadth === option.value ? "rr-breadth-option-active" : ""}`}
            onClick={() => handleQuestionBreadthSelect(option.value)}
            role="radio"
            aria-checked={questionBreadth === option.value}
          >
            <span>{option.label}</span>
            <small>{option.description}</small>
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
        <span aria-hidden="true">{toolIcons.back}</span>
        Back
      </button>
      <button type="button" className="rr-tool-button rr-desktop-session-control" onClick={handleReset}>
        <span aria-hidden="true">{toolIcons.reset}</span>
        Reset
      </button>
    </>
  );

  const renderMobilePracticeActions = () => (
    <nav className="rr-mobile-practice-actions" aria-label="Mobile practice actions">
      <button type="button" className="rr-mobile-action" onClick={handleBack} disabled={!canGoBack}>
        <span aria-hidden="true">{toolIcons.back}</span>
        <span>Back</span>
      </button>
      <button type="button" className="rr-mobile-action" onClick={handleReset}>
        <span aria-hidden="true">{toolIcons.reset}</span>
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
      <MoleskinePracticeRenderer
        notebook={clinicalNotebook}
        subjectSelector={
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
        }
        studyModeSelector={renderStudyModeControl()}
        topActions={renderTopSessionActions()}
        sidebar={
          <>
            <button type="button" className="rr-tool-button" onClick={handleContinue}>
              <span aria-hidden="true">{toolIcons.continue}</span>
              Continue
            </button>
            {renderDesktopCaseControls()}
            {isExplanationState ? (
              <button type="button" className="rr-tool-button" onClick={showTeaching} disabled={isTeaching}>
                <span aria-hidden="true">{toolIcons.teach}</span>
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
                setIsStudyModeSelectorOpen(false);
                setActiveTool(activeTool === "notes" ? null : "notes");
              }}
            >
              <span aria-hidden="true">{toolIcons.notes}</span>
              Notes
            </button>
            <div className="rr-tool-popover-anchor" ref={railSettingsRef}>
              <button
                type="button"
                className={`rr-tool-button w-full ${settingsAnchor === "rail" ? "rr-tool-button-active" : ""}`}
                aria-expanded={settingsAnchor === "rail"}
                onClick={() => toggleSettings("rail")}
              >
                <span aria-hidden="true">{toolIcons.settings}</span>
                Settings
              </button>
              {settingsAnchor === "rail" ? renderThemePopover() : null}
            </div>
          </>
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
        overlays={
          <>
            {isAsterOpen ? (
              <AsterCompanion
                ref={asterPanelRef}
                currentCaseTitle={asterCaseTitle}
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
        answer={answer}
        answerInputRef={answerInputRef}
        onAnswerChange={setAnswer}
        onAnswerKeyDown={onAnswerKeyDown}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        keyboardHint={keyboardHint}
        clinicalCuePanel={renderClinicalCuePanel()}
        error={error}
        canAdvance={canAdvance}
        onNext={() => void loadQuestion()}
        onAddNotes={() => setActiveTool("notes")}
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
          {renderStudyModeControl()}
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
            <span aria-hidden="true">{toolIcons.continue}</span>
            Continue
          </button>
          {renderDesktopCaseControls()}
          {isExplanationState ? (
            <button type="button" className="rr-tool-button" onClick={showTeaching} disabled={isTeaching}>
              <span aria-hidden="true">{toolIcons.teach}</span>
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
              setIsStudyModeSelectorOpen(false);
              setActiveTool(activeTool === "notes" ? null : "notes");
            }}
          >
            <span aria-hidden="true">{toolIcons.notes}</span>
            Notes
          </button>
          <div className="rr-tool-popover-anchor" ref={railSettingsRef}>
            <button
              type="button"
              className={`rr-tool-button w-full ${settingsAnchor === "rail" ? "rr-tool-button-active" : ""}`}
              aria-expanded={settingsAnchor === "rail"}
              onClick={() => toggleSettings("rail")}
            >
              <span aria-hidden="true">{toolIcons.settings}</span>
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
              {renderClinicalCuePanel()}
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
          currentCaseTitle={asterCaseTitle}
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
