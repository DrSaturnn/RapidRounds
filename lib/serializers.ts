import type { QuestionDto } from "@/types/practice";

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
  return {
    id: question.id,
    specialty: question.specialty,
    topic: question.topic.name,
    difficulty: question.difficulty,
    stem: question.stem,
    pattern: question.pattern,
    management: question.management,
    diagnosis: question.diagnosis
  };
}
