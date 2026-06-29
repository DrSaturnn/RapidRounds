import { subjectSeedsAsClinicalSchemas } from "@/lib/subject-seeds";

export type SourceType =
  | "uworld_explanation"
  | "nbme_style_question"
  | "mixed_question_and_explanation"
  | "unknown";

export type NbmeArchetype =
  | "Diagnosis"
  | "Next best step"
  | "Initial management"
  | "Definitive management"
  | "Mechanism/pathophysiology"
  | "Risk factor"
  | "Screening/prevention"
  | "Complication"
  | "Ethics/capacity"
  | "Biostatistics"
  | "Prognosis/counseling"
  | "Drug adverse effect"
  | "Unknown";

export type AuthorityLevel =
  | "educational_objective"
  | "correct_answer_marker"
  | "explanation_rationale"
  | "final_question_stem"
  | "answer_choices"
  | "clinical_stem"
  | "demographics_pmh"
  | "inferred";

export type PipelineStageName =
  | "sourceTypeDetector"
  | "questionTypeRouter"
  | "nbmeArchetypeRouter"
  | "clinicalSchemaMatcher"
  | "pivotEngine"
  | "answerChoiceParser"
  | "uworldExplanationParser"
  | "discriminatorExtractor"
  | "conceptCardBuilder"
  | "conceptMerger"
  | "learnerModelUpdater";

export type AnswerChoice = {
  label: string;
  text: string;
  isConfirmedCorrect: boolean;
};

export type CandidatePivot = {
  text: string;
  role: "pivot" | "supporting" | "distractor" | "context";
  source: AuthorityLevel;
  confidence: number;
};

export type ClinicalSchemaMatch = {
  id: string;
  name: string;
  category: string;
  matchedClues: string[];
  expectedPivots: string[];
  commonConfusions: string[];
  confidence: number;
};

export type Discriminator = {
  feature: string;
  correctConcept: string;
  competingConcept: string;
  distinguishingClue: string;
  source: AuthorityLevel;
  confidence: number;
};

export type ConceptCard = {
  testedConcept: string;
  clinicalSchema: string;
  archetype: NbmeArchetype;
  recognitionGoal: string;
  pivotSummary: string;
  answerChoiceComparison: Discriminator[];
  sourceConfidence: "confirmed" | "inferred" | "needs_review";
};

export type RapidRoundsReasoningObject = {
  sourceType: SourceType;
  questionType: string;
  nbmeArchetype: NbmeArchetype;
  clinicalSchema?: ClinicalSchemaMatch;
  candidatePivots: CandidatePivot[];
  answerChoices: AnswerChoice[];
  confirmedAnswer?: string;
  educationalObjectiveConcept?: string;
  discriminators: Discriminator[];
  conceptCard: ConceptCard;
  needsExpertReview: boolean;
  confidence: number;
  authorityTrace: AuthorityLevel[];
  pipelineTrace: Array<{
    stage: PipelineStageName;
    summary: string;
  }>;
  learnerModelUpdate: {
    likelyWeakSchema?: string;
    likelyConfusions: string[];
    reviewPriority: "low" | "medium" | "high";
  };
};

export type LocalReasoningInput = {
  rawText: string;
  highlightedText?: string;
  selectedAnswer?: string;
  learnerAnswer?: string;
};

type WorkingState = {
  input: LocalReasoningInput;
  sourceType: SourceType;
  questionType: string;
  nbmeArchetype: NbmeArchetype;
  clinicalStem: string;
  finalQuestionStem: string;
  answerChoices: AnswerChoice[];
  uworld: {
    educationalObjective?: string;
    educationalObjectiveConcept?: string;
    confirmedAnswer?: string;
    explanationSummary?: string;
    wrongAnswerRationales: Array<{
      label: string;
      concept: string;
      rationale: string;
    }>;
  };
  clinicalSchema?: ClinicalSchemaMatch;
  candidatePivots: CandidatePivot[];
  discriminators: Discriminator[];
  conceptCard?: ConceptCard;
  authorityTrace: AuthorityLevel[];
  pipelineTrace: RapidRoundsReasoningObject["pipelineTrace"];
};

const AUTHORITY_ORDER: AuthorityLevel[] = [
  "educational_objective",
  "correct_answer_marker",
  "explanation_rationale",
  "final_question_stem",
  "answer_choices",
  "clinical_stem",
  "demographics_pmh",
  "inferred"
];

const NBME_ARCHETYPE_PATTERNS: Array<{
  archetype: NbmeArchetype;
  patterns: RegExp[];
}> = [
  { archetype: "Diagnosis", patterns: [/most likely diagnosis/i, /most likely cause of .*symptoms/i, /diagnosis/i] },
  { archetype: "Next best step", patterns: [/next best step/i, /most appropriate next step/i, /next step in management/i] },
  { archetype: "Initial management", patterns: [/initial management/i, /first step/i, /immediate management/i, /initial treatment/i] },
  { archetype: "Definitive management", patterns: [/definitive management/i, /definitive treatment/i, /most appropriate treatment/i] },
  { archetype: "Mechanism/pathophysiology", patterns: [/mechanism/i, /pathophysiology/i, /underlying process/i] },
  { archetype: "Risk factor", patterns: [/risk factor/i, /increases.*risk/i, /predisposes/i] },
  { archetype: "Screening/prevention", patterns: [/screening/i, /prevent/i, /prophylaxis/i, /vaccin/i] },
  { archetype: "Complication", patterns: [/complication/i, /sequela/i, /most likely outcome/i] },
  { archetype: "Ethics/capacity", patterns: [/capacity/i, /consent/i, /surrogate/i, /confidential/i, /ethical/i] },
  { archetype: "Biostatistics", patterns: [/sensitivity/i, /specificity/i, /relative risk/i, /odds ratio/i, /number needed/i] },
  { archetype: "Prognosis/counseling", patterns: [/prognosis/i, /counsel/i, /reassure/i] },
  { archetype: "Drug adverse effect", patterns: [/adverse effect/i, /side effect/i, /toxicity/i, /medication.*cause/i, /contraindicat/i, /should be avoided/i] }
];

const CLINICAL_SCHEMAS: Array<Omit<ClinicalSchemaMatch, "matchedClues" | "confidence"> & { clueTerms: string[] }> = [
  {
    id: "placenta-previa",
    name: "Placenta previa",
    category: "Antepartum bleeding",
    clueTerms: ["painless", "bright red", "third trimester", "placenta", "no abdominal pain", "no contractions"],
    expectedPivots: ["painless bleeding", "avoid digital cervical exam", "placental location"],
    commonConfusions: ["Placental abruption", "Vasa previa", "Uterine rupture"]
  },
  {
    id: "placental-abruption",
    name: "Placental abruption",
    category: "Antepartum bleeding",
    clueTerms: ["painful bleeding", "tender uterus", "rigid uterus", "contractions", "cocaine", "trauma"],
    expectedPivots: ["painful bleeding", "uterine tenderness", "maternal or fetal instability"],
    commonConfusions: ["Placenta previa", "Uterine rupture"]
  },
  {
    id: "pid",
    name: "Pelvic inflammatory disease",
    category: "Vaginal discharge / STIs",
    clueTerms: ["pelvic pain", "fever", "cervical motion tenderness", "mucopurulent", "adnexal tenderness"],
    expectedPivots: ["cervical motion tenderness", "upper genital tract tenderness", "empiric treatment"],
    commonConfusions: ["Cervicitis", "Ectopic pregnancy", "Appendicitis"]
  },
  {
    id: "cervicitis",
    name: "Cervicitis",
    category: "Vaginal discharge / STIs",
    clueTerms: ["friable cervix", "mucopurulent cervical discharge", "chlamydia", "gonorrhea"],
    expectedPivots: ["friable cervix", "mucopurulent cervical discharge", "test for gonorrhea and chlamydia"],
    commonConfusions: ["Vaginitis", "Pelvic inflammatory disease"]
  },
  {
    id: "bacterial-vaginosis",
    name: "Bacterial vaginosis",
    category: "Vaginal discharge / STIs",
    clueTerms: ["clue cells", "fishy odor", "thin gray discharge", "positive whiff"],
    expectedPivots: ["clue cells", "fishy odor"],
    commonConfusions: ["Vulvovaginal candidiasis", "Trichomoniasis"]
  },
  {
    id: "trichomoniasis",
    name: "Trichomoniasis",
    category: "Vaginal discharge / STIs",
    clueTerms: ["motile organisms", "strawberry cervix", "frothy green", "metronidazole", "partners"],
    expectedPivots: ["motile organisms", "strawberry cervix", "treat partners"],
    commonConfusions: ["Bacterial vaginosis", "Cervicitis"]
  },
  {
    id: "ectopic-pregnancy",
    name: "Ectopic pregnancy",
    category: "First-trimester bleeding",
    clueTerms: ["adnexal mass", "no intrauterine pregnancy", "beta hcg", "pelvic pain", "first trimester", "shock"],
    expectedPivots: ["no intrauterine pregnancy", "adnexal mass", "hemodynamic instability"],
    commonConfusions: ["Threatened abortion", "Molar pregnancy"]
  },
  {
    id: "gestational-hypertension",
    name: "Gestational hypertension",
    category: "Hypertensive disorders of pregnancy",
    clueTerms: ["hypertension after 20 weeks", "no proteinuria", "no severe features"],
    expectedPivots: ["absence of proteinuria", "absence of severe features"],
    commonConfusions: ["Preeclampsia", "Chronic hypertension"]
  },
  {
    id: "preeclampsia",
    name: "Preeclampsia",
    category: "Hypertensive disorders of pregnancy",
    clueTerms: ["proteinuria", "severe features", "headache", "right upper quadrant pain", "low platelets", "elevated lfts"],
    expectedPivots: ["proteinuria", "severe features", "end-organ involvement"],
    commonConfusions: ["Gestational hypertension", "HELLP syndrome"]
  },
  ...subjectSeedsAsClinicalSchemas()
];

function clean(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function normalize(value: string) {
  return clean(value).toLowerCase();
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalize(value);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function containsAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function pushTrace(state: WorkingState, stage: PipelineStageName, summary: string) {
  state.pipelineTrace.push({ stage, summary });
}

function addAuthority(state: WorkingState, authority: AuthorityLevel) {
  if (!state.authorityTrace.includes(authority)) {
    state.authorityTrace.push(authority);
    state.authorityTrace.sort((a, b) => AUTHORITY_ORDER.indexOf(a) - AUTHORITY_ORDER.indexOf(b));
  }
}

function summarizeWithoutVerbatim(value: string) {
  const cleaned = clean(value);
  const terms = cleaned
    .split(/[.;:()]/)
    .flatMap((segment) => segment.split(/\band\b|\bwith\b|\bwithout\b|\bbecause\b/i))
    .map((term) => term.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, ""))
    .filter((term) => term.length >= 4 && term.length <= 72);

  return unique(terms).slice(0, 4).join("; ");
}

export function sourceTypeDetector(input: LocalReasoningInput): SourceType {
  const text = `${input.highlightedText ?? ""}\n${input.rawText}`;
  const hasUWorldStructure = /educational objective|objective:|explanation|incorrect answer|correct answer|answer choice/i.test(text);
  const hasQuestion = /\?|most likely|next best|initial|mechanism|risk factor|diagnosis/i.test(input.rawText);

  if (hasUWorldStructure && hasQuestion) {
    return "mixed_question_and_explanation";
  }

  if (hasUWorldStructure) {
    return "uworld_explanation";
  }

  if (hasQuestion) {
    return "nbme_style_question";
  }

  return "unknown";
}

function splitQuestionParts(rawText: string) {
  const lines = rawText.split(/\n+/).map(clean).filter(Boolean);
  const finalQuestion = [...lines].reverse().find((line) => /\?$|most likely|next best|initial|mechanism|risk factor|screening|complication/i.test(line)) ?? "";
  const choiceStart = lines.findIndex((line) => /^[A-J][).]\s+/.test(line));
  const stemLines = choiceStart >= 0 ? lines.slice(0, choiceStart) : lines;
  const clinicalStem = stemLines.filter((line) => line !== finalQuestion).join(" ");

  return {
    finalQuestionStem: finalQuestion,
    clinicalStem: clinicalStem || rawText
  };
}

export function questionTypeRouter(state: WorkingState) {
  const question = state.finalQuestionStem || state.input.rawText;
  const route = NBME_ARCHETYPE_PATTERNS.find((entry) => containsAny(question, entry.patterns));
  state.questionType = route?.archetype ?? "Unknown";
  addAuthority(state, state.finalQuestionStem ? "final_question_stem" : "clinical_stem");
  pushTrace(state, "questionTypeRouter", `Routed question type to ${state.questionType}.`);
  return state;
}

export function nbmeArchetypeRouter(state: WorkingState) {
  const fullText = `${state.finalQuestionStem}\n${state.clinicalStem}`;
  const route = NBME_ARCHETYPE_PATTERNS.find((entry) => containsAny(fullText, entry.patterns));
  state.nbmeArchetype = route?.archetype ?? state.questionType as NbmeArchetype;
  pushTrace(state, "nbmeArchetypeRouter", `Selected NBME archetype ${state.nbmeArchetype}.`);
  return state;
}

export function answerChoiceParser(state: WorkingState) {
  const choices = state.input.rawText
    .split(/\n+/)
    .map(clean)
    .map((line) => line.match(/^([A-J])[).]\s+(.+)$/i))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({
      label: match[1].toUpperCase(),
      text: clean(match[2]),
      isConfirmedCorrect: false
    }));

  state.answerChoices = choices;
  if (choices.length > 0) {
    addAuthority(state, "answer_choices");
  }
  pushTrace(state, "answerChoiceParser", `Parsed ${choices.length} answer choices.`);
  return state;
}

function extractSection(text: string, headings: string[]) {
  const headingPattern = headings.map((heading) => heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`(?:^|\\n)\\s*(?:${headingPattern})\\s*:?\\s*([\\s\\S]*?)(?=\\n\\s*(?:Educational objective|Objective|Correct answer|Explanation|Incorrect answer|Answer choice|Choice [A-J]|[A-J][).])\\s*:|$)`, "i");
  return clean(text.match(regex)?.[1]);
}

function inferConceptFromObjective(objective: string) {
  const cleaned = clean(objective)
    .replace(/^the educational objective is to\s+/i, "")
    .replace(/^this question tests\s+/i, "")
    .replace(/\b(recognize|identify|understand|know|learn|distinguish|treat|manage)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return summarizeWithoutVerbatim(cleaned) || cleaned.slice(0, 90);
}

export function uworldExplanationParser(state: WorkingState) {
  const text = clean(`${state.input.highlightedText ?? ""}\n${state.input.rawText}`);
  const educationalObjective = extractSection(text, ["Educational objective", "Objective"]);
  const correctAnswer = clean(
    text.match(/(?:correct answer|answer)\s*:?\s*(?:\(?([A-J])\)?[).]?\s*)?([^\n.]+)/i)?.[2]
  );
  const explanation = extractSection(text, ["Explanation", "Rationale"]);
  const wrongAnswerRationales = text
    .split(/\n(?=(?:Incorrect answer|Answer choice|Choice [A-J]|[A-J][).]))/i)
    .map(clean)
    .map((block) => {
      const match = block.match(/(?:Incorrect answer|Answer choice|Choice)?\s*([A-J])?[).:]?\s*([^:.\n]+)[:.]\s*([\s\S]+)$/i);
      if (!match || /correct/i.test(block.slice(0, 32))) {
        return null;
      }
      return {
        label: clean(match[1] ?? ""),
        concept: clean(match[2]),
        rationale: summarizeWithoutVerbatim(match[3])
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  state.uworld = {
    educationalObjective,
    educationalObjectiveConcept: educationalObjective ? inferConceptFromObjective(educationalObjective) : undefined,
    confirmedAnswer: correctAnswer,
    explanationSummary: explanation ? summarizeWithoutVerbatim(explanation) : undefined,
    wrongAnswerRationales
  };

  if (educationalObjective) {
    addAuthority(state, "educational_objective");
  }
  if (correctAnswer) {
    addAuthority(state, "correct_answer_marker");
    state.answerChoices = state.answerChoices.map((choice) => ({
      ...choice,
      isConfirmedCorrect:
        normalize(choice.label) === normalize(correctAnswer) ||
        normalize(correctAnswer).includes(normalize(choice.text)) ||
        normalize(choice.text).includes(normalize(correctAnswer))
    }));
  }
  if (explanation || wrongAnswerRationales.length > 0) {
    addAuthority(state, "explanation_rationale");
  }

  pushTrace(
    state,
    "uworldExplanationParser",
    educationalObjective || correctAnswer
      ? "Used highlighted explanation structure to confirm or refine the concept card."
      : "No high-authority UWorld explanation structure found."
  );
  return state;
}

export function clinicalSchemaMatcher(state: WorkingState) {
  const text = normalize([
    state.uworld.educationalObjectiveConcept,
    state.uworld.confirmedAnswer,
    state.finalQuestionStem,
    state.clinicalStem,
    ...state.answerChoices.map((choice) => choice.text)
  ].filter(Boolean).join(" "));

  const ranked = CLINICAL_SCHEMAS.map((schema) => {
    const matchedClues = unique(schema.clueTerms.filter((term) => text.includes(normalize(term))));
    const nameMatch = text.includes(normalize(schema.name)) ? 2 : 0;
    const score = matchedClues.length + nameMatch;

    return {
      id: schema.id,
      name: schema.name,
      category: schema.category,
      matchedClues,
      expectedPivots: schema.expectedPivots,
      commonConfusions: schema.commonConfusions,
      confidence: Math.min(0.96, score / Math.max(3, schema.clueTerms.length * 0.55))
    } satisfies ClinicalSchemaMatch;
  }).sort((left, right) => right.confidence - left.confidence || right.matchedClues.length - left.matchedClues.length);

  state.clinicalSchema = ranked[0]?.confidence > 0 ? ranked[0] : undefined;
  if (state.clinicalSchema?.matchedClues.length) {
    addAuthority(state, "clinical_stem");
  }
  pushTrace(
    state,
    "clinicalSchemaMatcher",
    state.clinicalSchema
      ? `Matched clinical schema ${state.clinicalSchema.name}.`
      : "No confident clinical schema match."
  );
  return state;
}

export function pivotEngine(state: WorkingState) {
  const text = normalize(`${state.clinicalStem} ${state.finalQuestionStem}`);
  const schemaPivots = state.clinicalSchema?.expectedPivots ?? [];
  const objectiveTerms = state.uworld.educationalObjectiveConcept ? [state.uworld.educationalObjectiveConcept] : [];
  const confirmedAnswerTerms = state.uworld.confirmedAnswer ? [state.uworld.confirmedAnswer] : [];
  const pivotTerms = unique([...schemaPivots, ...objectiveTerms, ...confirmedAnswerTerms])
    .map((term) => {
      const normalizedTerm = normalize(term);
      const appearsInStem = normalizedTerm && text.includes(normalizedTerm);
      return {
        text: term,
        role: appearsInStem ? "pivot" : "supporting",
        source: state.uworld.educationalObjectiveConcept === term
          ? "educational_objective"
          : state.uworld.confirmedAnswer === term
            ? "correct_answer_marker"
            : "clinical_stem",
        confidence: appearsInStem ? 0.86 : 0.62
      } satisfies CandidatePivot;
    });

  state.candidatePivots = pivotTerms.slice(0, 5);
  pushTrace(state, "pivotEngine", `Generated ${state.candidatePivots.length} candidate pivots.`);
  return state;
}

export function discriminatorExtractor(state: WorkingState) {
  const correctConcept = state.uworld.confirmedAnswer || state.clinicalSchema?.name || "Correct concept";
  const schemaDiscriminators = (state.clinicalSchema?.commonConfusions ?? []).map((confusion, index) => ({
    feature: index === 0 ? "Highest-yield discriminator" : "Nearby confusion",
    correctConcept,
    competingConcept: confusion,
    distinguishingClue: state.candidatePivots[0]?.text ?? state.clinicalSchema?.expectedPivots[0] ?? "Discriminating clue not yet confirmed",
    source: state.candidatePivots[0]?.source ?? "inferred",
    confidence: state.candidatePivots[0]?.confidence ?? 0.42
  } satisfies Discriminator));

  const rationaleDiscriminators = state.uworld.wrongAnswerRationales.map((rationale) => ({
    feature: "Wrong-answer rationale",
    correctConcept,
    competingConcept: rationale.concept,
    distinguishingClue: rationale.rationale || state.candidatePivots[0]?.text || "Compare against the pivot clue",
    source: "explanation_rationale",
    confidence: 0.88
  } satisfies Discriminator));

  state.discriminators = [...rationaleDiscriminators, ...schemaDiscriminators]
    .filter((entry, index, values) => values.findIndex((value) => normalize(value.competingConcept) === normalize(entry.competingConcept)) === index)
    .slice(0, 6);

  pushTrace(state, "discriminatorExtractor", `Extracted ${state.discriminators.length} discriminators.`);
  return state;
}

export function conceptCardBuilder(state: WorkingState) {
  const testedConcept =
    state.uworld.educationalObjectiveConcept ||
    state.uworld.confirmedAnswer ||
    state.clinicalSchema?.name ||
    state.answerChoices.find((choice) => choice.isConfirmedCorrect)?.text ||
    "Unconfirmed clinical concept";
  const pivotSummary =
    state.candidatePivots[0]?.text ||
    state.clinicalSchema?.expectedPivots[0] ||
    "Candidate pivot requires expert review";
  const sourceConfidence =
    state.authorityTrace.includes("educational_objective") || state.authorityTrace.includes("correct_answer_marker")
      ? "confirmed"
      : state.clinicalSchema && state.clinicalSchema.confidence >= 0.55
        ? "inferred"
        : "needs_review";

  state.conceptCard = {
    testedConcept,
    clinicalSchema: state.clinicalSchema?.name ?? "Unmatched schema",
    archetype: state.nbmeArchetype,
    recognitionGoal:
      state.discriminators[0]
        ? `Separate ${state.conceptCard?.testedConcept ?? testedConcept} from ${state.discriminators[0].competingConcept}.`
        : `Recognize ${testedConcept} under NBME-style time pressure.`,
    pivotSummary,
    answerChoiceComparison: state.discriminators,
    sourceConfidence
  };

  pushTrace(state, "conceptCardBuilder", `Built a ${sourceConfidence} concept card.`);
  return state;
}

export function conceptMerger(state: WorkingState) {
  if (!state.conceptCard) {
    return conceptCardBuilder(state);
  }

  if (state.uworld.educationalObjectiveConcept) {
    state.conceptCard = {
      ...state.conceptCard,
      testedConcept: state.uworld.educationalObjectiveConcept,
      sourceConfidence: "confirmed"
    };
  }

  if (state.uworld.confirmedAnswer) {
    state.conceptCard = {
      ...state.conceptCard,
      pivotSummary: state.candidatePivots[0]?.text ?? state.conceptCard.pivotSummary
    };
  }

  pushTrace(state, "conceptMerger", "Merged NBME inference with higher-authority explanation signals.");
  return state;
}

export function learnerModelUpdater(state: WorkingState) {
  const reviewPriority =
    !state.conceptCard || state.conceptCard.sourceConfidence === "needs_review"
      ? "high"
      : state.discriminators.length === 0
        ? "medium"
        : "low";

  pushTrace(state, "learnerModelUpdater", `Prepared learner model update with ${reviewPriority} review priority.`);

  return {
    likelyWeakSchema: state.clinicalSchema?.name,
    likelyConfusions: state.discriminators.map((discriminator) => discriminator.competingConcept).slice(0, 4),
    reviewPriority
  } satisfies RapidRoundsReasoningObject["learnerModelUpdate"];
}

function confidenceFor(state: WorkingState) {
  const authorityScore = state.authorityTrace.reduce((score, authority) => {
    const weight = Math.max(0.05, 1 - AUTHORITY_ORDER.indexOf(authority) * 0.11);
    return Math.max(score, weight);
  }, 0.18);
  const schemaScore = state.clinicalSchema?.confidence ?? 0;
  const pivotScore = state.candidatePivots[0]?.confidence ?? 0;
  const discriminatorScore = state.discriminators.length > 0 ? 0.12 : 0;

  return Number(Math.min(0.98, authorityScore * 0.46 + schemaScore * 0.25 + pivotScore * 0.21 + discriminatorScore).toFixed(2));
}

export function buildRapidRoundsReasoningObject(input: LocalReasoningInput): RapidRoundsReasoningObject {
  const sourceType = sourceTypeDetector(input);
  const parts = splitQuestionParts(input.rawText);
  let state: WorkingState = {
    input,
    sourceType,
    questionType: "Unknown",
    nbmeArchetype: "Unknown",
    clinicalStem: parts.clinicalStem,
    finalQuestionStem: parts.finalQuestionStem,
    answerChoices: [],
    uworld: {
      wrongAnswerRationales: []
    },
    candidatePivots: [],
    discriminators: [],
    authorityTrace: [],
    pipelineTrace: [{ stage: "sourceTypeDetector", summary: `Detected ${sourceType}.` }]
  };

  state = questionTypeRouter(state);
  state = nbmeArchetypeRouter(state);
  state = clinicalSchemaMatcher(state);
  state = pivotEngine(state);
  state = answerChoiceParser(state);
  state = uworldExplanationParser(state);
  state = clinicalSchemaMatcher(state);
  state = pivotEngine(state);
  state = discriminatorExtractor(state);
  state = conceptCardBuilder(state);
  state = conceptMerger(state);

  const confidence = confidenceFor(state);
  const needsExpertReview = confidence < 0.58 || state.conceptCard?.sourceConfidence === "needs_review";
  const learnerModelUpdate = learnerModelUpdater(state);

  return {
    sourceType,
    questionType: state.questionType,
    nbmeArchetype: state.nbmeArchetype,
    clinicalSchema: state.clinicalSchema,
    candidatePivots: state.candidatePivots,
    answerChoices: state.answerChoices,
    confirmedAnswer: state.uworld.confirmedAnswer || state.answerChoices.find((choice) => choice.isConfirmedCorrect)?.text,
    educationalObjectiveConcept: state.uworld.educationalObjectiveConcept,
    discriminators: state.discriminators,
    conceptCard: state.conceptCard!,
    needsExpertReview,
    confidence,
    authorityTrace: state.authorityTrace,
    pipelineTrace: state.pipelineTrace,
    learnerModelUpdate
  };
}
