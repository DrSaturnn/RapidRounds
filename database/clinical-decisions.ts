import { prisma } from "@/lib/prisma";
import { toPracticePromptDto } from "@/lib/clinical-decision-serializers";
import { getConceptSearchTerms } from "@/lib/learning-trajectory";

export async function getClinicalDecisionCount() {
  return prisma.clinicalDecision.count();
}

function searchWhere(concept: string, excludedIds: string[]) {
  const terms = getConceptSearchTerms(concept);

  return {
    ...(excludedIds.length > 0 ? { id: { notIn: excludedIds } } : {}),
    OR: terms.flatMap((term) => [
      { topic: { contains: term, mode: "insensitive" as const } },
      { clinicalPattern: { contains: term, mode: "insensitive" as const } },
      { pivotClue: { contains: term, mode: "insensitive" as const } },
      { tags: { contains: term, mode: "insensitive" as const } }
    ])
  };
}

export async function getNextClinicalDecision(excludedIds: string[], targetConcept?: string) {
  let decisions = targetConcept
    ? await prisma.clinicalDecision.findMany({
        where: searchWhere(targetConcept, excludedIds),
        orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
        take: 8
      })
    : [];

  if (decisions.length === 0) {
    decisions = await prisma.clinicalDecision.findMany({
      where: excludedIds.length > 0 ? { id: { notIn: excludedIds } } : undefined,
      orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
      take: 25
    });
  }

  if (decisions.length === 0 && targetConcept) {
    decisions = await prisma.clinicalDecision.findMany({
      where: searchWhere(targetConcept, []),
      orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
      take: 8
    });
  }

  if (decisions.length === 0) {
    decisions = await prisma.clinicalDecision.findMany({
      orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
      take: 25
    });
  }

  if (decisions.length === 0) {
    return null;
  }

  const decision = decisions[0];
  return toPracticePromptDto(decision);
}

export async function getRandomClinicalDecision(excludedIds: string[]) {
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
