import type { QuestionDto } from "@/types/practice";
import { applyRapidRoundsCaseMetadataToQuestion } from "@/lib/rapidrounds-case";
import { buildPracticeVignetteAnnotations } from "@/lib/vignette-annotations";

type ClinicalDecisionLike = {
  id: string;
  specialty: string;
  system: string;
  topic: string;
  clinicalPattern: string;
  decisionType: string;
  prompt: string;
  pivotClue?: string;
  commonTrap?: string | null;
  managementPearl: string;
  difficulty: number;
  tags?: string;
};

function parseJsonArray(value?: string) {
  try {
    const parsed = JSON.parse(value ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function toPracticePromptDto(decision: ClinicalDecisionLike): QuestionDto {
  const tags = parseJsonArray(decision.tags);
  const vignette = buildPracticeVignetteAnnotations({
    prompt: decision.prompt,
    topic: decision.topic,
    clinicalPattern: decision.clinicalPattern,
    decisionType: decision.decisionType,
    pivotClue: decision.pivotClue,
    commonTrap: decision.commonTrap,
    managementPearl: decision.managementPearl,
    tags
  });
  const question = {
    id: decision.id,
    specialty: decision.specialty,
    system: decision.system,
    topic: decision.topic,
    difficulty: decision.difficulty,
    stem: decision.prompt,
    displayStem: vignette.displayStem,
    decisionType: decision.decisionType as QuestionDto["decisionType"],
    pattern: decision.clinicalPattern,
    management: decision.managementPearl,
    diagnosis: decision.topic,
    vignetteFindings: vignette.vignetteFindings
  };

  return applyRapidRoundsCaseMetadataToQuestion(question, tags);
}
