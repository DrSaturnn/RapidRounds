export type AsterAnimationState =
  | "idle"
  | "walking"
  | "thinking"
  | "reading_map"
  | "celebrating"
  | "resting";

export type AsterRouteOutcome = "in_progress" | "shortcut" | "normal" | "review_route";

export type AsterPomodoroMode = "focus" | "break" | "paused";

export type AsterPomodoroState = {
  mode: AsterPomodoroMode;
  focusDurationSeconds: number;
  breakDurationSeconds: number;
  remainingSeconds: number;
  lastStartedAt: string;
};

export type AsterProfile = {
  level: number;
  totalXp: number;
  prestigeLevel: number;
  unlockedVariants: string[];
  unlockedItems: string[];
  equippedVariant: string;
  equippedItems: string[];
};

export type AsterSession = {
  sessionId: string;
  mode: string;
  shelf: string;
  schemaCluster: string;
  startedAt: string;
  completedAt?: string;
  questionTarget: number;
  questionsCompleted: number;
  correctCount: number;
  incorrectCount: number;
  teachMeCount: number;
  currentNodeIndex: number;
  routeOutcome: AsterRouteOutcome;
  xpEarned: number;
  correctStreak: number;
  animationState: AsterAnimationState;
  lastMessage: string;
  pomodoroState: AsterPomodoroState;
};

export type AsterCompanionState = {
  profile: AsterProfile;
  session: AsterSession;
};

export type AsterEvent =
  | { type: "question_completed"; timestamp?: string; payload?: { isCorrect?: boolean } }
  | { type: "correct_answer"; timestamp?: string }
  | { type: "incorrect_answer"; timestamp?: string }
  | { type: "teach_me_used"; timestamp?: string }
  | { type: "session_completed"; timestamp?: string }
  | { type: "pomodoro_started"; timestamp?: string }
  | { type: "pomodoro_paused"; timestamp?: string }
  | { type: "break_started"; timestamp?: string };

export const ASTER_SESSION_TARGET = 20;
export const ASTER_FOCUS_SECONDS = 25 * 60;
export const ASTER_BREAK_SECONDS = 5 * 60;

export function createAsterProfile(): AsterProfile {
  return {
    level: 1,
    totalXp: 0,
    prestigeLevel: 0,
    unlockedVariants: [],
    unlockedItems: [],
    equippedVariant: "classic",
    equippedItems: []
  };
}

export function xpForNextAsterLevel(level: number) {
  return 100 + level * 25;
}

export function getAsterLevelProgress(profile: AsterProfile) {
  let remaining = profile.totalXp;
  let level = 1;

  while (remaining >= xpForNextAsterLevel(level)) {
    remaining -= xpForNextAsterLevel(level);
    level += 1;
  }

  return {
    level,
    xpIntoLevel: remaining,
    xpForNextLevel: xpForNextAsterLevel(level)
  };
}

export function createAsterSession(input: {
  mode: string;
  shelf: string;
  schemaCluster: string;
  now?: Date;
  questionTarget?: number;
}): AsterSession {
  const now = input.now ?? new Date();
  return {
    sessionId: `aster-${input.shelf.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${now.getTime()}`,
    mode: input.mode,
    shelf: input.shelf,
    schemaCluster: input.schemaCluster,
    startedAt: now.toISOString(),
    questionTarget: input.questionTarget ?? ASTER_SESSION_TARGET,
    questionsCompleted: 0,
    correctCount: 0,
    incorrectCount: 0,
    teachMeCount: 0,
    currentNodeIndex: 0,
    routeOutcome: "in_progress",
    xpEarned: 0,
    correctStreak: 0,
    animationState: "idle",
    lastMessage: "Today’s Expedition",
    pomodoroState: {
      mode: "focus",
      focusDurationSeconds: ASTER_FOCUS_SECONDS,
      breakDurationSeconds: ASTER_BREAK_SECONDS,
      remainingSeconds: ASTER_FOCUS_SECONDS,
      lastStartedAt: now.toISOString()
    }
  };
}

export function createAsterCompanionState(input: {
  mode: string;
  shelf: string;
  schemaCluster: string;
  now?: Date;
  questionTarget?: number;
}): AsterCompanionState {
  return {
    profile: createAsterProfile(),
    session: createAsterSession(input)
  };
}

export function classifyAsterRouteOutcome(correctCount: number, completedCount: number): Exclude<AsterRouteOutcome, "in_progress"> {
  const accuracy = completedCount > 0 ? correctCount / completedCount : 0;
  if (accuracy >= 0.9) return "shortcut";
  if (accuracy >= 0.6) return "normal";
  return "review_route";
}

function completionBonus(outcome: Exclude<AsterRouteOutcome, "in_progress">) {
  if (outcome === "shortcut") return 20 + 15;
  if (outcome === "normal") return 20 + 10;
  return 20 + 5;
}

function completionMessage(outcome: AsterRouteOutcome) {
  if (outcome === "shortcut") return "Shortcut found. Aster reached camp.";
  if (outcome === "normal") return "Aster completed the route.";
  if (outcome === "review_route") return "Review route unlocked. Aster marked these for practice.";
  return "Today’s Expedition";
}

function awardXp(profile: AsterProfile, session: AsterSession, amount: number) {
  const nextProfile = {
    ...profile,
    totalXp: profile.totalXp + amount
  };
  const progress = getAsterLevelProgress(nextProfile);
  return {
    profile: {
      ...nextProfile,
      level: progress.level
    },
    session: {
      ...session,
      xpEarned: session.xpEarned + amount
    }
  };
}

function completeQuestion(state: AsterCompanionState, input: { isCorrect: boolean; timestamp?: string }) {
  const wasComplete = state.session.questionsCompleted >= state.session.questionTarget;
  if (wasComplete) return state;

  const completed = Math.min(state.session.questionTarget, state.session.questionsCompleted + 1);
  const correctCount = state.session.correctCount + (input.isCorrect ? 1 : 0);
  const incorrectCount = state.session.incorrectCount + (input.isCorrect ? 0 : 1);
  const correctStreak = input.isCorrect ? state.session.correctStreak + 1 : 0;
  const streakBonus = input.isCorrect && correctStreak > 1 ? 1 : 0;
  const isNowComplete = completed >= state.session.questionTarget;
  const completedOutcome = isNowComplete ? classifyAsterRouteOutcome(correctCount, completed) : undefined;
  const routeOutcome = completedOutcome ?? "in_progress";
  const baseXp = 5 + (input.isCorrect ? 2 : 0) + streakBonus;
  const bonusXp = completedOutcome ? completionBonus(completedOutcome) : 0;
  const nextSession: AsterSession = {
    ...state.session,
    questionsCompleted: completed,
    currentNodeIndex: completed,
    correctCount,
    incorrectCount,
    correctStreak,
    routeOutcome,
    completedAt: isNowComplete ? input.timestamp ?? new Date().toISOString() : state.session.completedAt,
    animationState: isNowComplete ? "celebrating" : input.isCorrect ? "walking" : "thinking",
    lastMessage: isNowComplete
      ? completionMessage(routeOutcome)
      : input.isCorrect
        ? "Aster moved confidently."
        : "Aster paused to study the map."
  };

  return awardXp(state.profile, nextSession, baseXp + bonusXp);
}

export function applyAsterEvent(state: AsterCompanionState, event: AsterEvent): AsterCompanionState {
  switch (event.type) {
    case "correct_answer":
      return completeQuestion(state, { isCorrect: true, timestamp: event.timestamp });
    case "incorrect_answer":
      return completeQuestion(state, { isCorrect: false, timestamp: event.timestamp });
    case "question_completed":
      return completeQuestion(state, { isCorrect: Boolean(event.payload?.isCorrect), timestamp: event.timestamp });
    case "teach_me_used": {
      const nextSession = {
        ...state.session,
        teachMeCount: state.session.teachMeCount + 1,
        animationState: "reading_map" as const,
        lastMessage: "Aster marked this for learning."
      };
      return awardXp(state.profile, nextSession, 1);
    }
    case "session_completed": {
      const routeOutcome = classifyAsterRouteOutcome(state.session.correctCount, state.session.questionsCompleted);
      return {
        ...state,
        session: {
          ...state.session,
          routeOutcome,
          completedAt: event.timestamp ?? new Date().toISOString(),
          animationState: "celebrating",
          lastMessage: completionMessage(routeOutcome)
        }
      };
    }
    case "pomodoro_started":
      return {
        ...state,
        session: {
          ...state.session,
          animationState: "idle",
          pomodoroState: {
            ...state.session.pomodoroState,
            mode: "focus",
            lastStartedAt: event.timestamp ?? new Date().toISOString()
          }
        }
      };
    case "pomodoro_paused":
      return {
        ...state,
        session: {
          ...state.session,
          animationState: "idle",
          pomodoroState: {
            ...state.session.pomodoroState,
            mode: "paused"
          }
        }
      };
    case "break_started":
      return {
        ...state,
        session: {
          ...state.session,
          animationState: "resting",
          pomodoroState: {
            ...state.session.pomodoroState,
            mode: "break",
            remainingSeconds: state.session.pomodoroState.breakDurationSeconds,
            lastStartedAt: event.timestamp ?? new Date().toISOString()
          }
        }
      };
  }
}

export function tickAsterPomodoro(state: AsterCompanionState, seconds = 1): AsterCompanionState {
  if (state.session.pomodoroState.mode === "paused") return state;

  const remainingSeconds = Math.max(0, state.session.pomodoroState.remainingSeconds - seconds);
  return {
    ...state,
    session: {
      ...state.session,
      animationState: remainingSeconds === 0 ? "resting" : state.session.animationState,
      pomodoroState: {
        ...state.session.pomodoroState,
        mode: remainingSeconds === 0 ? "break" : state.session.pomodoroState.mode,
        remainingSeconds
      }
    }
  };
}

export function formatPomodoroTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function containsPunitiveAsterLanguage(value: string) {
  return /\b(failed|lost|died|trap|bad score|punishment)\b/i.test(value);
}
