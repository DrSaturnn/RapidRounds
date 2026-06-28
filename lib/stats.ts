import { prisma } from "@/lib/prisma";
import type { AnalyticsStats, DashboardStats } from "@/types/practice";

const DAY_MS = 24 * 60 * 60 * 1000;
const UNAVAILABLE_LEARNER_SCOPE = "__anonymous_learner_id_required__";
const EMPTY_STATS = {
  questionsAnswered: 0,
  correctAnswers: 0,
  currentStreak: 0
};
function scoredProgressWhere() {
  return {
    userId: UNAVAILABLE_LEARNER_SCOPE,
    OR: [{ answerOutcome: null }, { answerOutcome: { not: "UNKNOWN" } }]
  };
}

function percent(correct: number, total: number) {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

function weakestByLabel<T extends { label: string; isCorrect: boolean }>(rows: T[]) {
  const grouped = new Map<string, { label: string; attempts: number; correct: number }>();

  rows.forEach((row) => {
    const current = grouped.get(row.label) ?? { label: row.label, attempts: 0, correct: 0 };
    current.attempts += 1;
    current.correct += row.isCorrect ? 1 : 0;
    grouped.set(row.label, current);
  });

  return [...grouped.values()]
    .filter((item) => item.attempts > 0)
    .map((item) => ({
      label: item.label,
      attempts: item.attempts,
      accuracy: percent(item.correct, item.attempts)
    }))
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, 5);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayRows, stats, topicProgress] = await Promise.all([
    prisma.progress.findMany({
      where: { ...scoredProgressWhere(), createdAt: { gte: today } },
      select: { isCorrect: true }
    }),
    prisma.userStats.findUnique({
      where: { userId: UNAVAILABLE_LEARNER_SCOPE },
      select: {
        questionsAnswered: true,
        correctAnswers: true,
        currentStreak: true
      }
    }),
    prisma.progress.findMany({
      where: scoredProgressWhere(),
      select: {
        isCorrect: true,
        topic: { select: { name: true, specialty: true } },
        clinicalDecision: { select: { topic: true, specialty: true } }
      }
    })
  ]);

  const groupedTopics = new Map<
    string,
    { name: string; specialty: string; attempts: number; correct: number }
  >();

  topicProgress.forEach((row) => {
    const name = row.clinicalDecision?.topic ?? row.topic?.name ?? "Uncategorized";
    const specialty = row.clinicalDecision?.specialty ?? row.topic?.specialty ?? "General";
    const key = `${specialty}:${name}`;
    const current = groupedTopics.get(key) ?? {
      name,
      specialty,
      attempts: 0,
      correct: 0
    };
    current.attempts += 1;
    current.correct += row.isCorrect ? 1 : 0;
    groupedTopics.set(key, current);
  });

  return {
    questionsAnsweredToday: todayRows.length,
    accuracy: percent((stats ?? EMPTY_STATS).correctAnswers, (stats ?? EMPTY_STATS).questionsAnswered),
    currentStreak: (stats ?? EMPTY_STATS).currentStreak,
    weakestTopics: [...groupedTopics.values()]
      .map((topic) => ({
        name: topic.name,
        specialty: topic.specialty,
        attempts: topic.attempts,
        accuracy: percent(topic.correct, topic.attempts)
      }))
      .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
      .slice(0, 4)
  };
}

export async function getAnalyticsStats(): Promise<AnalyticsStats> {
  const progress = await prisma.progress.findMany({
    where: scoredProgressWhere(),
    orderBy: { createdAt: "desc" },
    select: {
      isCorrect: true,
      responseTimeMs: true,
      diagnosis: true,
      management: true,
      pattern: true
    }
  });

  const missesByDiagnosis = new Map<string, number>();

  progress.forEach((row) => {
    if (!row.isCorrect) {
      missesByDiagnosis.set(row.diagnosis, (missesByDiagnosis.get(row.diagnosis) ?? 0) + 1);
    }
  });

  const averageResponseTimeMs =
    progress.length === 0
      ? 0
      : Math.round(progress.reduce((sum, row) => sum + row.responseTimeMs, 0) / progress.length);

  return {
    accuracy: percent(progress.filter((row) => row.isCorrect).length, progress.length),
    averageResponseTimeMs,
    mostMissedDiagnoses: [...missesByDiagnosis.entries()]
      .map(([label, misses]) => ({ label, misses }))
      .sort((a, b) => b.misses - a.misses)
      .slice(0, 5),
    weakestManagementDecisions: weakestByLabel(
      progress.map((row) => ({ label: row.management, isCorrect: row.isCorrect }))
    ),
    weakestIllnessScripts: weakestByLabel(
      progress.map((row) => ({ label: row.pattern, isCorrect: row.isCorrect }))
    )
  };
}

export function formatResponseTime(milliseconds: number) {
  if (milliseconds === 0) {
    return "0s";
  }

  const seconds = Math.max(1, Math.round(milliseconds / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function startOfRecentWindow(days = 30) {
  return new Date(Date.now() - days * DAY_MS);
}
