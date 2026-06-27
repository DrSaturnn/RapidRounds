import type { AnswerEvaluation, AnswerEvaluationClassification } from "@/types/practice";

const TASK_ALIASES = {
  Diagnosis: ["diagnosis", "diagnose", "condition", "disease"],
  Management: ["management", "treat", "treatment", "therapy"],
  "Next Best Step": ["next best step", "next step", "nbs", "what next"],
  "Initial Test": ["initial test", "first test", "screening test", "initial evaluation"],
  "Confirmatory Test": ["confirmatory test", "definitive test", "confirm diagnosis"],
  Contraindication: ["contraindication", "avoid", "do not use", "contraindicated"],
  "Risk Factor": ["risk factor", "predisposes", "increases risk"],
  Complication: ["complication", "adverse outcome", "sequela"],
  Mechanism: ["mechanism", "pathophysiology", "why"],
  Association: ["association", "associated with", "most common association"],
  Prevention: ["prevention", "prevent", "prophylaxis"],
  Prognosis: ["prognosis", "outcome"],
  "Board Pearl": ["board pearl", "pearl", "testable point"]
} as const;

type TaskName = keyof typeof TASK_ALIASES;

type EvaluationInput = {
  answer: string;
  acceptedAnswers: string[];
  canonicalAnswer?: string;
  expectedTask?: string | null;
  clinicalConcepts?: string[];
};

type MatchResult = {
  classification: AnswerEvaluationClassification;
  canonicalAnswer: string;
  recognizedConcept: string;
  confidence: number;
  spellingCorrected: boolean;
  matchedAlias?: string;
  reason: string;
};

export function normalizeAnswer(value: string) {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeToken)
    .join(" ")
    .trim();
}

function normalizeToken(token: string) {
  if (token.length > 3 && token.endsWith("s") && !/(ss|us|is|ns)$/.test(token)) {
    return token.slice(0, -1);
  }

  return token;
}

const tokenSet = (value: string) => new Set(normalizeAnswer(value).split(" ").filter(Boolean));

function tokenSimilarity(answer: string, expected: string) {
  const answerTokens = tokenSet(answer);
  const expectedTokens = tokenSet(expected);

  if (answerTokens.size === 0 || expectedTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  expectedTokens.forEach((token) => {
    if (answerTokens.has(token)) {
      overlap += 1;
    }
  });

  return overlap / expectedTokens.size;
}

function levenshteinDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex];
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + cost
      );
      diagonal = above;
    }
  }

  return previous[right.length];
}

function isConservativeSpellingVariation(answer: string, expected: string) {
  const answerTokens = normalizeAnswer(answer).split(" ").filter(Boolean);
  const expectedTokens = normalizeAnswer(expected).split(" ").filter(Boolean);

  if (answerTokens.length !== expectedTokens.length || answerTokens.length === 0) {
    return false;
  }

  let edits = 0;
  for (let index = 0; index < expectedTokens.length; index += 1) {
    const answerToken = answerTokens[index];
    const expectedToken = expectedTokens[index];

    if (answerToken === expectedToken) {
      continue;
    }

    if (Math.min(answerToken.length, expectedToken.length) < 5) {
      return false;
    }

    const distance = levenshteinDistance(answerToken, expectedToken);
    if (distance > 1) {
      return false;
    }

    edits += distance;
  }

  return edits > 0 && edits <= 2;
}

function aliasesFor(acceptedAnswers: string[], canonicalAnswer: string) {
  return Array.from(new Set([canonicalAnswer, ...acceptedAnswers].map((value) => value.trim()).filter(Boolean)));
}

function isUnknownResponse(answer: string) {
  const trimmed = answer.trim();
  const normalized = normalizeAnswer(answer);

  return (
    trimmed.length === 0 ||
    trimmed === "?" ||
    ["idk", "dont know", "i dont know", "unsure", "pass"].includes(normalized)
  );
}

function taskFrom(value?: string | null): TaskName | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeAnswer(value);
  const exactTask = Object.keys(TASK_ALIASES).find((task) => normalizeAnswer(task) === normalized);
  if (exactTask) {
    return exactTask as TaskName;
  }

  return Object.entries(TASK_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => normalizeAnswer(alias) === normalized || normalized.includes(normalizeAnswer(alias)))
  )?.[0] as TaskName | undefined;
}

function recognizeTask(answer: string, expectedTask?: string | null) {
  const normalizedAnswer = normalizeAnswer(answer);
  const detected = Object.entries(TASK_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => normalizedAnswer.includes(normalizeAnswer(alias)))
  )?.[0] as TaskName | undefined;

  return detected ?? taskFrom(expectedTask);
}

function findConcept(answer: string, concepts: string[]) {
  const matches = concepts
    .map((concept) => ({
      concept,
      normalized: normalizeAnswer(concept),
      similarity: tokenSimilarity(answer, concept)
    }))
    .filter(({ normalized, similarity }) => normalized.length > 0 && (normalizeAnswer(answer).includes(normalized) || similarity >= 0.8));

  if (matches.length !== 1) {
    return undefined;
  }

  return matches[0].concept;
}

function classifyAgainstAliases(answer: string, aliases: string[], canonicalAnswer: string): MatchResult | undefined {
  const normalizedAnswer = normalizeAnswer(answer);
  const normalizedCanonical = normalizeAnswer(canonicalAnswer);

  if (normalizedAnswer === normalizedCanonical) {
    return {
      classification: "EXACT",
      canonicalAnswer,
      recognizedConcept: canonicalAnswer,
      confidence: 1,
      spellingCorrected: false,
      reason: "Answer exactly matches the canonical answer after normalization."
    };
  }

  const alias = aliases.find((candidate) => normalizeAnswer(candidate) === normalizedAnswer);
  if (alias) {
    return {
      classification: "EQUIVALENT",
      canonicalAnswer,
      recognizedConcept: canonicalAnswer,
      confidence: 0.97,
      spellingCorrected: false,
      matchedAlias: alias,
      reason: "Answer matches a configured alias for the same clinical concept."
    };
  }

  const spellingMatches = aliases.filter((candidate) => isConservativeSpellingVariation(answer, candidate));
  if (spellingMatches.length === 1) {
    return {
      classification: "SPELLING_VARIATION",
      canonicalAnswer,
      recognizedConcept: canonicalAnswer,
      confidence: 0.92,
      spellingCorrected: true,
      matchedAlias: spellingMatches[0],
      reason: "Answer differs only by a conservative spelling variation."
    };
  }

  if (spellingMatches.length > 1) {
    return undefined;
  }

  const containedAlias = aliases.find((candidate) => {
    const normalizedAlias = normalizeAnswer(candidate);
    return normalizedAlias.length > 0 && normalizedAnswer.includes(normalizedAlias);
  });

  if (containedAlias && normalizedAnswer.length >= 3) {
    return {
      classification: "EQUIVALENT",
      canonicalAnswer,
      recognizedConcept: canonicalAnswer,
      confidence: 0.88,
      spellingCorrected: false,
      matchedAlias: containedAlias,
      reason: "Answer contains the expected concept without changing clinical meaning."
    };
  }

  const bestSimilarity = Math.max(0, ...aliases.map((candidate) => tokenSimilarity(answer, candidate)));
  if (bestSimilarity >= 0.75) {
    return {
      classification: "EQUIVALENT",
      canonicalAnswer,
      recognizedConcept: canonicalAnswer,
      confidence: 0.82,
      spellingCorrected: false,
      matchedAlias: aliases.find((candidate) => tokenSimilarity(answer, candidate) === bestSimilarity),
      reason: "Answer has high token overlap with an accepted clinical answer."
    };
  }

  if (bestSimilarity >= 0.5) {
    return {
      classification: "PARTIAL",
      canonicalAnswer,
      recognizedConcept: canonicalAnswer,
      confidence: 0.56,
      spellingCorrected: false,
      matchedAlias: aliases.find((candidate) => tokenSimilarity(answer, candidate) === bestSimilarity),
      reason: "Answer captures part of the expected concept but is incomplete."
    };
  }

  return undefined;
}

function buildEvaluation(
  classification: AnswerEvaluationClassification,
  canonicalAnswer: string,
  recognizedTask: string | undefined,
  overrides: Partial<AnswerEvaluation>
): AnswerEvaluation {
  const isCorrect = ["EXACT", "EQUIVALENT", "SPELLING_VARIATION"].includes(classification);

  return {
    isCorrect,
    classification,
    canonicalAnswer,
    recognizedConcept: overrides.recognizedConcept,
    recognizedTask,
    confidence: overrides.confidence ?? (isCorrect ? 0.8 : 0.35),
    spellingCorrected: overrides.spellingCorrected ?? false,
    matchedAlias: overrides.matchedAlias,
    requiresTeaching: overrides.requiresTeaching ?? !isCorrect,
    partialCredit: overrides.partialCredit ?? (classification === "PARTIAL" ? 0.5 : isCorrect ? 1 : 0),
    reason: overrides.reason ?? "Answer does not match the expected clinical concept."
  };
}

export function evaluateAnswer({
  answer,
  acceptedAnswers,
  canonicalAnswer = acceptedAnswers[0] ?? "",
  expectedTask,
  clinicalConcepts = []
}: EvaluationInput): AnswerEvaluation {
  const aliases = aliasesFor(acceptedAnswers, canonicalAnswer);
  const recognizedTask = recognizeTask(answer, expectedTask);
  const canonical = canonicalAnswer || aliases[0] || "";

  if (isUnknownResponse(answer)) {
    return buildEvaluation("UNKNOWN", canonical, recognizedTask, {
      confidence: 1,
      requiresTeaching: true,
      partialCredit: 0,
      reason: "Learner indicated the concept is not in memory yet."
    });
  }

  const aliasMatch = classifyAgainstAliases(answer, aliases, canonical);
  if (aliasMatch) {
    return buildEvaluation(aliasMatch.classification, canonical, recognizedTask, aliasMatch);
  }

  const recognizedConcept = findConcept(answer, clinicalConcepts);
  const expected = taskFrom(expectedTask);
  if (recognizedConcept && expected && expected !== "Diagnosis") {
    return buildEvaluation("TASK_MISMATCH", canonical, recognizedTask, {
      recognizedConcept,
      confidence: 0.86,
      requiresTeaching: true,
      reason: `Recognized ${recognizedConcept}, but the task asks for ${expected}.`
    });
  }

  if (recognizedConcept) {
    return buildEvaluation("PARTIAL", canonical, recognizedTask, {
      recognizedConcept,
      confidence: 0.6,
      partialCredit: 0.4,
      reason: "Answer recognizes a related clinical concept but not the expected answer."
    });
  }

  const possibleSpellingTargets = aliases.filter((candidate) => {
    const answerTokens = normalizeAnswer(answer).split(" ");
    const candidateTokens = normalizeAnswer(candidate).split(" ");
    return answerTokens.length === candidateTokens.length && answerTokens.some((token, index) => token[0] === candidateTokens[index]?.[0]);
  });

  if (possibleSpellingTargets.length > 1) {
    return buildEvaluation("AMBIGUOUS", canonical, recognizedTask, {
      confidence: 0.45,
      reason: "Answer is too ambiguous to safely resolve to one accepted clinical concept."
    });
  }

  return buildEvaluation("INCORRECT", canonical, recognizedTask, {
    confidence: 0.72,
    reason: "Answer does not match the expected clinical concept or task."
  });
}

export function compareAnswer(answer: string, acceptedAnswers: string[]) {
  return evaluateAnswer({ answer, acceptedAnswers }).isCorrect;
}
