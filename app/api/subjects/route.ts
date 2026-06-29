import { NextResponse } from "next/server";
import { getClinicalDecisionSubjectCounts } from "@/database/clinical-decisions";
import { getGeneratedSubjectCounts } from "@/lib/seed-case-generator";

export const dynamic = "force-dynamic";

export async function GET() {
  const persistedCounts = await getClinicalDecisionSubjectCounts();
  const generatedCounts = getGeneratedSubjectCounts();
  const countBySubject = new Map<string, number>();

  for (const item of generatedCounts) {
    countBySubject.set(item.subject, item.count);
  }
  for (const item of persistedCounts) {
    countBySubject.set(item.subject, Math.max(countBySubject.get(item.subject) ?? 0, item.count));
  }

  const subjectCounts = [...countBySubject.entries()].map(([subject, count]) => ({ subject, count }));

  return NextResponse.json({ subjectCounts });
}
