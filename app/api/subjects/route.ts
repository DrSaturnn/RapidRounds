import { NextResponse } from "next/server";
import { getClinicalDecisionSubjectCounts } from "@/database/clinical-decisions";

export const dynamic = "force-dynamic";

export async function GET() {
  const subjectCounts = await getClinicalDecisionSubjectCounts();

  return NextResponse.json({ subjectCounts });
}
