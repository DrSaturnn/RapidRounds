import { getDecisionTypeDisplayText } from "@/lib/display-language";
import { getRapidRoundsVariantDisplayText } from "@/lib/rapidrounds-case";
import type { AnswerResult, QuestionDto, TutorContent, VignetteFindingAnnotation } from "@/types/practice";

export type ClinicalNotebookAnnotation = {
  text: string;
  role: "context" | "supporting" | "pivot" | "neutral" | "distractor";
  label: string;
  note?: string;
};

export type ClinicalNotebookReasoningStep = {
  label: string;
  value: string;
  tone?: "default" | "pivot" | "terminal";
};

export type ClinicalNotebookViewModel = {
  state: "question" | "explanation";
  header: {
    subject: string;
    topic: string;
    progressLabel: string;
    progressDots: boolean[];
    learningGoal: string;
    variant?: string;
  };
  vignette: {
    rawStem: string;
    teachingStem: string;
    prompt: string;
    question: string;
    annotations: ClinicalNotebookAnnotation[];
  };
  reasoning: {
    title: string;
    steps: ClinicalNotebookReasoningStep[];
    correctAnswer?: string;
    pivotClue?: string;
    whatMattered?: string;
    commonConfusion?: string;
    pearl?: string;
  };
  rightPage?: {
    whyCorrect: string;
    whyWrong?: {
      label: string;
      text: string;
    };
    reasoningDiagnosis: string;
    teachMeMore?: {
      illnessScript?: string;
      recognitionGoal?: string;
      nbmePivot?: string;
      comparisonRows: Array<{
        feature: string;
        correct: string;
        competing: string;
      }>;
    };
  };
};

function clean(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function roleToNotebookRole(role: VignetteFindingAnnotation["role"]): ClinicalNotebookAnnotation["role"] {
  switch (role) {
    case "pivot_clue":
      return "pivot";
    case "noise":
      return "distractor";
    default:
      return role;
  }
}

function roleToLabel(role: ClinicalNotebookAnnotation["role"]) {
  switch (role) {
    case "pivot":
      return "Pivot clue";
    case "supporting":
      return "Supporting clue";
    case "distractor":
      return "Distractor";
    case "neutral":
      return "Neutral";
    case "context":
      return "Context";
  }
}

function normalizeAnnotation(finding: VignetteFindingAnnotation): ClinicalNotebookAnnotation {
  const role = roleToNotebookRole(finding.role);

  return {
    text: clean(finding.text),
    role,
    label: roleToLabel(role),
    note: clean(finding.explanation) || undefined
  };
}

function dedupeAnnotations(values: ClinicalNotebookAnnotation[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const key = value.text.toLowerCase();
    if (!value.text || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function fallbackTeachingStem(question: QuestionDto, tutor?: TutorContent | null) {
  const pattern = clean(tutor?.repair.recognitionClues?.[0] ?? question.pattern ?? question.topic);
  const pivot = clean(tutor?.repair.clue);
  const management = clean(question.management || tutor?.managementPearl);
  const diagnosis = clean(question.diagnosis || tutor?.correctAnswer || question.topic);
  const task = clean(question.decisionType);

  if (question.displayStem && question.displayStem !== question.stem) {
    return question.displayStem;
  }

  if (question.stem.length > 95) {
    return question.stem;
  }

  return [
    pattern ? `A patient presents with ${pattern.toLowerCase()}.` : question.stem,
    pivot ? `The pivot finding is ${pivot.toLowerCase()}.` : "",
    task ? `${getDecisionTypeDisplayText(task)} this presentation.` : "",
    management && diagnosis ? `${management}.` : ""
  ].filter(Boolean).join(" ");
}

function buildQuestionAnnotations(question: QuestionDto, tutor?: TutorContent | null) {
  const source = tutor?.vignetteFindings?.length ? tutor.vignetteFindings : question.vignetteFindings ?? [];
  const annotations = dedupeAnnotations(source.map(normalizeAnnotation));

  if (annotations.length > 0) {
    return annotations;
  }

  const fallback: ClinicalNotebookAnnotation[] = [];
  if (tutor?.repair.clue) {
    fallback.push({
      text: tutor.repair.clue,
      role: "pivot",
      label: "Pivot clue",
      note: tutor.repair.clueMeaning
    });
  }
  if (question.pattern) {
    fallback.push({
      text: question.pattern,
      role: "context",
      label: "Context"
    });
  }
  if (question.management) {
    fallback.push({
      text: question.management,
      role: "supporting",
      label: "Supporting clue"
    });
  }

  return dedupeAnnotations(fallback);
}

function getDecisionTaskLabel(question: QuestionDto, tutor?: TutorContent | null) {
  const decisionType = clean(question.decisionType);
  const answerLabel = clean(tutor?.repair.answerLabel);

  if (/diagnosis/i.test(decisionType) || /diagnosis/i.test(answerLabel)) {
    return "Name the diagnosis";
  }

  if (/contraindication/i.test(decisionType)) {
    return "Avoid";
  }

  if (/management|treatment|step/i.test(decisionType) || /action|management|treatment|step/i.test(answerLabel)) {
    return "Choose the next step";
  }

  return decisionType ? getDecisionTypeDisplayText(decisionType) : "Make the decision";
}

function buildReasoningSteps(question: QuestionDto, tutor?: TutorContent | null): ClinicalNotebookReasoningStep[] {
  const clinicalPattern = clean(tutor?.repair.recognitionClues?.[0] ?? question.pattern ?? question.topic);
  const pivot = clean(tutor?.repair.clue ?? question.vignetteFindings?.find((finding) => finding.role === "pivot_clue")?.text);
  const decision = getDecisionTaskLabel(question, tutor);
  const correctAnswer = clean(tutor?.repair.correctAnswer ?? tutor?.correctAnswer ?? question.diagnosis ?? question.management);

  const steps: ClinicalNotebookReasoningStep[] = [
    { label: "Clinical pattern", value: clinicalPattern },
    { label: "Pivot clue", value: pivot, tone: "pivot" },
    { label: "Decision", value: decision },
    { label: "Correct answer", value: correctAnswer, tone: "terminal" }
  ];

  return steps.filter((step) => step.value);
}

export function buildClinicalNotebookViewModel({
  question,
  tutor,
  result,
  hasAnswered,
  subject,
  sessionDecisionCount,
  displayedTotalDecisionCount,
  progressDots,
  decisionQuestion
}: {
  question: QuestionDto;
  tutor?: TutorContent | null;
  result?: AnswerResult | null;
  hasAnswered: boolean;
  subject: string;
  sessionDecisionCount: number;
  displayedTotalDecisionCount: number;
  progressDots: boolean[];
  decisionQuestion: string;
}): ClinicalNotebookViewModel {
  const topic = question.canonicalProblem ?? question.system ?? question.topic;
  const teachingStem = fallbackTeachingStem(question, tutor);
  const prompt = hasAnswered ? teachingStem : question.stem;
  const annotations = hasAnswered ? buildQuestionAnnotations(question, tutor) : [];
  const correctAnswer = clean(tutor?.repair.correctAnswer ?? result?.correctAnswer ?? question.diagnosis ?? question.management);
  const pivotClue = clean(tutor?.repair.clue ?? annotations.find((annotation) => annotation.role === "pivot")?.text);
  const whyCorrect = clean(tutor?.repair.clueMeaning ?? result?.explanation ?? result?.boardPearl);
  const commonConfusion = clean(tutor?.comparison.competingDiagnosis);
  const pearl = clean(tutor?.repair.fingerprint ?? tutor?.managementPearl ?? result?.boardPearl);

  return {
    state: hasAnswered ? "explanation" : "question",
    header: {
      subject,
      topic,
      progressLabel: `Q ${Math.max(sessionDecisionCount, 1)} / ${displayedTotalDecisionCount}`,
      progressDots,
      learningGoal: question.topic ? `Learning goal: ${question.topic}` : "Learning goal: make the next clinical decision",
      variant: getRapidRoundsVariantDisplayText(question.variantType)
    },
    vignette: {
      rawStem: question.stem,
      teachingStem,
      prompt,
      question: decisionQuestion,
      annotations
    },
    reasoning: {
      title: "Build the pattern",
      steps: buildReasoningSteps(question, tutor),
      correctAnswer: hasAnswered ? correctAnswer : undefined,
      pivotClue: hasAnswered ? pivotClue : undefined,
      whatMattered: hasAnswered ? whyCorrect : undefined,
      commonConfusion: hasAnswered ? commonConfusion : undefined,
      pearl: hasAnswered ? pearl : undefined
    },
    rightPage: hasAnswered
      ? {
          whyCorrect: whyCorrect || `The pivot clue supports ${correctAnswer}.`,
          whyWrong: commonConfusion
            ? {
                label: commonConfusion,
                text: clean(tutor?.whyTempting) || `The pivot clue supports ${correctAnswer}, not this alternative.`
              }
            : undefined,
          reasoningDiagnosis: clean(tutor?.cognitiveError?.expertCorrection) || `Experts attach the pivot clue directly to ${correctAnswer}.`,
          teachMeMore: tutor
            ? {
                illnessScript: clean(tutor.illnessScript.classicPresentation),
                recognitionGoal: clean(tutor.illnessScript.recognitionGoal),
                nbmePivot: clean(tutor.nbmePivot),
                comparisonRows: tutor.comparison.rows
              }
            : undefined
        }
      : undefined
  };
}
