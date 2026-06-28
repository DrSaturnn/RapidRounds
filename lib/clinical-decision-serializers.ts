import type { QuestionDto } from "@/types/practice";
import { applyRapidRoundsCaseMetadataToQuestion } from "@/lib/rapidrounds-case";

type ClinicalDecisionLike = {
  id: string;
  specialty: string;
  system: string;
  topic: string;
  clinicalPattern: string;
  decisionType: string;
  prompt: string;
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
  const question = {
    id: decision.id,
    specialty: decision.specialty,
    system: decision.system,
    topic: decision.topic,
    difficulty: decision.difficulty,
    stem: decision.prompt,
    decisionType: decision.decisionType as QuestionDto["decisionType"],
    pattern: decision.clinicalPattern,
    management: decision.managementPearl,
    diagnosis: decision.topic
  };

  return applyRapidRoundsCaseMetadataToQuestion(question, parseJsonArray(decision.tags));
}
