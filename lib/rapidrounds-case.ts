import type { QuestionDto, VignetteFindingAnnotation } from "@/types/practice";

export const RAPIDROUNDS_CASE_TAG_PREFIX = "rapidrounds_case::";
export const VIGNETTE_FINDING_TAG_PREFIX = "vignette_finding::";

export type RapidRoundsDomain = "obgyn" | "surgery" | "psych" | "medicine" | "pediatrics";

export type RapidRoundsVariantType =
  | "recognition"
  | "diagnosis"
  | "next_best_step"
  | "stable_management"
  | "unstable_management"
  | "contraindication"
  | "complication"
  | "differential_boundary"
  | "lab_interpretation"
  | "imaging_interpretation"
  | "follow_up"
  | "methotrexate_eligibility"
  | "rhogam_indication";

export type RapidRoundsCase = {
  id: string;
  scriptId: string;
  domain: RapidRoundsDomain;
  topic: string;
  canonicalProblem: string;
  variantType: RapidRoundsVariantType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  vignette: string;
  answerPrompt: string;
  acceptedAnswers: string[];
  pivotClues: string[];
  supportingClues: string[];
  distractorClues: string[];
  correctReasoning: string;
  commonWrongReasoning: string[];
  decisionBoundary: Array<{
    confusedWith: string;
    howToDistinguish: string;
  }>;
  teachMeMore: string;
};

export type RapidRoundsCaseMetadata = Pick<
  RapidRoundsCase,
  | "id"
  | "scriptId"
  | "domain"
  | "canonicalProblem"
  | "variantType"
  | "pivotClues"
  | "supportingClues"
  | "distractorClues"
  | "correctReasoning"
  | "commonWrongReasoning"
  | "decisionBoundary"
  | "teachMeMore"
>;

export type ClinicalDecisionSeedFromCase = {
  id: string;
  system: string;
  topic: string;
  clinicalPattern: string;
  decisionType: string;
  prompt: string;
  acceptedAnswers: string[];
  boardPearl: string;
  pivotClue: string;
  commonTrap: string;
  managementPearl: string;
  difficulty: number;
  tags: string[];
  vignetteFindings: VignetteFindingAnnotation[];
};

function sentence(value: string) {
  return value.replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
}

function titleCase(value: string) {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

export function getRapidRoundsVariantDisplayText(variantType?: string) {
  if (!variantType) {
    return undefined;
  }

  const copy: Record<string, string> = {
    recognition: "Recognition",
    diagnosis: "Diagnosis",
    next_best_step: "Next best step",
    stable_management: "Stable management",
    unstable_management: "Unstable management",
    methotrexate_eligibility: "Methotrexate eligibility",
    rhogam_indication: "RhIG indication",
    differential_boundary: "Differential boundary",
    lab_interpretation: "Lab interpretation",
    imaging_interpretation: "Imaging interpretation"
  };

  return copy[variantType] ?? titleCase(variantType);
}

function variantToDecisionType(variantType: RapidRoundsVariantType) {
  const decisionTypeByVariant: Record<RapidRoundsVariantType, string> = {
    recognition: "Pattern Recognition",
    diagnosis: "Diagnosis",
    next_best_step: "Next Best Step",
    stable_management: "Management",
    unstable_management: "Management",
    contraindication: "Contraindication",
    complication: "Complication",
    differential_boundary: "Diagnosis",
    lab_interpretation: "Interpretation",
    imaging_interpretation: "Interpretation",
    follow_up: "Management",
    methotrexate_eligibility: "Management",
    rhogam_indication: "Prevention"
  };

  return decisionTypeByVariant[variantType];
}

function buildVignetteFindings(rrCase: RapidRoundsCase): VignetteFindingAnnotation[] {
  const context: VignetteFindingAnnotation = {
    text: rrCase.canonicalProblem,
    role: "context"
  };
  const supporting = rrCase.supportingClues.map((text) => ({
    text,
    role: "supporting" as const
  }));
  const pivots = rrCase.pivotClues.map((text) => ({
    text,
    role: "pivot_clue" as const,
    explanation: rrCase.correctReasoning
  }));
  const distractors = rrCase.distractorClues.map((text) => ({
    text,
    role: "noise" as const,
    explanation: "This finding can be tempting, but it is not the deciding clue for this variant."
  }));

  return [context, ...supporting, ...pivots, ...distractors];
}

export function getRapidRoundsCaseMetadata(rrCase: RapidRoundsCase): RapidRoundsCaseMetadata {
  return {
    id: rrCase.id,
    scriptId: rrCase.scriptId,
    domain: rrCase.domain,
    canonicalProblem: rrCase.canonicalProblem,
    variantType: rrCase.variantType,
    pivotClues: rrCase.pivotClues,
    supportingClues: rrCase.supportingClues,
    distractorClues: rrCase.distractorClues,
    correctReasoning: rrCase.correctReasoning,
    commonWrongReasoning: rrCase.commonWrongReasoning,
    decisionBoundary: rrCase.decisionBoundary,
    teachMeMore: rrCase.teachMeMore
  };
}

export function serializeRapidRoundsCaseTag(rrCase: RapidRoundsCase) {
  return `${RAPIDROUNDS_CASE_TAG_PREFIX}${JSON.stringify(getRapidRoundsCaseMetadata(rrCase))}`;
}

export function rapidRoundsCaseToClinicalDecisionSeed(rrCase: RapidRoundsCase): ClinicalDecisionSeedFromCase {
  const pivot = sentence(rrCase.pivotClues[0] ?? rrCase.canonicalProblem);
  const commonTrap = sentence(rrCase.decisionBoundary[0]?.confusedWith ?? rrCase.commonWrongReasoning[0] ?? "");

  return {
    id: rrCase.id,
    system: "Early Pregnancy",
    topic: rrCase.topic,
    clinicalPattern: rrCase.canonicalProblem,
    decisionType: variantToDecisionType(rrCase.variantType),
    prompt: `${rrCase.vignette}\n\n${rrCase.answerPrompt}`,
    acceptedAnswers: rrCase.acceptedAnswers,
    boardPearl: rrCase.correctReasoning,
    pivotClue: pivot,
    commonTrap,
    managementPearl: rrCase.teachMeMore,
    difficulty: rrCase.difficulty,
    tags: [
      rrCase.scriptId,
      rrCase.canonicalProblem,
      rrCase.variantType,
      ...rrCase.pivotClues,
      ...rrCase.supportingClues,
      ...rrCase.distractorClues,
      ...rrCase.decisionBoundary.map((boundary) => boundary.confusedWith),
      serializeRapidRoundsCaseTag(rrCase)
    ],
    vignetteFindings: buildVignetteFindings(rrCase)
  };
}

export function parseRapidRoundsCaseMetadata(tags: string[]) {
  const metadataTag = tags.find((tag) => tag.startsWith(RAPIDROUNDS_CASE_TAG_PREFIX));

  if (!metadataTag) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(metadataTag.slice(RAPIDROUNDS_CASE_TAG_PREFIX.length)) as Partial<RapidRoundsCaseMetadata>;

    if (!parsed.scriptId || !parsed.canonicalProblem || !parsed.variantType) {
      return undefined;
    }

    const domain = ["obgyn", "surgery", "psych", "medicine", "pediatrics"].includes(String(parsed.domain))
      ? parsed.domain as RapidRoundsDomain
      : "obgyn";

    return {
      id: String(parsed.id ?? ""),
      scriptId: parsed.scriptId,
      domain,
      canonicalProblem: parsed.canonicalProblem,
      variantType: parsed.variantType as RapidRoundsVariantType,
      pivotClues: parsed.pivotClues ?? [],
      supportingClues: parsed.supportingClues ?? [],
      distractorClues: parsed.distractorClues ?? [],
      correctReasoning: parsed.correctReasoning ?? "",
      commonWrongReasoning: parsed.commonWrongReasoning ?? [],
      decisionBoundary: parsed.decisionBoundary ?? [],
      teachMeMore: parsed.teachMeMore ?? ""
    } satisfies RapidRoundsCaseMetadata;
  } catch {
    return undefined;
  }
}

export function applyRapidRoundsCaseMetadataToQuestion(
  question: QuestionDto,
  tags: string[]
): QuestionDto {
  const metadata = parseRapidRoundsCaseMetadata(tags);

  if (!metadata) {
    return question;
  }

  return {
    ...question,
    scriptId: metadata.scriptId,
    canonicalProblem: metadata.canonicalProblem,
    variantType: metadata.variantType
  };
}
