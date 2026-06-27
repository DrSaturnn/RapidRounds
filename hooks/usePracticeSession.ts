"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { compareAnswer } from "@/lib/answer-check";
import type { AnswerResult, PracticeMode, QuestionDto, TutorContent } from "@/types/practice";

const SESSION_STORAGE_KEY = "rapidrounds.practiceSession.v1";

type PersistedPracticeSession = {
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
  updatedAt: number;
};

function unique(values: string[]) {
  return Array.from(new Set(values));
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

    const session = JSON.parse(rawSession) as Partial<PersistedPracticeSession>;
    if (session.version !== 1 || !session.question?.id) {
      return null;
    }

    return session as PersistedPracticeSession;
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
  const hasHydratedSession = useRef(false);
  const startedAt = useRef(Date.now());

  const loadQuestion = useCallback(async (targetConcept?: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setMode("rapid");
    setTutor(null);
    setAnswer("");
    setReinforcementAnswer("");
    setReinforcementResult(null);

    const query = targetConcept ? `?concept=${encodeURIComponent(targetConcept)}` : "";
    const response = await fetch(`/api/questions/next${query}`, { cache: "no-store" });
    if (!response.ok) {
      setQuestion(null);
      setError("No questions found. Database may not be seeded.");
      setIsLoading(false);
      return;
    }

    const data = (await response.json()) as { question: QuestionDto | null };
    setQuestion(data.question);
    if (data.question) {
      setSessionDecisionCount((count) => count + 1);
    }
    startedAt.current = Date.now();
    setIsLoading(false);
  }, []);

  const submitAnswer = useCallback(async () => {
    if (!question) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/practice/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: question.id,
        answer,
        responseTimeMs: Date.now() - startedAt.current
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
    if (!data.isCorrect && data.tutor) {
      setTutor(data.tutor);
      setMode("tutor");
    }
    setIsSubmitting(false);
  }, [answer, question]);

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

  useEffect(() => {
    const persisted = readPersistedSession();
    hasHydratedSession.current = true;

    if (persisted) {
      setQuestion(persisted.question);
      setAnswer(persisted.answer);
      setResult(persisted.result);
      setMode(persisted.mode);
      setTutor(persisted.tutor);
      setReinforcementAnswer(persisted.reinforcementAnswer);
      setReinforcementResult(persisted.reinforcementResult);
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
      updatedAt: Date.now()
    });
  }, [
    answer,
    answeredQuestionIds,
    isLoading,
    mode,
    question,
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
    setAnswer,
    setReinforcementAnswer,
    submitAnswer,
    requestTeaching,
    submitReinforcementAnswer,
    loadQuestion
  };
}
