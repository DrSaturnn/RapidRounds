"use client";

import { CSSProperties, FormEvent, KeyboardEvent, ReactNode, RefObject, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { AsterAvatar, moodFromAsterAnimation } from "@/components/aster/Aster";
import { AsterOverworldMap } from "@/components/AsterOverworldMap";
import { MoleskinePracticeRenderer } from "@/components/moleskine/MoleskinePracticeRenderer";
import { QuestionMeta } from "@/components/QuestionMeta";
import { TutorMode } from "@/components/TutorMode";
import {
  applyAsterEvent,
  createAsterCompanionState,
  formatPomodoroTime,
  getAsterLevelProgress,
  tickAsterPomodoro
} from "@/lib/aster-companion";
import { buildClinicalNotebookViewModel } from "@/lib/clinical-notebook-view-model";
import {
  buildFoundationalTeaching,
  getFoundationalRapidRoundItem,
  getFoundationalTeachMeMode,
  markFoundationalAnswered,
  markFoundationalSeen,
  markFoundationalTaught
} from "@/lib/foundational-rapid-round";
import { usePracticeSession } from "@/hooks/usePracticeSession";
import type { QuestionBreadth, StudySessionMode } from "@/hooks/usePracticeSession";
import { getClinicalPromptText, getDecisionQuestionText } from "@/lib/decision-question-text";
import { LOCAL_DEMO_USER_ID, getLearnerProgressStore } from "@/lib/learner-progress-store";
import { SUBJECTS } from "@/lib/subject-seeds";
import type { AsterCompanionState, AsterEvent } from "@/lib/aster-companion";
import type { FoundationalQuestionAttemptState, FoundationalRapidRoundAnswerTeaching, FoundationalRapidRoundTeaching, VignetteFindingAnnotation } from "@/types/practice";

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
  const progressImportInputRef = useRef<HTMLInputElement>(null);
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
  const [foundationalAttempt, setFoundationalAttempt] = useState<FoundationalQuestionAttemptState | null>(null);
  const [foundationalTeachingOpen, setFoundationalTeachingOpen] = useState(false);
  const [foundationalReminder, setFoundationalReminder] = useState<string | null>(null);
  const [asterState, setAsterState] = useState<AsterCompanionState | null>(null);
  const [asterEventKey, setAsterEventKey] = useState<string | null>(null);
  const lastAsterAnswerEventRef = useRef<string | null>(null);
  const toolIcons = getToolIcons(skin);
  const foundationalItem = question?.foundationalRapidRound
    ? getFoundationalRapidRoundItem(question.id)
    : undefined;
  const isFoundationalRapidRound = Boolean(
    activeStudyMode === "rapid_round" &&
      question?.foundationalRapidRound?.mode === "foundational_rapid_round" &&
      foundationalItem
  );

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
    if (!question?.foundationalRapidRound) {
      setFoundationalAttempt(null);
      setFoundationalTeachingOpen(false);
      setFoundationalReminder(null);
      return;
    }

    let isMounted = true;
    void getLearnerProgressStore()
      .getQuestionState(LOCAL_DEMO_USER_ID, question.id)
      .then((previousState) => {
        const nextState = markFoundationalSeen(previousState ?? undefined, question.id, new Date(), LOCAL_DEMO_USER_ID);
        return getLearnerProgressStore()
          .updateQuestionState(LOCAL_DEMO_USER_ID, question.id, nextState)
          .then(() => nextState);
      })
      .then((nextState) => {
        if (isMounted) {
          setFoundationalAttempt(nextState);
        }
      })
      .catch(() => {
        if (isMounted) {
          setFoundationalAttempt(markFoundationalSeen(undefined, question.id, new Date(), LOCAL_DEMO_USER_ID));
        }
      });
    setFoundationalTeachingOpen(false);
    setFoundationalReminder(null);
    return () => {
      isMounted = false;
    };
  }, [question?.id, question?.foundationalRapidRound]);

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
    if (!isFoundationalRapidRound || !question?.foundationalRapidRound) {
      return;
    }

    let isMounted = true;
    const store = getLearnerProgressStore();
    void store.exportProgress(LOCAL_DEMO_USER_ID)
      .then(async (progress) => {
        const savedSession = progress.asterSessions
          .filter((session) =>
            session.mode === "rapid_round" &&
            session.shelf === activeSubject &&
            session.schemaCluster === question.foundationalRapidRound?.schemaName &&
            !session.completedAt
          )
          .sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0];

        if (savedSession) {
          return {
            profile: progress.asterProfile ?? await store.updateAsterProfile(LOCAL_DEMO_USER_ID, {}),
            session: savedSession
          };
        }

        const nextState = createAsterCompanionState({
          userId: LOCAL_DEMO_USER_ID,
          mode: "rapid_round",
          shelf: activeSubject,
          schemaCluster: question.foundationalRapidRound?.schemaName ?? "Rapid Round"
        });
        await store.updateAsterProfile(LOCAL_DEMO_USER_ID, nextState.profile);
        await store.createAsterSession(LOCAL_DEMO_USER_ID, nextState.session);
        return nextState;
      })
      .then((nextState) => {
        if (isMounted) {
          setAsterState(nextState);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAsterState(createAsterCompanionState({
            userId: LOCAL_DEMO_USER_ID,
            mode: "rapid_round",
            shelf: activeSubject,
            schemaCluster: question.foundationalRapidRound?.schemaName ?? "Rapid Round"
          }));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeSubject, isFoundationalRapidRound, question?.foundationalRapidRound]);

  useEffect(() => {
    if (!asterState) {
      return;
    }

    const store = getLearnerProgressStore();
    void store.updateAsterProfile(LOCAL_DEMO_USER_ID, asterState.profile)
      .then(() => store.updateAsterSession(LOCAL_DEMO_USER_ID, asterState.session.sessionId, asterState.session))
      .catch(() => undefined);
  }, [asterState]);

  useEffect(() => {
    if (!isFoundationalRapidRound) {
      return;
    }

    const interval = window.setInterval(() => {
      setAsterState((current) => current ? tickAsterPomodoro(current) : current);
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isFoundationalRapidRound]);

  useEffect(() => {
    if (showEndSessionConfirm) {
      window.requestAnimationFrame(() => {
        stayButtonRef.current?.focus();
      });
    }
  }, [showEndSessionConfirm]);

  const dispatchAsterEvent = useCallback((event: AsterEvent, key?: string) => {
    setAsterState((current) => {
      if (!current) {
        return current;
      }
      const next = applyAsterEvent(current, event);
      const xpDelta = next.profile.totalXp - current.profile.totalXp;
      if (xpDelta > 0) {
        void getLearnerProgressStore().recordXpEvent(LOCAL_DEMO_USER_ID, {
          eventId: `${next.session.sessionId}-${event.type}-${Date.now()}`,
          sessionId: next.session.sessionId,
          amount: xpDelta,
          reason: event.type,
          createdAt: event.timestamp ?? new Date().toISOString()
        }).catch(() => undefined);
      }
      void getLearnerProgressStore().updateAsterProfile(LOCAL_DEMO_USER_ID, next.profile)
        .then(() => getLearnerProgressStore().updateAsterSession(LOCAL_DEMO_USER_ID, next.session.sessionId, next.session))
        .catch(() => undefined);
      return next;
    });
    setAsterEventKey(key ?? `${event.type}-${Date.now()}`);
  }, []);

  const handleFoundationalTeachMe = useCallback(() => {
    if (!question?.foundationalRapidRound || !foundationalItem || result) {
      return;
    }

    const teachMode = getFoundationalTeachMeMode(foundationalAttempt ?? undefined);
    if (teachMode === "retrieval_reminder") {
      setFoundationalReminder("Teach Me is already unlocked for this script. Try retrieving the discriminator first.");
      window.requestAnimationFrame(() => {
        answerInputRef.current?.focus();
      });
      return;
    }

    const baseState = foundationalAttempt ?? markFoundationalSeen(undefined, question.id, new Date(), LOCAL_DEMO_USER_ID);
    const nextState = markFoundationalTaught(baseState);
    void getLearnerProgressStore().updateQuestionState(LOCAL_DEMO_USER_ID, question.id, nextState);
    setFoundationalAttempt(nextState);
    setFoundationalTeachingOpen(true);
    setFoundationalReminder(null);
    dispatchAsterEvent({ type: "teach_me_used" }, `${question.id}-teach-me`);
  }, [dispatchAsterEvent, foundationalAttempt, foundationalItem, question?.foundationalRapidRound, question?.id, result]);

  useEffect(() => {
    if (!question?.foundationalRapidRound || !result?.foundationalRapidRound || !foundationalAttempt) {
      return;
    }

    const expectedOutcome = result.isCorrect ? "correct" : "incorrect";
    if (foundationalAttempt.lastOutcome === expectedOutcome && foundationalAttempt.lastAnswer === answer) {
      return;
    }

    const nextState = markFoundationalAnswered(foundationalAttempt, answer, result.isCorrect);
    void getLearnerProgressStore().updateQuestionState(LOCAL_DEMO_USER_ID, question.id, nextState);
    setFoundationalAttempt(nextState);
  }, [answer, foundationalAttempt, question?.foundationalRapidRound, question?.id, result?.foundationalRapidRound, result?.isCorrect]);

  useEffect(() => {
    if (!isFoundationalRapidRound || !question?.id || !result?.foundationalRapidRound) {
      return;
    }

    const nextEventKey = `${question.id}-${result.isCorrect ? "correct" : "incorrect"}-${answer}`;
    if (lastAsterAnswerEventRef.current === nextEventKey) {
      return;
    }

    lastAsterAnswerEventRef.current = nextEventKey;
    dispatchAsterEvent({ type: result.isCorrect ? "correct_answer" : "incorrect_answer" }, nextEventKey);
  }, [answer, dispatchAsterEvent, isFoundationalRapidRound, question?.id, result?.foundationalRapidRound, result?.isCorrect]);

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
      const isTeachKey = event.key.toLowerCase() === "t";
      const editableTarget = isEditableTarget(event.target);

      if (isFoundationalRapidRound && !result && isTeachKey && !editableTarget) {
        event.preventDefault();
        handleFoundationalTeachMe();
        return;
      }

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
    isFoundationalRapidRound,
    loadQuestion,
    mode,
    reinforcementAnswer,
    reinforcementResult,
    result,
    settingsAnchor,
    showEndSessionConfirm,
    submitAnswer,
    submitReinforcementAnswer,
    tutor,
    handleFoundationalTeachMe
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

  const exportProgress = () => {
    void getLearnerProgressStore().exportProgress(LOCAL_DEMO_USER_ID)
      .then((progress) => {
        const blob = new Blob([JSON.stringify(progress, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `rapidrounds-progress-${LOCAL_DEMO_USER_ID}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => undefined);
  };

  const importProgress = (file: File | undefined) => {
    if (!file) return;
    void file.text()
      .then((text) => getLearnerProgressStore().importProgress(LOCAL_DEMO_USER_ID, text))
      .then(() => {
        setSettingsAnchor(null);
        window.location.reload();
      })
      .catch(() => undefined);
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
      <div className="rr-settings-divider" />
      <div>
        <p className="rr-section-header">Progress backup</p>
        <p className="rr-meta mt-1">Export or restore local progress for this device.</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="rr-session-link" onClick={exportProgress}>
          Export progress
        </button>
        <button type="button" className="rr-session-link" onClick={() => progressImportInputRef.current?.click()}>
          Import progress
        </button>
        <input
          ref={progressImportInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            importProgress(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
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
        aria-label="Open Aster companion"
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

  const renderAsterOverlay = () => (
    <>
      {!isAsterOpen && isFoundationalRapidRound && asterState ? (
        <AsterFloatingAvatar
          animationState={asterState.session.animationState}
          onClick={toggleAster}
        />
      ) : null}
      {isAsterOpen ? (
        <AsterCompanion
          ref={asterPanelRef}
          currentCaseTitle={asterCaseTitle}
          state={asterState}
          isRapidRoundActive={isFoundationalRapidRound}
          eventKey={asterEventKey}
          onClose={() => setIsAsterOpen(false)}
          onPomodoroPause={() => dispatchAsterEvent({ type: "pomodoro_paused" }, "pomodoro-paused")}
          onPomodoroFocus={() => dispatchAsterEvent({ type: "pomodoro_started" }, "pomodoro-started")}
          onBreakStart={() => dispatchAsterEvent({ type: "break_started" }, "break-started")}
        />
      ) : null}
    </>
  );

  if (isFoundationalRapidRound && foundationalItem && question?.foundationalRapidRound) {
    const foundationalTeaching = buildFoundationalTeaching(foundationalItem);
    const foundationalAnswerTeaching = result?.foundationalRapidRound;
    const teachMeMode = getFoundationalTeachMeMode(foundationalAttempt ?? undefined);
    const isEducationalMode = foundationalTeachingOpen && !result;
    const showFoundationalResult = Boolean(foundationalAnswerTeaching);
    const hasFoundationalReasoning = isEducationalMode || showFoundationalResult;
    const recognitionPattern = getBroadClinicalPattern(question.foundationalRapidRound.schemaName);
    const foundationalQuestionPrompt = getRecognitionQuestionPrompt();
    const foundationalFindings = foundationalAnswerTeaching
      ? getFoundationalRecognitionFindings(question.stem, foundationalAnswerTeaching)
      : [];

    return (
      <div className="practice-focus rr-practice-shell rr-foundational-shell min-h-screen" data-theme={skin}>
        <header className="rr-product-nav">
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
          <div className="rr-product-progress" aria-label={`Rapid Round ${question.foundationalRapidRound.progressLabel}`}>
            <span className="rr-progress-count">Rapid Round {question.foundationalRapidRound.progressLabel}</span>
          </div>
          {renderTopSessionActions()}
        </header>

        <main className="rr-foundational-main">
          <section className="rr-foundational-panel-shell rr-patient-workspace" aria-label="Patient workspace">
            <div className="rr-card rr-card-paper rr-foundational-challenge rr-foundational-patient-card">
              <div className="rr-foundational-header">
                <div>
                  <p className="rr-section-header">Recognition Challenge</p>
                  {recognitionPattern ? (
                    <>
                      <p className="rr-recognition-kicker">Clinical Pattern</p>
                      <h1>{recognitionPattern}</h1>
                    </>
                  ) : null}
                </div>
                <span className="rr-badge rr-badge-learning">{question.foundationalRapidRound.taskLabel}</span>
              </div>

              <div className="rr-foundational-patient-task">
                {showFoundationalResult ? (
                  <RecognitionChallenge
                    stem={question.stem}
                    question={foundationalQuestionPrompt}
                    findings={foundationalFindings}
                    annotated
                  />
                ) : (
                  <RecognitionChallenge
                    stem={question.stem}
                    question={foundationalQuestionPrompt}
                  />
                )}

                {!showFoundationalResult ? (
                  <>
                    <form onSubmit={onSubmit} className="rr-foundational-answer">
                      <label className="sr-only" htmlFor="foundational-answer">Answer</label>
                      <input
                        ref={answerInputRef}
                        id="foundational-answer"
                        value={answer}
                        onChange={(event) => setAnswer(event.target.value)}
                        onKeyDown={onAnswerKeyDown}
                        placeholder="Type your answer"
                        name={`rr-foundational-${question.id}`}
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
                    </form>
                    <div className="rr-foundational-tools">
                      <button type="button" className="rr-tool-button" onClick={handleFoundationalTeachMe}>
                        <span aria-hidden="true">{toolIcons.teach}</span>
                        {teachMeMode === "retrieval_reminder" ? "Teach Me ✓" : "Teach Me"}
                      </button>
                      <span className="rr-meta">T opens Teach Me</span>
                    </div>
                    {clinicalCuePrompt ? <p className="rr-clinical-cue-prompt" role="status">{clinicalCuePrompt}</p> : null}
                    {foundationalReminder ? <p className="rr-foundational-reminder" role="status">{foundationalReminder}</p> : null}
                    {error ? <p className="text-sm text-rr-muted">{error}</p> : null}
                  </>
                ) : (
                  <div className="rr-foundational-learner-answer" aria-label="Learner answer">
                    <span>Your Activated Schema</span>
                    <strong>{answer || "Not named"}</strong>
                    {foundationalAnswerTeaching ? (
                      <>
                        <span>Expert Schema</span>
                        <strong>{foundationalAnswerTeaching.diagnosis}</strong>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section
            className={`rr-card rr-card-paper rr-reasoning-workspace${hasFoundationalReasoning ? "" : " rr-reasoning-workspace-empty"}`}
            aria-label="Clinical reasoning workspace"
          >
            {!hasFoundationalReasoning ? <ReasoningWorkspacePlaceholder /> : null}
            {isEducationalMode && !showFoundationalResult ? (
              <FoundationalTeachingMode teaching={foundationalTeaching} onNext={() => void loadQuestion()} />
            ) : null}

            {foundationalAnswerTeaching ? (
              <FoundationalAnswerMode
                teaching={foundationalAnswerTeaching}
                learnerAnswer={answer}
                onNext={() => void loadQuestion()}
              />
            ) : null}
          </section>
        </main>
        {renderAsterOverlay()}
      </div>
    );
  }

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
            {renderAsterOverlay()}
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
    <div className="practice-focus rr-practice-shell rr-standard-workspace-root rr-moleskine-root min-h-screen" data-theme={skin}>
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

        <main className={`rr-practice-main rr-clinical-workspace-main rr-moleskine-main-spread ${mode === "tutor" ? "rr-practice-main-wide" : ""}`}>
          <div className="rr-clinical-workspace-grid">
            <section className="rr-patient-workspace rr-clinical-patient-pane" aria-label="Patient workspace">
              <div className="rr-moleskine-page-goal mb-5 flex flex-wrap items-center justify-between gap-3">
                <QuestionMeta question={question} />
                <p className="rr-meta">{learningGoal}</p>
              </div>
              <section className={`rr-card rr-question-card rr-vignette-card rr-card-paper rr-moleskine-left-page space-y-5 px-5 py-5 motion-safe:animate-[fadeIn_180ms_var(--rr-ease-standard)] sm:px-7 ${isExplanationState ? "rr-question-card-compact" : "sm:py-7"}`}>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rr-badge rr-badge-learning">{result ? "Explanation" : "Question"}</span>
                  <span className="rr-meta">Think through the vignette first.</span>
                </div>
                  {result ? (
                    <>
                      <RecognitionChallenge
                        stem={clinicalPrompt}
                        question={getRecognitionQuestionPrompt()}
                        findings={visibleVignetteFindings}
                        annotated
                      />
                    </>
                  ) : (
                    <RecognitionChallenge
                      stem={clinicalPrompt}
                      question={getRecognitionQuestionPrompt()}
                    />
                  )}
                </div>

                {result ? (
                  <div className="rr-foundational-learner-answer" aria-label="Learner answer">
                    <span>Your Activated Schema</span>
                    <strong>{answer || "Not named"}</strong>
                    <span>Expert Schema</span>
                    <strong>{result.correctAnswer}</strong>
                  </div>
                ) : (
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
                        disabled={mode === "tutor"}
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
                        type="submit"
                        disabled={isSubmitting || mode === "tutor"}
                      >
                        {isSubmitting ? "Checking" : "Submit"}
                      </Button>
                    </div>
                    {renderClinicalCuePanel()}
                    <div className="flex min-h-11 flex-wrap items-center gap-3 pt-1">
                      {error ? <p className="text-sm text-rr-muted">{error}</p> : null}
                    </div>
                    <p className="text-xs text-rr-muted" aria-live="polite">
                      {keyboardHint}
                    </p>
                  </form>
                )}
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
            </section>

            <section
              className={`rr-reasoning-workspace rr-clinical-reasoning-pane${(isExplanationState && tutor) || result?.isCorrect ? "" : " rr-reasoning-workspace-empty"}`}
              aria-label="Clinical reasoning workspace"
            >
              {!((isExplanationState && tutor) || result?.isCorrect) ? <ReasoningWorkspacePlaceholder /> : null}
              {mode === "rapid" && result?.isCorrect ? (
                <div className="rr-reasoning-stage rr-reasoning-stage-reinforcement motion-safe:animate-[fadeIn_180ms_var(--rr-ease-standard)]">
                  <p className="rr-section-header">Knowledge Reinforcement</p>
                  <section className="rr-clinical-resolution" aria-label="Clinical resolution">
                    <span>Expert Schema</span>
                    <strong>{result.correctAnswer}</strong>
                  </section>
                  <section className="rr-next-time-rule" aria-label="Commit to memory">
                    <span>Commit To Memory</span>
                    <p>{result.boardPearl}</p>
                  </section>
                </div>
              ) : null}

              {isExplanationState && tutor ? (
                <div className="rr-moleskine-learning-layer motion-safe:animate-[whiteboardOpen_220ms_var(--rr-ease-standard)]">
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

              {isExplanationState || result?.isCorrect ? (
                <nav className="rr-bottom-nav rr-panel rr-moleskine-footer-strip mt-5" aria-label="Practice navigation">
                  <button type="button" className="rr-bottom-action" onClick={() => setActiveTool("notes")}>
                    □ Add to Notes
                  </button>
                  <Button type="button" onClick={() => void loadQuestion()}>
                    Next Case →
                  </Button>
                </nav>
              ) : null}
            </section>
          </div>
        </main>
      </div>
      {renderAsterOverlay()}
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

function FoundationalTeachingMode({
  teaching,
  onNext
}: {
  teaching: FoundationalRapidRoundTeaching;
  onNext: () => void;
}) {
  return (
    <div className="rr-foundational-teaching" aria-label="Teach Me">
      <div className="rr-foundational-status rr-foundational-status-learning">
        <span>Teach Me</span>
        <strong>Build the recognition pattern first.</strong>
      </div>
      <FoundationalTeachingBlock title="Definition" body={teaching.definition} />
      <FoundationalTeachingBlock title="Mechanism" body={teaching.mechanism} />
      <FoundationalListBlock title="Recognition Pattern" items={teaching.recognitionPattern} highlight={teaching.discriminator.todayDiscriminator} />
      <FoundationalListBlock title="Complete illness script" items={teaching.completeIllnessScript} />
      <FoundationalListBlock title="Competing illness script" items={teaching.competingIllnessScript} />
      <FoundationalDiscriminatorTable discriminator={teaching.discriminator} />
      <FoundationalTeachingBlock title="NBME testing frame" body={teaching.nbmeTestingFrame} />
      <Button type="button" onClick={onNext}>
        Next Question
      </Button>
    </div>
  );
}

function FoundationalAnswerMode({
  teaching,
  learnerAnswer,
  onNext
}: {
  teaching: FoundationalRapidRoundAnswerTeaching;
  learnerAnswer: string;
  onNext: () => void;
}) {
  const answeredCorrectly = teaching.status === "correct";

  return (
    <div className="rr-foundational-teaching" aria-label="Rapid Round answer teaching">
      <div className={`rr-foundational-status ${answeredCorrectly ? "rr-foundational-status-correct" : "rr-foundational-status-incorrect"}`}>
        <span>{answeredCorrectly ? "✓ Correct" : "Incorrect"}</span>
        <strong>{answeredCorrectly ? teaching.diagnosis : learnerAnswer}</strong>
      </div>
      {!answeredCorrectly && teaching.inferredWrongScript ? (
        <section className="rr-foundational-panel">
          <p className="rr-section-header">You activated</p>
          <h2>{teaching.inferredWrongScript.name}</h2>
          <p>{teaching.inferredWrongScript.whyItMadeSense}</p>
          <p><strong>Stop clue:</strong> {teaching.inferredWrongScript.stopClue}</p>
        </section>
      ) : null}
      {!answeredCorrectly && teaching.missedPattern ? (
        <section className="rr-foundational-panel">
          <p className="rr-section-header">Missed pattern</p>
          <h2>{teaching.missedPattern}</h2>
        </section>
      ) : null}
      <section className="rr-foundational-pivot" aria-label="Today's discriminator">
        <span>Today&apos;s discriminator</span>
        <strong>{teaching.todaysDiscriminator}</strong>
      </section>
      <FoundationalListBlock title="Recognition Pattern" items={teaching.recognitionPattern} highlight={teaching.todaysDiscriminator} />
      <FoundationalListBlock title="Competing illness script" items={teaching.competingIllnessScript} />
      <FoundationalDiscriminatorTable discriminator={teaching.discriminator} />
      <Button type="button" onClick={onNext}>
        Next Question
      </Button>
    </div>
  );
}

function FoundationalTeachingBlock({ title, body }: { title: string; body: string }) {
  return (
    <section className="rr-foundational-panel">
      <p className="rr-section-header">{title}</p>
      <p>{body}</p>
    </section>
  );
}

function FoundationalListBlock({
  title,
  items,
  highlight
}: {
  title: string;
  items: string[];
  highlight?: string;
}) {
  const normalizedHighlight = highlight?.toLowerCase();

  return (
    <section className="rr-foundational-panel">
      <p className="rr-section-header">{title}</p>
      <ul className="rr-foundational-list">
        {items.map((item) => (
          <li
            key={item}
            className={normalizedHighlight && item.toLowerCase().includes(normalizedHighlight) ? "rr-foundational-highlight" : undefined}
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function FoundationalDiscriminatorTable({
  discriminator
}: {
  discriminator: FoundationalRapidRoundTeaching["discriminator"];
}) {
  return (
    <section className="rr-foundational-panel">
      <div className="rr-schema-discriminator-heading">
        <div>
          <p className="rr-section-header">Discriminator table</p>
          <h2>{discriminator.correctScript} vs {discriminator.competingScript}</h2>
        </div>
      </div>
      <div className="rr-foundational-table-wrap">
        <table className="rr-table rr-schema-discriminator-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>{discriminator.correctScript}</th>
              <th>{discriminator.competingScript}</th>
            </tr>
          </thead>
          <tbody>
            {discriminator.rows.map((row) => (
              <tr key={row.feature}>
                <td>{row.feature}</td>
                <td>{row.correctScript}</td>
                <td>{row.competingScript}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="rr-schema-board-rule"><span>Board rule</span>{discriminator.boardRule}</p>
    </section>
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
    state: AsterCompanionState | null;
    isRapidRoundActive: boolean;
    eventKey: string | null;
    onClose: () => void;
    onPomodoroPause: () => void;
    onPomodoroFocus: () => void;
    onBreakStart: () => void;
  }
>(function AsterCompanion({
  currentCaseTitle,
  state,
  isRapidRoundActive,
  eventKey,
  onClose,
  onPomodoroPause,
  onPomodoroFocus,
  onBreakStart
}, ref) {
  const progress = state ? getAsterLevelProgress(state.profile) : null;
  const session = state?.session;
  const progressValue = progress ? Math.round((progress.xpIntoLevel / progress.xpForNextLevel) * 100) : 0;
  const timerMode = session?.pomodoroState.mode ?? "focus";
  const timerLabel = timerMode === "break" ? "Break" : timerMode === "paused" ? "Paused" : "Focus";

  return (
    <aside
      ref={ref}
      id="aster-companion"
      className="rr-aster-companion"
      aria-label="Aster companion"
      role="dialog"
    >
      <div className="rr-aster-panel-header">
        <div>
          <p className="rr-section-header">Aster</p>
          <h2>Today&apos;s Expedition</h2>
        </div>
        <button type="button" className="rr-icon-button" aria-label="Close Aster" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="rr-aster-hero">
        <AsterAvatar
          size="medium"
          mood={moodFromAsterAnimation(session?.animationState)}
          animated
          showShadow
          eventKey={eventKey}
        />
        <div>
          <p>{session?.lastMessage ?? "Aster is ready for Rapid Round."}</p>
          <span>{isRapidRoundActive ? currentCaseTitle : "Open Rapid Round to start an expedition."}</span>
        </div>
      </div>
      {session ? (
        <>
          <div className="rr-aster-map-card">
            <div className="rr-aster-stat-row">
              <span>Progress</span>
              <strong>{session.questionsCompleted} / {session.questionTarget}</strong>
            </div>
            <AsterOverworldMap
              completed={session.questionsCompleted}
              target={session.questionTarget}
              outcome={session.routeOutcome}
              animationState={session.animationState}
              eventKey={eventKey}
            />
          </div>
          <div className="rr-aster-timer-xp">
            <div>
              <span>{timerLabel}</span>
              <strong>{formatPomodoroTime(session.pomodoroState.remainingSeconds)}</strong>
              <small>{timerMode === "break" ? "5 minute reset" : "25 minute block"}</small>
            </div>
            <div>
              <span>XP this session</span>
              <strong>+{session.xpEarned}</strong>
              <small>retrieval counts</small>
            </div>
          </div>
          <div className="rr-aster-controls" aria-label="Pomodoro controls">
            {timerMode === "paused" ? (
              <button type="button" onClick={onPomodoroFocus}>Resume</button>
            ) : (
              <button type="button" onClick={onPomodoroPause}>Pause</button>
            )}
            <button type="button" onClick={onBreakStart}>Start Break</button>
          </div>
          {progress ? (
            <div className="rr-aster-level">
              <div className="rr-aster-stat-row">
                <span>Level {progress.level}</span>
                <strong>{progress.xpIntoLevel} / {progress.xpForNextLevel} XP</strong>
              </div>
              <div className="rr-aster-level-track" aria-hidden="true">
                <span style={{ width: `${progressValue}%` }} />
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="rr-panel-collapsed mt-4">
          <p className="rr-meta">Rapid Round companion</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-rr-foreground">
            Aster tracks route progress after you start foundational Rapid Round.
          </p>
        </div>
      )}
    </aside>
  );
});

function AsterFloatingAvatar({
  animationState,
  onClick
}: {
  animationState: AsterCompanionState["session"]["animationState"];
  onClick: () => void;
}) {
  return (
    <button type="button" className="rr-aster-float" onClick={onClick} aria-label="Open Aster companion">
      <AsterAvatar size="small" mood={moodFromAsterAnimation(animationState)} animated showShadow />
    </button>
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

function ReasoningWorkspacePlaceholder() {
  return (
    <div className="rr-reasoning-placeholder" aria-label="Reasoning workspace placeholder">
      <p>Submit your answer</p>
      <span>Aster will walk you through the expert reasoning.</span>
    </div>
  );
}

function getBroadClinicalPattern(schemaName: string | null | undefined) {
  if (!schemaName) {
    return null;
  }

  const normalized = schemaName.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  const boundaryMatch = normalized.match(/^(.+?)\s+(?:with|without|after|before|due to|secondary to)\s+/i);
  return boundaryMatch?.[1]?.trim() || normalized;
}

function getRecognitionQuestionPrompt() {
  return "Which diagnosis best fits this clinical pattern?";
}

function splitClinicalClueLines(stem: string) {
  const normalized = stem.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return [];
  }

  const sentenceLines = normalized
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.replace(/[.!?]+$/g, "").trim())
    .filter(Boolean);

  if (sentenceLines.length > 1) {
    return sentenceLines;
  }

  return normalized
    .split(/\s*(?:;|\n|, and | and )\s*/i)
    .map((line) => line.replace(/[.!?]+$/g, "").trim())
    .filter(Boolean);
}

function getFindingForClueLine(line: string, findings: VignetteFindingAnnotation[]) {
  const normalizedLine = line.toLowerCase();
  return getOrderedPromptFindings(line, findings).find(({ finding }) =>
    normalizedLine.includes(finding.text.trim().toLowerCase())
  )?.finding;
}

function getFoundationalRecognitionFindings(
  stem: string,
  teaching: FoundationalRapidRoundAnswerTeaching
): VignetteFindingAnnotation[] {
  const pivot = teaching.todaysDiscriminator.trim();
  if (!pivot || !stem.toLowerCase().includes(pivot.toLowerCase())) {
    return [];
  }

  return [
    {
      text: pivot,
      role: "pivot_clue",
      explanation: `${pivot} separates ${teaching.discriminator.correctScript} from ${teaching.discriminator.competingScript}.`
    }
  ];
}

function RecognitionChallenge({
  stem,
  question,
  findings = [],
  annotated = false
}: {
  stem: string;
  question: string;
  findings?: VignetteFindingAnnotation[];
  annotated?: boolean;
}) {
  const clueLines = splitClinicalClueLines(stem);

  return (
    <div className="rr-recognition-challenge" aria-label="Recognition challenge">
      <div className="rr-recognition-clues">
        {clueLines.length > 0 ? (
          clueLines.map((line, index) => {
            const finding = annotated ? getFindingForClueLine(line, findings) : undefined;
            const roleClass = finding ? ` rr-recognition-clue-line-${finding.role.replace("_", "-")}` : "";
            return (
              <p key={`${line}-${index}`} className={`rr-recognition-clue-line${roleClass}`}>
                <span>{line}</span>
                {finding ? (
                  <em>{getFindingRoleLabel(finding.role)}</em>
                ) : null}
              </p>
            );
          })
        ) : (
          <p className="rr-recognition-clue-line">{stem}</p>
        )}
      </div>
      <div className="rr-recognition-question">
        <p className="rr-section-header">Question</p>
        <p>{question}</p>
      </div>
    </div>
  );
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
