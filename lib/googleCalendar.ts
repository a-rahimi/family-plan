import { auth, calendar_v3 } from "@googleapis/calendar";
import { env } from "@/lib/env";

export type CalendarAgendaEvent = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  status: string;
  htmlLink?: string | null;
  isAllDay: boolean;
  start: string;
  end: string;
  attendees: string[];
};

type FetchOptions = {
  calendarId?: string;
  maxResults?: number;
  timeMin?: Date;
  timeMax?: Date;
  cacheTtlMs?: number;
};

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
const DEFAULT_TTL_MS = 60_000;

let calendarClient: calendar_v3.Calendar | null = null;
const cache = new Map<string, { expiresAt: number; events: CalendarAgendaEvent[] }>();

const formatPrivateKey = (key: string) => key.replace(/\\n/g, "\n");

const ensureEnv = () => {
  if (
    !env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    !env.GOOGLE_CALENDAR_ID
  ) {
    throw new Error(
      "Missing Google Calendar credentials. Verify GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, and GOOGLE_CALENDAR_ID.",
    );
  }
};

const getCalendarClient = async () => {
  if (calendarClient) {
    return calendarClient;
  }

  ensureEnv();

  const jwtClient = new auth.JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    key: formatPrivateKey(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!),
    scopes: SCOPES,
    subject: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  });

  await jwtClient.authorize();
  calendarClient = new calendar_v3.Calendar({ auth: jwtClient });

  return calendarClient;
};

const normalizeDateTime = (value?: calendar_v3.Schema$EventDateTime | null) => {
  if (!value) return null;

  if (value.dateTime) {
    return new Date(value.dateTime).toISOString();
  }

  if (value.date) {
    // Treat all-day events as midnight UTC for consistency.
    return new Date(`${value.date}T00:00:00.000Z`).toISOString();
  }

  return null;
};

const normalizeEvent = (event: calendar_v3.Schema$Event): CalendarAgendaEvent | null => {
  if (!event.id || !event.start || !event.end || !event.summary) {
    return null;
  }

  const start = normalizeDateTime(event.start);
  const end = normalizeDateTime(event.end);

  if (!start || !end) {
    return null;
  }

  const isAllDay = Boolean(event.start.date && !event.start.dateTime);

  return {
    id: event.id,
    title: event.summary,
    description: event.description,
    location: event.location,
    status: event.status ?? "confirmed",
    htmlLink: event.htmlLink,
    isAllDay,
    start,
    end,
    attendees:
      event.attendees
        ?.map((attendee) => attendee.email ?? attendee.displayName ?? "")
        .filter((value): value is string => Boolean(value)) ?? [],
  };
};

const getCacheKey = (calendarId: string, params: { timeMin: Date; timeMax?: Date; max: number }) =>
  [
    calendarId,
    params.timeMin.toISOString(),
    params.timeMax?.toISOString() ?? "no-max",
    params.max,
  ].join("|");

export const getUpcomingCalendarEvents = async (
  options: FetchOptions = {},
): Promise<CalendarAgendaEvent[]> => {
  ensureEnv();

  const calendarId = options.calendarId ?? env.GOOGLE_CALENDAR_ID!;
  const maxResults = options.maxResults ?? 25;
  const timeMin = options.timeMin ?? new Date();
  const timeMax = options.timeMax;
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_TTL_MS;
  const cacheKey = getCacheKey(calendarId, { timeMin, timeMax, max: maxResults });
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.events;
  }

  const client = await getCalendarClient();

  const response = await client.events.list({
    calendarId,
    singleEvents: true,
    orderBy: "startTime",
    maxResults,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax?.toISOString(),
  });

  const normalized =
    response.data.items?.map((event) => (event ? normalizeEvent(event) : null)).filter(Boolean) ?? [];

  cache.set(cacheKey, {
    events: normalized as CalendarAgendaEvent[],
    expiresAt: now + cacheTtlMs,
  });

  return normalized as CalendarAgendaEvent[];
};

export const clearCalendarCache = () => {
  cache.clear();
};

