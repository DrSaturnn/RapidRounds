import type { QuestionDto } from "@/types/practice";

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
};

export function toPracticePromptDto(decision: ClinicalDecisionLike): QuestionDto {
  return {
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
}
