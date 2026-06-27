import { NextResponse } from "next/server";
import { getAnalyticsStats } from "@/lib/stats";

export async function GET() {
  const analytics = await getAnalyticsStats();

  return NextResponse.json({ analytics });
}
