import { NextResponse } from "next/server";
import { getUpcomingCalendarEvents } from "@/lib/googleCalendar";

export const revalidate = 30;

const parseNumber = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseDate = (value: string | null) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const calendarId = searchParams.get("calendarId") ?? undefined;
  const maxResults = parseNumber(searchParams.get("maxResults"), 20);
  const timeMin = parseDate(searchParams.get("timeMin"));
  const timeMax = parseDate(searchParams.get("timeMax"));

  try {
    const events = await getUpcomingCalendarEvents({
      calendarId,
      maxResults,
      timeMin,
      timeMax,
    });

    return NextResponse.json(
      { events },
      {
        headers: {
          "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("Failed to fetch calendar events", error);
    return NextResponse.json(
      {
        error: "Unable to fetch calendar events.",
      },
      { status: 500 },
    );
  }
}

