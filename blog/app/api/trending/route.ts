import { NextResponse } from "next/server";
import { fetchNaverTrendKeywords } from "@/lib/naver-api";
import { getSettings } from "@/lib/settings";

export const revalidate = 1800;

export async function GET() {
  const settings = await getSettings(["NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET"]);
  if (!settings.NAVER_CLIENT_ID || !settings.NAVER_CLIENT_SECRET) {
    return NextResponse.json([]);
  }

  const trends = await fetchNaverTrendKeywords(
    {
      clientId: settings.NAVER_CLIENT_ID,
      clientSecret: settings.NAVER_CLIENT_SECRET,
    },
    10
  );

  return NextResponse.json(trends);
}