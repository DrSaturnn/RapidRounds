import type { QuestionDto } from "@/types/practice";
import { buildPracticeVignetteAnnotations } from "@/lib/vignette-annotations";

type QuestionWithTopic = {
  id: string;
  specialty: string;
  difficulty: number;
  stem: string;
  pattern: string;
  management: string;
  diagnosis: string;
  topic: { name: string };
};

export function toQuestionDto(question: QuestionWithTopic): QuestionDto {
  const vignette = buildPracticeVignetteAnnotations({
    prompt: question.stem,
    topic: question.diagnosis,
    clinicalPattern: question.pattern,
    managementPearl: question.management
  });

  return {
    id: question.id,
    specialty: question.specialty,
    topic: question.topic.name,
    difficulty: question.difficulty,
    stem: question.stem,
    displayStem: vignette.displayStem,
    pattern: question.pattern,
    management: question.management,
    diagnosis: question.diagnosis,
    vignetteFindings: vignette.vignetteFindings
  };
}
