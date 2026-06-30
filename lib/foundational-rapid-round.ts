import type {
  AnswerEvaluation,
  FoundationalQuestionAttemptState,
  FoundationalRapidRoundAnswerTeaching,
  FoundationalRapidRoundTeaching,
  QuestionDto
} from "@/types/practice";

type IllnessScript = {
  id: string;
  name: string;
  aliases: string[];
  definition: string;
  mechanism: string;
  recognitionPattern: string[];
  completeIllnessScript: string[];
};

type FoundationalQuestionItem = {
  id: string;
  subject: string;
  schemaCluster: string;
  progressLabel: string;
  prompt: string;
  answerPrompt: string;
  taskLabel: string;
  correctScriptId: string;
  competingScriptId: string;
  todaysDiscriminator: string;
  acceptedAnswers: string[];
  scripts: IllnessScript[];
  discriminatorRows: Array<{
    feature: string;
    correctScript: string;
    competingScript: string;
  }>;
  boardRule: string;
  nbmeTestingFrame: string;
  ankingDerivedFactRefs: string[];
};

const obgynPrimaryAmenorrhea: FoundationalQuestionItem = {
  id: "frr-obgyn-primary-amenorrhea-mrkh-vs-ais",
  subject: "OB/GYN",
  schemaCluster: "Primary amenorrhea with normal secondary sexual characteristics",
  progressLabel: "1 / 1",
  prompt:
    "A 16-year-old has never had menses. Breast development is normal. Pubic hair is normal. Pelvic examination shows a blind-ending vagina.",
  answerPrompt: "What is the most likely diagnosis?",
  taskLabel: "Recognition",
  correctScriptId: "mrkh",
  competingScriptId: "androgen-insensitivity",
  todaysDiscriminator: "normal pubic hair",
  acceptedAnswers: [
    "mullerian agenesis",
    "mullerian agenesis mrkh",
    "mrkh",
    "mayer rokitansky kuster hauser",
    "mayer-rokitansky-kuster-hauser syndrome",
    "mullerian aplasia"
  ],
  scripts: [
    {
      id: "mrkh",
      name: "Mullerian agenesis (MRKH)",
      aliases: [
        "mullerian agenesis",
        "mrkh",
        "mayer rokitansky kuster hauser",
        "mullerian aplasia"
      ],
      definition: "Congenital absence or underdevelopment of Mullerian structures with normal ovarian function.",
      mechanism: "Mullerian ducts fail to form the uterus and upper vagina while ovaries and androgen response remain intact.",
      recognitionPattern: [
        "primary amenorrhea",
        "normal breast development",
        "normal pubic hair",
        "blind-ending vagina",
        "absent or rudimentary uterus",
        "46,XX with functioning ovaries"
      ],
      completeIllnessScript: [
        "adolescent with primary amenorrhea",
        "normal estrogen effect with developed breasts",
        "normal androgen response with pubic hair",
        "short or blind vaginal canal",
        "absent uterus on imaging",
        "Mullerian agenesis"
      ]
    },
    {
      id: "androgen-insensitivity",
      name: "Androgen insensitivity syndrome",
      aliases: [
        "androgen insensitivity",
        "androgen insensitivity syndrome",
        "ais",
        "complete androgen insensitivity"
      ],
      definition: "46,XY androgen receptor resistance producing a phenotypic female patient with testes and absent Mullerian structures.",
      mechanism: "Testes produce anti-Mullerian hormone and testosterone, but peripheral tissues cannot respond to androgens.",
      recognitionPattern: [
        "primary amenorrhea",
        "normal breast development",
        "sparse or absent pubic hair",
        "blind-ending vagina",
        "absent uterus",
        "46,XY with intraabdominal or inguinal testes"
      ],
      completeIllnessScript: [
        "adolescent with primary amenorrhea",
        "normal breasts from aromatized testosterone",
        "little or no pubic hair from androgen resistance",
        "short or blind vaginal canal",
        "absent uterus",
        "androgen insensitivity syndrome"
      ]
    }
  ],
  discriminatorRows: [
    {
      feature: "Shared presentation",
      correctScript: "Primary amenorrhea with normal breast development",
      competingScript: "Primary amenorrhea with normal breast development"
    },
    {
      feature: "Today's discriminator",
      correctScript: "Pubic hair is normal",
      competingScript: "Pubic hair is sparse or absent"
    },
    {
      feature: "Internal anatomy",
      correctScript: "Absent uterus with normal ovaries",
      competingScript: "Absent uterus with testes"
    },
    {
      feature: "Karyotype frame",
      correctScript: "46,XX",
      competingScript: "46,XY"
    }
  ],
  boardRule:
    "Primary amenorrhea with normal breasts and normal pubic hair points to Mullerian agenesis; absent pubic hair points to androgen insensitivity.",
  nbmeTestingFrame:
    "NBME items often separate these two by asking whether androgen response is intact. Pubic hair is the fastest clue.",
  ankingDerivedFactRefs: [
    "anking:Mullerian agenesis = primary amenorrhea in females with developed secondary sexual characteristics",
    "anking:In androgen insensitivity syndrome a person is genotypically XY but has female external genitalia"
  ]
};

const foundationalRapidRoundItems = [obgynPrimaryAmenorrhea];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scriptById(item: FoundationalQuestionItem, id: string) {
  const script = item.scripts.find((candidate) => candidate.id === id);
  if (!script) {
    throw new Error(`Foundational Rapid Round script missing: ${id}`);
  }
  return script;
}

function matchesAny(answer: string, values: string[]) {
  const normalizedAnswer = normalize(answer);
  return values.some((value) => normalizedAnswer === normalize(value));
}

export function getFoundationalRapidRoundItems(subject?: string | null) {
  return foundationalRapidRoundItems.filter((item) => !subject || item.subject === subject);
}

export function getFoundationalRapidRoundSubjectCounts() {
  const counts = new Map<string, number>();
  for (const item of foundationalRapidRoundItems) {
    counts.set(item.subject, (counts.get(item.subject) ?? 0) + 1);
  }
  return [...counts.entries()].map(([subject, count]) => ({ subject, count }));
}

export function getFoundationalRapidRoundItem(id: string | undefined) {
  if (!id) return undefined;
  return foundationalRapidRoundItems.find((item) => item.id === id);
}

export function toFoundationalQuestionDto(item: FoundationalQuestionItem): QuestionDto {
  return {
    id: item.id,
    scriptId: item.schemaCluster.toLowerCase().replace(/[^\w]+/g, "-"),
    specialty: item.subject,
    topic: item.schemaCluster,
    canonicalProblem: item.schemaCluster,
    variantType: "foundational_rapid_round",
    difficulty: 1,
    stem: item.prompt,
    answerPrompt: item.answerPrompt,
    decisionType: "Diagnosis",
    pattern: item.schemaCluster,
    management: item.boardRule,
    diagnosis: scriptById(item, item.correctScriptId).name,
    foundationalRapidRound: {
      mode: "foundational_rapid_round",
      schemaName: item.schemaCluster,
      progressLabel: item.progressLabel,
      taskLabel: item.taskLabel
    }
  };
}

export function buildFoundationalTeaching(item: FoundationalQuestionItem): FoundationalRapidRoundTeaching {
  const correctScript = scriptById(item, item.correctScriptId);
  const competingScript = scriptById(item, item.competingScriptId);

  return {
    definition: correctScript.definition,
    mechanism: correctScript.mechanism,
    recognitionPattern: correctScript.recognitionPattern,
    completeIllnessScript: correctScript.completeIllnessScript,
    competingIllnessScript: competingScript.completeIllnessScript,
    discriminator: {
      correctScript: correctScript.name,
      competingScript: competingScript.name,
      todayDiscriminator: item.todaysDiscriminator,
      rows: item.discriminatorRows,
      boardRule: item.boardRule
    },
    nbmeTestingFrame: item.nbmeTestingFrame
  };
}

export function evaluateFoundationalRapidRoundAnswer(item: FoundationalQuestionItem, answer: string) {
  const correctScript = scriptById(item, item.correctScriptId);
  const competingScript = scriptById(item, item.competingScriptId);
  const isCorrect = matchesAny(answer, [...item.acceptedAnswers, ...correctScript.aliases, correctScript.name]);
  const mapsToCompetingScript = matchesAny(answer, [...competingScript.aliases, competingScript.name]);
  const inferredWrongScript = !isCorrect && mapsToCompetingScript
    ? {
        name: competingScript.name,
        confidence: "high" as const,
        whyItMadeSense: "It shares the same broad frame: primary amenorrhea with normal breast development and absent uterus.",
        stopClue: `${item.todaysDiscriminator} should stop the androgen-insensitivity branch.`
      }
    : undefined;

  const teaching: FoundationalRapidRoundAnswerTeaching = {
    status: isCorrect ? "correct" : "incorrect",
    diagnosis: correctScript.name,
    todaysDiscriminator: item.todaysDiscriminator,
    recognitionPattern: correctScript.recognitionPattern,
    competingIllnessScript: competingScript.completeIllnessScript,
    discriminator: {
      correctScript: correctScript.name,
      competingScript: competingScript.name,
      todayDiscriminator: item.todaysDiscriminator,
      rows: item.discriminatorRows,
      boardRule: item.boardRule
    },
    inferredWrongScript,
    missedPattern: isCorrect || inferredWrongScript ? undefined : item.schemaCluster
  };

  const evaluation: AnswerEvaluation = {
    isCorrect,
    classification: isCorrect ? "EQUIVALENT" : "INCORRECT",
    learnerFacingClassification: {
      category: isCorrect ? "Equivalent" : "Incorrect",
      message: isCorrect ? "Recognized the illness script." : "This answer activates a different or unclear illness script."
    },
    canonicalAnswer: correctScript.name,
    recognizedConcept: mapsToCompetingScript ? competingScript.name : undefined,
    confidence: isCorrect || mapsToCompetingScript ? 0.95 : 0.35,
    spellingCorrected: false,
    requiresTeaching: !isCorrect,
    partialCredit: isCorrect ? 1 : 0,
    reason: isCorrect ? "Matched the foundational illness script." : "Did not match the foundational illness script."
  };

  return { isCorrect, evaluation, teaching };
}

export function createInitialFoundationalAttemptState(questionItemId: string, now = new Date()): FoundationalQuestionAttemptState {
  const timestamp = now.toISOString();
  return {
    questionItemId,
    firstSeenAt: timestamp,
    lastSeenAt: timestamp,
    exposureCount: 1,
    taughtOnce: false,
    answeredCorrectlyOnce: false,
    needsLearning: false
  };
}

export function markFoundationalSeen(
  state: FoundationalQuestionAttemptState | undefined,
  questionItemId: string,
  now = new Date()
): FoundationalQuestionAttemptState {
  if (!state || state.questionItemId !== questionItemId) {
    return createInitialFoundationalAttemptState(questionItemId, now);
  }

  return {
    ...state,
    lastSeenAt: now.toISOString(),
    exposureCount: state.exposureCount + 1
  };
}

export function markFoundationalTaught(
  state: FoundationalQuestionAttemptState,
  now = new Date()
): FoundationalQuestionAttemptState {
  return {
    ...state,
    lastSeenAt: now.toISOString(),
    taughtOnce: true,
    needsLearning: true,
    lastOutcome: "taught"
  };
}

export function markFoundationalAnswered(
  state: FoundationalQuestionAttemptState,
  answer: string,
  isCorrect: boolean,
  now = new Date()
): FoundationalQuestionAttemptState {
  return {
    ...state,
    lastSeenAt: now.toISOString(),
    answeredCorrectlyOnce: state.answeredCorrectlyOnce || isCorrect,
    needsLearning: state.needsLearning || !isCorrect,
    lastAnswer: answer,
    lastOutcome: isCorrect ? "correct" : "incorrect"
  };
}

export function getFoundationalTeachMeMode(state: FoundationalQuestionAttemptState | undefined) {
  return state?.taughtOnce ? "retrieval_reminder" : "teach";
}
