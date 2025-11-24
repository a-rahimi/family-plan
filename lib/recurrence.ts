import { DateTime } from "luxon";
import type { RecurringRule } from "@prisma/client";
import { RecurrenceFrequency, TodoStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_TIME = { hour: 8, minute: 0 };

const parseTime = (value?: string) => {
  if (!value) return DEFAULT_TIME;
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return DEFAULT_TIME;
  const hour = Math.min(Number(match[1]), 23);
  const minute = Math.min(Number(match[2]), 59);
  return { hour, minute };
};

const sanitizeTimezone = (value?: string) => {
  if (!value) return "UTC";
  try {
    DateTime.now().setZone(value);
    return value;
  } catch {
    return "UTC";
  }
};

const jsonArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
};

const getMostRecentOccurrence = (
  rule: RecurringRule,
  timezone: string,
  reference: DateTime = DateTime.now().setZone(timezone),
) => {
  const time = parseTime(rule.timeOfDay ?? undefined);
  switch (rule.frequency) {
    case RecurrenceFrequency.DAILY:
      return getDailyOccurrence(reference, time);
    case RecurrenceFrequency.WEEKLY:
      return getWeeklyOccurrence(reference, time, jsonArray(rule.daysOfWeek));
    case RecurrenceFrequency.MONTHLY:
      return getMonthlyOccurrence(reference, time, rule.dayOfMonth ?? reference.day);
    default:
      return getDailyOccurrence(reference, time);
  }
};

const getDailyOccurrence = (now: DateTime, time: { hour: number; minute: number }) => {
  let candidate = now.set({ hour: time.hour, minute: time.minute, second: 0, millisecond: 0 });
  if (candidate > now) {
    candidate = candidate.minus({ days: 1 });
  }
  return candidate;
};

const WEEKDAY_ABBREVS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const getWeekdayAbbrev = (date: DateTime) =>
  date.weekdayShort
    ? date.weekdayShort.toUpperCase()
    : WEEKDAY_ABBREVS[(date.weekday + 6) % 7];

const getDaysInMonth = (date: DateTime) => date.daysInMonth ?? 30;

const getWeeklyOccurrence = (
  now: DateTime,
  time: { hour: number; minute: number },
  days: string[],
) => {
  const targetDays = days.length ? days : [getWeekdayAbbrev(now)];
  for (let offset = 0; offset < 7; offset += 1) {
    const candidateDay = now.minus({ days: offset });
    const weekdayAbbrev = getWeekdayAbbrev(candidateDay);
    if (targetDays.includes(weekdayAbbrev)) {
      const candidate = candidateDay.set({
        hour: time.hour,
        minute: time.minute,
        second: 0,
        millisecond: 0,
      });
      if (candidate <= now) {
        return candidate;
      }
    }
  }
  return now.set({ hour: time.hour, minute: time.minute }).minus({ weeks: 1 });
};

const getMonthlyOccurrence = (
  now: DateTime,
  time: { hour: number; minute: number },
  dayOfMonth: number = 1,
) => {
  let safeDay = Math.max(((dayOfMonth ?? 1) as number), 1);
  const currentMonthDays = getDaysInMonth(now);
  if (safeDay > currentMonthDays) {
    safeDay = currentMonthDays;
  }
  let candidate = now.set({
    day: safeDay,
    hour: time.hour,
    minute: time.minute,
    second: 0,
    millisecond: 0,
  });
  if (candidate > now) {
    const previousMonth = now.minus({ months: 1 });
    const prevSafeDay = Math.min(safeDay, getDaysInMonth(previousMonth));
    candidate = previousMonth.set({
      day: prevSafeDay,
      hour: time.hour,
      minute: time.minute,
      second: 0,
      millisecond: 0,
    });
  }

  return candidate;
};

export const refreshRecurringTodos = async () => {
  const todos = await prisma.todo.findMany({
    where: {
      status: TodoStatus.DONE,
      recurrenceRuleId: { not: null },
      completedAt: { not: null },
    },
    include: {
      recurrenceRule: true,
    },
  });

  if (!todos.length) {
    return { reactivated: 0 };
  }

  const toReactivate: string[] = [];

  todos.forEach((todo) => {
    if (!todo.recurrenceRule || !todo.completedAt) {
      return;
    }
    const timezone = sanitizeTimezone(
      todo.recurrenceRule.timezone ?? todo.timezone ?? "UTC",
    );
    const reference = DateTime.now().setZone(timezone);
    const occurrence = getMostRecentOccurrence(todo.recurrenceRule, timezone, reference);
    const completedAt = DateTime.fromJSDate(todo.completedAt).setZone(timezone);
    if (completedAt < occurrence) {
      toReactivate.push(todo.id);
    }
  });

  if (!toReactivate.length) {
    return { reactivated: 0 };
  }

  await prisma.todo.updateMany({
    where: { id: { in: toReactivate } },
    data: {
      status: TodoStatus.PENDING,
      completedAt: null,
      clearedAt: null,
    },
  });

  return { reactivated: toReactivate.length };
};


