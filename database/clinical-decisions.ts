import { prisma } from "@/lib/prisma";
import { toPracticePromptDto } from "@/lib/clinical-decision-serializers";

export async function getClinicalDecisionCount() {
  return prisma.clinicalDecision.count();
}

export async function getNextClinicalDecision(excludedIds: string[]) {
  let decisions = await prisma.clinicalDecision.findMany({
    where: excludedIds.length > 0 ? { id: { notIn: excludedIds } } : undefined,
    take: 25
  });

  if (decisions.length === 0) {
    decisions = await prisma.clinicalDecision.findMany({ take: 25 });
  }

  if (decisions.length === 0) {
    return null;
  }

  const decision = decisions[Math.floor(Math.random() * decisions.length)];
  return toPracticePromptDto(decision);
}
