import type { AnswerOutcome, CognitiveErrorType, ReasoningError, TutorContent } from "@/types/practice";

type ReasoningMemoryAttempt = {
  cognitiveErrorType?: string | null;
  reasoningPattern?: string | null;
  answerOutcome?: string | null;
};

const MIN_PRIOR_PATTERN_MATCHES = 1;

const cognitiveMessages: Partial<Record<CognitiveErrorType, string>> = {
  "Missed Pivot Clue": "You have missed this kind of pivot before. Pause at the clue that changes the decision.",
  "Premature Closure": "You stopped one step too early. Confirm the pivot clue before closing on the familiar diagnosis.",
  "Illness Script Confusion": "You chose a diagnosis that is more specific than the stem proves. Match the answer to the evidence the vignette actually gives.",
  "Management Error": "You recognized the category but missed the first-line action. Decide what the question is asking before choosing the next step.",
  "Contraindication Error": "You recognized the treatment family but missed the contraindication. Check exclusions before selecting a medication.",
  "Timing Error": "You were in the right neighborhood, but the timing changed the answer. Anchor the decision to the stage or sequence first.",
  "Severity Error": "You recognized the disease spectrum but missed the severity boundary. Check for severe features before choosing the label.",
  "Distractor Attraction": "You followed an overlapping clue before checking the discriminator. Let the pivot clue outrank surface overlap.",
  Overgeneralization: "You applied a true rule outside its boundary. Ask whether that rule applies in this exact decision frame.",
  "Knowledge Gap": "This pattern has not fully stuck yet. Attach the pivot clue directly to the correct action."
};

const reasoningMessages: Partial<Record<ReasoningError, string>> = {
  "Missed Pivot Clue": "You have missed this kind of pivot before. Pause at the clue that changes the decision.",
  "Premature Closure": "You stopped one step too early. Confirm the pivot clue before closing on the familiar diagnosis.",
  "Management Sequencing Error": "You recognized the category but missed the first-line action. Decide what the question is asking before choosing the next step.",
  "Pattern Recognition Error": "This illness script has not fully stuck yet. Link the stem pattern to the correct action.",
  "Timeline Error": "You were in the right neighborhood, but the timing changed the answer. Anchor the decision to the stage or sequence first.",
  "Distractor Error": "You followed an overlapping clue before checking the discriminator. Let the pivot clue outrank surface overlap.",
  "Instability Error": "You recognized a dangerous context. Prioritize the immediate stabilizing action before the rest of the workup.",
  "Knowledge Gap": "This pattern has not fully stuck yet. Attach the pivot clue directly to the correct action."
};

function normalizePattern(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function isScoredMiss(outcome?: string | null) {
  return Boolean(outcome && outcome !== "CORRECT" && outcome !== "UNKNOWN");
}

function countMatches(priorAttempts: ReasoningMemoryAttempt[], key: "cognitiveErrorType" | "reasoningPattern", value?: string) {
  const pattern = normalizePattern(value);

  if (!pattern) {
    return 0;
  }

  return priorAttempts.filter((attempt) => isScoredMiss(attempt.answerOutcome) && normalizePattern(attempt[key]) === pattern).length;
}

export function buildReasoningMemoryCoaching(
  tutor: TutorContent,
  answerOutcome: AnswerOutcome,
  priorAttempts: ReasoningMemoryAttempt[]
) {
  if (answerOutcome === "CORRECT" || answerOutcome === "UNKNOWN") {
    return undefined;
  }

  const cognitiveType = tutor.cognitiveError?.type;
  const cognitiveMatches = countMatches(priorAttempts, "cognitiveErrorType", cognitiveType);

  if (cognitiveType && cognitiveMatches >= MIN_PRIOR_PATTERN_MATCHES) {
    return {
      message: cognitiveMessages[cognitiveType] ?? "You have missed this reasoning pattern before. Re-check the pivot clue before answering.",
      supportingPattern: cognitiveType
    };
  }

  const reasoningPattern = tutor.reasoningAnalysis.primaryError;
  const reasoningMatches = countMatches(priorAttempts, "reasoningPattern", reasoningPattern);

  if (reasoningMatches >= MIN_PRIOR_PATTERN_MATCHES) {
    return {
      message: reasoningMessages[reasoningPattern] ?? "You have missed this reasoning pattern before. Re-check the pivot clue before answering.",
      supportingPattern: reasoningPattern
    };
  }

  return undefined;
}
