import { prisma } from "@/lib/prisma";
import { toQuestionDto } from "@/lib/serializers";

export async function getQuestionCount() {
  return prisma.question.count();
}

export async function getRecentQuestions(limit = 10) {
  const questions = await prisma.question.findMany({
    include: { topic: true },
    orderBy: { createdAt: "desc" },
    take: limit
  });

  return questions.map(toQuestionDto);
}
