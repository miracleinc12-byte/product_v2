import { NextResponse } from "next/server";
import { fetchGoogleTrends } from "@/lib/trending-fetcher";

export const revalidate = 1800;

export async function GET() {
  const trends = await fetchGoogleTrends("KR");
  return NextResponse.json(trends.slice(0, 15));
}
