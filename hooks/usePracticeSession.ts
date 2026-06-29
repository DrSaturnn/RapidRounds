"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { compareAnswer } from "@/lib/answer-check";
import { normalizeLearnerId } from "@/lib/learner-id";
import type { AnswerResult, LevelOfAssistanceRequired, PracticeMode, QuestionDto, TutorContent } from "@/types/practice";

const SESSION_STORAGE_KEY = "rapidrounds.practiceSession.v1";
const LEARNER_ID_STORAGE_KEY = "rapidrounds.anonymousLearnerId.v1";
const SUBJECT_STORAGE_KEY = "rapidrounds.activeSubject.v1";
const STUDY_MODE_STORAGE_KEY = "rapidrounds.studyMode.v1";
const QUESTION_BREADTH_STORAGE_KEY = "rapidrounds.questionBreadth.v1";
const DEFAULT_SUBJECT = "OB/GYN";
const DEFAULT_STUDY_MODE = "adaptive";
const DEFAULT_QUESTION_BREADTH = "primary";

export type StudySessionMode = "adaptive" | "new_concepts" | "weak_areas" | "review" | "rapid_round";
export type QuestionBreadth = "primary" | "expanded" | "comprehensive";

export type SubjectSummary = {
  subject: string;
  count: number;
};

export type PersistedPracticeSession = {
  version: 1;
  currentRound: number;
  adaptiveQueuePosition: number;
  question: QuestionDto;
  answer: string;
  result: AnswerResult | null;
  mode: PracticeMode;
  tutor: TutorContent | null;
  reinforcementAnswer: string;
  reinforcementResult: boolean | null;
  sessionDecisionCount: number;
  answeredQuestionIds: string[];
  activeSubject?: string;
  activeStudyMode?: StudySessionMode;
  questionBreadth?: QuestionBreadth;
  clinicalCueLevel?: 0 | 1 | 2 | 3;
  clinicalCuePrompt?: string | null;
  updatedAt: number;
};

type PracticeSnapshot = {
  question: QuestionDto;
  answer: string;
  result: AnswerResult | null;
  mode: PracticeMode;
  tutor: TutorContent | null;
  reinforcementAnswer: string;
  reinforcementResult: boolean | null;
  clinicalCueLevel: 0 | 1 | 2 | 3;
  clinicalCuePrompt: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPracticeMode(value: unknown): value is PracticeMode {
  return value === "rapid" || value === "tutor";
}

function isStudySessionMode(value: unknown): value is StudySessionMode {
  return (
    value === "adaptive" ||
    value === "new_concepts" ||
    value === "weak_areas" ||
    value === "review" ||
    value === "rapid_round"
  );
}

function isQuestionBreadth(value: unknown): value is QuestionBreadth {
  return value === "primary" || value === "expanded" || value === "comprehensive";
}

function hasRestorableQuestionShape(value: unknown): value is QuestionDto {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.specialty) &&
    isString(value.topic) &&
    isNumber(value.difficulty) &&
    isString(value.stem) &&
    isString(value.pattern) &&
    isString(value.management) &&
    isString(value.diagnosis)
  );
}

function hasRestorableResultShape(value: unknown): value is AnswerResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.isCorrect === "boolean" &&
    isString(value.correctAnswer) &&
    isString(value.boardPearl) &&
    isString(value.explanation)
  );
}

function hasRestorableTutorShape(value: unknown): value is TutorContent {
  if (!isRecord(value) || !isRecord(value.repair) || !isRecord(value.illnessScript) || !isRecord(value.comparison)) {
    return false;
  }

  return (
    isString(value.correctAnswer) &&
    isString(value.repair.correctAnswer) &&
    isString(value.repair.clue) &&
    isString(value.repair.why) &&
    isString(value.illnessScript.classicPresentation) &&
    Array.isArray(value.comparison.rows)
  );
}

export function isRestorablePracticeSession(value: unknown): value is PersistedPracticeSession {
  if (!isRecord(value)) {
    return false;
  }

  if (value.version !== 1 || !hasRestorableQuestionShape(value.question) || !isPracticeMode(value.mode)) {
    return false;
  }

  if (!isString(value.answer) || !isNumber(value.sessionDecisionCount) || !Array.isArray(value.answeredQuestionIds)) {
    return false;
  }

  if (value.mode === "tutor") {
    return hasRestorableResultShape(value.result) && hasRestorableTutorShape(value.tutor);
  }

  return value.result === null && value.tutor === null;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function assistanceLevelFromCue(cueLevel: 0 | 1 | 2 | 3): LevelOfAssistanceRequired {
  if (cueLevel === 1) return "pivot_cue";
  if (cueLevel === 2) return "schema_cue";
  if (cueLevel === 3) return "decision_boundary_cue";
  return "independent";
}

function readPersistedSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawSession) {
      return null;
    }

    const session = JSON.parse(rawSession) as unknown;
    if (!isRestorablePracticeSession(session)) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function writePersistedSession(session: PersistedPracticeSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function createAnonymousLearnerId() {
  const randomId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `anon_${randomId}`;
}

function getOrCreateAnonymousLearnerId() {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.localStorage.getItem(LEARNER_ID_STORAGE_KEY);
  const existingLearnerId = normalizeLearnerId(existing);
  if (existingLearnerId) {
    return existingLearnerId;
  }

  const learnerId = createAnonymousLearnerId();
  window.localStorage.setItem(LEARNER_ID_STORAGE_KEY, learnerId);
  return learnerId;
}

export function usePracticeSession() {
  const [question, setQuestion] = useState<QuestionDto | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [mode, setMode] = useState<PracticeMode>("rapid");
  const [tutor, setTutor] = useState<TutorContent | null>(null);
  const [reinforcementAnswer, setReinforcementAnswer] = useState("");
  const [reinforcementResult, setReinforcementResult] = useState<boolean | null>(null);
  const [sessionDecisionCount, setSessionDecisionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTeaching, setIsTeaching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<string[]>([]);
  const [activeSubject, setActiveSubject] = useState(DEFAULT_SUBJECT);
  const [activeStudyMode, setActiveStudyMode] = useState<StudySessionMode>(DEFAULT_STUDY_MODE);
  const [questionBreadth, setQuestionBreadth] = useState<QuestionBreadth>(DEFAULT_QUESTION_BREADTH);
  const [clinicalCueLevel, setClinicalCueLevel] = useState<0 | 1 | 2 | 3>(0);
  const [clinicalCuePrompt, setClinicalCuePrompt] = useState<string | null>(null);
  const [subjectSummaries, setSubjectSummaries] = useState<SubjectSummary[]>([]);
  const [canGoBack, setCanGoBack] = useState(false);
  const hasHydratedSession = useRef(false);
  const learnerId = useRef("");
  const activeSubjectRef = useRef(DEFAULT_SUBJECT);
  const activeStudyModeRef = useRef<StudySessionMode>(DEFAULT_STUDY_MODE);
  const questionBreadthRef = useRef<QuestionBreadth>(DEFAULT_QUESTION_BREADTH);
  const startedAt = useRef(Date.now());
  const history = useRef<PracticeSnapshot[]>([]);
  const latestSnapshot = useRef<PracticeSnapshot | null>(null);

  useEffect(() => {
    latestSnapshot.current = question
      ? {
          question,
          answer,
          result,
          mode,
          tutor,
          reinforcementAnswer,
          reinforcementResult,
          clinicalCueLevel,
          clinicalCuePrompt
        }
      : null;
  }, [answer, clinicalCueLevel, clinicalCuePrompt, mode, question, reinforcementAnswer, reinforcementResult, result, tutor]);

  const loadQuestion = useCallback(
    async (
      targetConcept?: string,
      subjectOverride?: string,
      studyModeOverride?: StudySessionMode,
      breadthOverride?: QuestionBreadth
    ) => {
    const previousSnapshot = latestSnapshot.current;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setMode("rapid");
    setTutor(null);
    setAnswer("");
    setReinforcementAnswer("");
    setReinforcementResult(null);
    setClinicalCueLevel(0);
    setClinicalCuePrompt(null);

    const currentLearnerId = learnerId.current || getOrCreateAnonymousLearnerId();
    learnerId.current = currentLearnerId;
    const requestedSubject = subjectOverride ?? activeSubjectRef.current;
    const requestedStudyMode = studyModeOverride ?? activeStudyModeRef.current;
    const requestedQuestionBreadth = breadthOverride ?? questionBreadthRef.current;
    const params = new URLSearchParams();
    if (targetConcept) {
      params.set("concept", targetConcept);
    }
    if (requestedSubject) {
      params.set("subject", requestedSubject);
    }
    if (requestedStudyMode) {
      params.set("sessionMode", requestedStudyMode);
    }
    if (requestedQuestionBreadth) {
      params.set("questionBreadth", requestedQuestionBreadth);
    }
    if (currentLearnerId) {
      params.set("learnerId", currentLearnerId);
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(`/api/questions/next${query}`, { cache: "no-store" });
    if (!response.ok) {
      setQuestion(null);
      setError("No questions found. Database may not be seeded.");
      setIsLoading(false);
      return;
    }

    const data = (await response.json()) as { question: QuestionDto | null; subjectCounts?: SubjectSummary[] };
    if (data.subjectCounts) {
      setSubjectSummaries(data.subjectCounts);
    }
    if (previousSnapshot && data.question && data.question.id !== previousSnapshot.question.id) {
      history.current = [...history.current, previousSnapshot].slice(-12);
      setCanGoBack(history.current.length > 0);
    }

    setQuestion(data.question);
    if (data.question) {
      activeSubjectRef.current = data.question.specialty;
      setActiveSubject(data.question.specialty);
      window.localStorage.setItem(SUBJECT_STORAGE_KEY, data.question.specialty);
      setSessionDecisionCount((count) => count + 1);
    }
    startedAt.current = Date.now();
    setIsLoading(false);
  }, []);

  const goBack = useCallback(() => {
    const previous = history.current.pop();
    if (!previous) {
      setCanGoBack(false);
      return;
    }

    setQuestion(previous.question);
    setAnswer(previous.answer);
    setResult(previous.result);
    setMode(previous.mode);
    setTutor(previous.tutor);
    setReinforcementAnswer(previous.reinforcementAnswer);
    setReinforcementResult(previous.reinforcementResult);
    setClinicalCueLevel(previous.clinicalCueLevel);
    setClinicalCuePrompt(previous.clinicalCuePrompt);
    setError(null);
    setIsLoading(false);
    setIsSubmitting(false);
    setIsTeaching(false);
    setCanGoBack(history.current.length > 0);
    startedAt.current = Date.now();
  }, []);

  const resetCurrentQuestion = useCallback(() => {
    setAnswer("");
    setResult(null);
    setMode("rapid");
    setTutor(null);
    setReinforcementAnswer("");
    setReinforcementResult(null);
    setClinicalCueLevel(0);
    setClinicalCuePrompt(null);
    setError(null);
    startedAt.current = Date.now();
  }, []);

  const submitAnswer = useCallback(async () => {
    if (!question) {
      return;
    }

    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer) {
      setClinicalCuePrompt("Enter an answer, or use a clinical cue.");
      setError(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setClinicalCuePrompt(null);
    const assistanceLevel = assistanceLevelFromCue(clinicalCueLevel);

    const response = await fetch("/api/practice/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: question.id,
        learnerId: learnerId.current || getOrCreateAnonymousLearnerId(),
        answer: trimmedAnswer,
        responseTimeMs: Date.now() - startedAt.current,
        cueLevelUsed: clinicalCueLevel > 0 ? String(clinicalCueLevel) : undefined,
        levelOfAssistanceRequired: assistanceLevel,
        answeredAfterCue: clinicalCueLevel > 0
      })
    });

    if (!response.ok) {
      setError("Answer could not be scored.");
      setIsSubmitting(false);
      return;
    }

    const data = (await response.json()) as AnswerResult;
    setResult(data);
    setAnsweredQuestionIds((ids) => unique([...ids, question.id]));
    if (data.tutor && !data.isCorrect) {
      setTutor(data.tutor);
      setMode("tutor");
    } else {
      setTutor(null);
      setMode("rapid");
    }
    setIsSubmitting(false);
  }, [answer, clinicalCueLevel, question]);

  const requestClinicalCue = useCallback(() => {
    if (!question || result || mode === "tutor") {
      return;
    }

    setError(null);
    setClinicalCuePrompt(null);
    setClinicalCueLevel((level) => {
      if (level >= 3) {
        return 3;
      }
      return (level + 1) as 0 | 1 | 2 | 3;
    });
  }, [mode, question, result]);

  const revealAnswer = useCallback(async () => {
    if (!question || result || mode === "tutor") {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setClinicalCuePrompt(null);

    const response = await fetch("/api/practice/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: question.id,
        learnerId: learnerId.current || getOrCreateAnonymousLearnerId(),
        answer: "",
        responseTimeMs: Date.now() - startedAt.current,
        revealUsed: true,
        cueLevelUsed: "reveal",
        levelOfAssistanceRequired: "revealed_without_attempt"
      })
    });

    if (!response.ok) {
      setError("Clinical resolution could not be revealed.");
      setIsSubmitting(false);
      return;
    }

    const data = (await response.json()) as AnswerResult;
    setResult(data);
    setAnsweredQuestionIds((ids) => unique([...ids, question.id]));
    if (data.tutor) {
      setTutor(data.tutor);
      setMode("tutor");
    }
    setIsSubmitting(false);
  }, [mode, question, result]);

  const requestTeaching = useCallback(async () => {
    if (!question) {
      return;
    }

    setIsTeaching(true);
    setError(null);

    const response = await fetch("/api/practice/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: question.id,
        learnerId: learnerId.current || getOrCreateAnonymousLearnerId(),
        answer
      })
    });

    if (!response.ok) {
      setError("Teaching mode could not be loaded.");
      setIsTeaching(false);
      return;
    }

    const data = (await response.json()) as { tutor: TutorContent };
    setTutor(data.tutor);
    setResult(null);
    setMode("tutor");
    setIsTeaching(false);
  }, [answer, question]);

  const submitReinforcementAnswer = useCallback(() => {
    if (!tutor?.reinforcement || reinforcementAnswer.trim().length === 0) {
      return;
    }

    setReinforcementResult(
      compareAnswer(reinforcementAnswer, tutor.reinforcement.acceptedAnswers)
    );
  }, [reinforcementAnswer, tutor]);

  const selectSubject = useCallback((subject: string) => {
    activeSubjectRef.current = subject;
    setActiveSubject(subject);
    setSessionDecisionCount(0);
    setAnsweredQuestionIds([]);
    history.current = [];
    setCanGoBack(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SUBJECT_STORAGE_KEY, subject);
    }
    void loadQuestion(undefined, subject, activeStudyModeRef.current, questionBreadthRef.current);
  }, [loadQuestion]);

  const selectStudyMode = useCallback((studyMode: StudySessionMode) => {
    activeStudyModeRef.current = studyMode;
    setActiveStudyMode(studyMode);
    setSessionDecisionCount(0);
    setAnsweredQuestionIds([]);
    history.current = [];
    setCanGoBack(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STUDY_MODE_STORAGE_KEY, studyMode);
    }
    void loadQuestion(undefined, activeSubjectRef.current, studyMode, questionBreadthRef.current);
  }, [loadQuestion]);

  const selectQuestionBreadth = useCallback((breadth: QuestionBreadth) => {
    questionBreadthRef.current = breadth;
    setQuestionBreadth(breadth);
    setSessionDecisionCount(0);
    setAnsweredQuestionIds([]);
    history.current = [];
    setCanGoBack(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(QUESTION_BREADTH_STORAGE_KEY, breadth);
    }
    void loadQuestion(undefined, activeSubjectRef.current, activeStudyModeRef.current, breadth);
  }, [loadQuestion]);

  useEffect(() => {
    learnerId.current = getOrCreateAnonymousLearnerId();
    const savedSubject = window.localStorage.getItem(SUBJECT_STORAGE_KEY) || DEFAULT_SUBJECT;
    const savedStudyMode = window.localStorage.getItem(STUDY_MODE_STORAGE_KEY);
    const savedQuestionBreadth = window.localStorage.getItem(QUESTION_BREADTH_STORAGE_KEY);
    const restoredStudyMode = isStudySessionMode(savedStudyMode) ? savedStudyMode : DEFAULT_STUDY_MODE;
    const restoredQuestionBreadth = isQuestionBreadth(savedQuestionBreadth) ? savedQuestionBreadth : DEFAULT_QUESTION_BREADTH;
    activeSubjectRef.current = savedSubject;
    activeStudyModeRef.current = restoredStudyMode;
    questionBreadthRef.current = restoredQuestionBreadth;
    setActiveSubject(savedSubject);
    setActiveStudyMode(restoredStudyMode);
    setQuestionBreadth(restoredQuestionBreadth);

    void fetch("/api/subjects", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ subjectCounts?: SubjectSummary[] }> : undefined)
      .then((data) => {
        if (data?.subjectCounts) {
          setSubjectSummaries(data.subjectCounts);
        }
      })
      .catch(() => undefined);

    const persisted = readPersistedSession();
    hasHydratedSession.current = true;

    if (persisted) {
      const restoredSubject = persisted.activeSubject ?? persisted.question.specialty ?? savedSubject;
      const persistedStudyMode = isStudySessionMode(persisted.activeStudyMode) ? persisted.activeStudyMode : restoredStudyMode;
      const persistedBreadth = isQuestionBreadth(persisted.questionBreadth) ? persisted.questionBreadth : restoredQuestionBreadth;
      activeSubjectRef.current = restoredSubject;
      activeStudyModeRef.current = persistedStudyMode;
      questionBreadthRef.current = persistedBreadth;
      setActiveSubject(restoredSubject);
      setActiveStudyMode(persistedStudyMode);
      setQuestionBreadth(persistedBreadth);
      setQuestion(persisted.question);
      setAnswer(persisted.answer);
      setResult(persisted.result);
      setMode(persisted.mode);
      setTutor(persisted.tutor);
      setReinforcementAnswer(persisted.reinforcementAnswer);
      setReinforcementResult(persisted.reinforcementResult);
      setClinicalCueLevel(persisted.clinicalCueLevel ?? 0);
      setClinicalCuePrompt(persisted.clinicalCuePrompt ?? null);
      setSessionDecisionCount(persisted.sessionDecisionCount);
      setAnsweredQuestionIds(persisted.answeredQuestionIds ?? []);
      setIsLoading(false);
      startedAt.current = Date.now();
      return;
    }

    void loadQuestion();
  }, [loadQuestion]);

  useEffect(() => {
    if (!hasHydratedSession.current || isLoading || !question) {
      return;
    }

    writePersistedSession({
      version: 1,
      currentRound: 1,
      adaptiveQueuePosition: sessionDecisionCount,
      question,
      answer,
      result,
      mode,
      tutor,
      reinforcementAnswer,
      reinforcementResult,
      sessionDecisionCount,
      answeredQuestionIds,
      activeSubject,
      activeStudyMode,
      questionBreadth,
      clinicalCueLevel,
      clinicalCuePrompt,
      updatedAt: Date.now()
    });
  }, [
    activeSubject,
    activeStudyMode,
    answer,
    answeredQuestionIds,
    clinicalCueLevel,
    clinicalCuePrompt,
    isLoading,
    mode,
    question,
    questionBreadth,
    reinforcementAnswer,
    reinforcementResult,
    result,
    sessionDecisionCount,
    tutor
  ]);

  return {
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
    canGoBack,
    subjectSummaries,
    setAnswer,
    setReinforcementAnswer,
    submitAnswer,
    requestTeaching,
    submitReinforcementAnswer,
    selectSubject,
    selectStudyMode,
    selectQuestionBreadth,
    loadQuestion,
    goBack,
    resetCurrentQuestion,
    requestClinicalCue,
    revealAnswer,
    clinicalCueLevel,
    clinicalCuePrompt
  };
}
