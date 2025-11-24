"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { CalendarAgendaEvent } from "@/lib/googleCalendar";

type CalendarResponse = {
  events: CalendarAgendaEvent[];
};

type CalendarWidgetProps = {
  calendarIframeSrc?: string;
  maxEvents?: number;
  refreshIntervalMs?: number;
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load calendar events");
  }
  return (await response.json()) as CalendarResponse;
};

const LOS_ANGELES_TIMEZONE = "America/Los_Angeles";
const TIMEZONE_PARAM_KEYS = ["ctz", "timezone", "tz"];

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: LOS_ANGELES_TIMEZONE,
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  timeZone: LOS_ANGELES_TIMEZONE,
});

const formatTimeRange = (event: CalendarAgendaEvent) => {
  if (event.isAllDay) {
    return "All day";
  }

  const start = timeFormatter.format(new Date(event.start));
  const end = timeFormatter.format(new Date(event.end));
  return `${start} – ${end}`;
};

const buildApiUrl = (maxEvents: number) => `/api/calendar?maxResults=${maxEvents}`;

const parseCalendarUrl = (rawUrl: string) => {
  try {
    return new URL(rawUrl);
  } catch {
    const fallbackBase =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://calendar.google.com";
    return new URL(rawUrl, fallbackBase);
  }
};

const enforceTimezoneParam = (url: URL) => {
  const existingKeys = Array.from(url.searchParams.keys());
  existingKeys.forEach((key) => {
    if (TIMEZONE_PARAM_KEYS.includes(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  });
  url.searchParams.set("ctz", LOS_ANGELES_TIMEZONE);
};

const ensureWeeklyIframeSrc = (src?: string) => {
  if (!src) return undefined;
  try {
    const url = parseCalendarUrl(src);
    if (!url.searchParams.get("mode")) {
      url.searchParams.set("mode", "WEEK");
    }
    enforceTimezoneParam(url);
    return url.toString();
  } catch {
    return src;
  }
};

export const CalendarWidget = ({
  calendarIframeSrc,
  maxEvents = 10,
  refreshIntervalMs = 60_000,
}: CalendarWidgetProps) => {
  const apiUrl = useMemo(() => buildApiUrl(maxEvents), [maxEvents]);
  const iframeSrc = useMemo(() => ensureWeeklyIframeSrc(calendarIframeSrc), [calendarIframeSrc]);

  const { data, error, isLoading, mutate } = useSWR(apiUrl, fetcher, {
    refreshInterval: refreshIntervalMs,
    revalidateOnFocus: true,
  });

  const events = data?.events ?? [];

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => mutate()}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          Refresh
        </button>
      </header>

      {iframeSrc ? (
        <iframe
          key={iframeSrc}
          className="h-[360px] w-full rounded-xl border border-slate-200"
          src={iframeSrc}
          title="Google Calendar"
          loading="lazy"
        />
      ) : (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Provide <code className="font-mono text-xs">NEXT_PUBLIC_CALENDAR_IFRAME_URL</code> to see the embedded
          Google Calendar view.
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <CalendarAgendaSkeleton />
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            Unable to load events. <button onClick={() => mutate()} className="font-semibold underline">Retry</button>
          </div>
        ) : events.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No upcoming events.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {events.map((event) => (
              <li key={event.id} className="flex items-start gap-4 py-3">
                <div className="w-24 text-left text-sm font-semibold text-slate-500">
                  <p>{dayFormatter.format(new Date(event.start))}</p>
                  <p className="text-xs font-normal text-slate-400">{formatTimeRange(event)}</p>
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-slate-900">{event.title}</p>
                  {event.location ? (
                    <p className="text-sm text-slate-500">{event.location}</p>
                  ) : null}
                  {event.description ? (
                    <p className="mt-1 text-sm text-slate-500">{event.description}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

const CalendarAgendaSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 4 }).map((_, index) => (
      <div
        key={index}
        className="flex animate-pulse items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3"
      >
        <div className="h-12 w-20 rounded-lg bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/2 rounded bg-slate-200" />
          <div className="h-3 w-1/3 rounded bg-slate-200" />
        </div>
      </div>
    ))}
  </div>
);

