import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import matter from "gray-matter";
import { z } from "zod";
import { RecurrenceFrequency } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const TODOS_DIR = path.join(process.cwd(), "content", "todos");

const frontmatterSchema = z.object({
  member: z.string(),
  name: z.string().optional(),
  color: z.string().optional(),
  timezone: z.string().optional(),
});

type Frontmatter = z.infer<typeof frontmatterSchema>;

type ParsedRecurring = {
  frequency: RecurrenceFrequency;
  daysOfWeek?: string[];
  dayOfMonth?: number;
  timeOfDay?: string;
  raw: string;
};

export type ParsedMarkdownTodo = {
  sourceKey: string;
  title: string;
  notes?: string;
  category?: string;
  tags: string[];
  timeOfDay?: string;
  timezone?: string;
  metadata: Record<string, string>;
  recurring?: ParsedRecurring;
  sourceLine: number;
};

export type ParsedMarkdownFile = {
  path: string;
  checksum: string;
  frontmatter: Frontmatter & { slug: string };
  todos: ParsedMarkdownTodo[];
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "task";

const checksum = (content: string) => crypto.createHash("sha256").update(content).digest("hex");

const normalizeTime = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return undefined;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

const parseTags = (value?: string) =>
  value
    ?.split(",")
    .map((tag) => tag.trim())
    .filter(Boolean) ?? [];

const parseRecurring = (value?: string, fallbackTime?: string): ParsedRecurring | undefined => {
  if (!value) return undefined;
  const raw = value.trim();
  if (!raw) return undefined;

  const [patternPart, timePart] = raw.split("@");
  const timeOfDay = normalizeTime(timePart ?? fallbackTime);
  const pattern = patternPart.toLowerCase();

  if (pattern.startsWith("weekly:")) {
    const daysRaw = pattern.split(":")[1] ?? "";
    const days = daysRaw
      .split(",")
      .map((day) => day.trim().slice(0, 3).toUpperCase())
      .filter(Boolean);
    return {
      frequency: RecurrenceFrequency.WEEKLY,
      daysOfWeek: days,
      timeOfDay,
      raw,
    };
  }

  if (pattern.startsWith("monthly:")) {
    const dayStr = pattern.split(":")[1];
    const dayNumber = dayStr ? Number(dayStr) : undefined;
    return {
      frequency: RecurrenceFrequency.MONTHLY,
      dayOfMonth: Number.isFinite(dayNumber) ? dayNumber : undefined,
      timeOfDay,
      raw,
    };
  }

  if (pattern === "weekday") {
    return {
      frequency: RecurrenceFrequency.WEEKLY,
      daysOfWeek: ["MON", "TUE", "WED", "THU", "FRI"],
      timeOfDay,
      raw,
    };
  }

  if (pattern === "weekend") {
    return {
      frequency: RecurrenceFrequency.WEEKLY,
      daysOfWeek: ["SAT", "SUN"],
      timeOfDay,
      raw,
    };
  }

  if (pattern === "daily") {
    return {
      frequency: RecurrenceFrequency.DAILY,
      timeOfDay,
      raw,
    };
  }

  return {
    frequency: RecurrenceFrequency.CUSTOM,
    timeOfDay,
    raw,
  };
};

const assignSourceKeys = (todos: (ParsedMarkdownTodo & { metadata: Record<string, string> })[]) => {
  const seenKeys = new Set<string>();

  todos.forEach((todo) => {
    const candidate = todo.metadata.id ?? slugify(todo.title);
    let key = candidate;
    let counter = 1;
    while (seenKeys.has(key)) {
      key = `${candidate}-${counter}`;
      counter += 1;
    }
    seenKeys.add(key);
    todo.sourceKey = key;
  });
};

const extractTodos = (body: string): ParsedMarkdownTodo[] => {
  const lines = body.split(/\r?\n/);
  const todos: ParsedMarkdownTodo[] = [];
  let currentSection: string | undefined;
  let current: ParsedMarkdownTodo | null = null;
  let currentMetadata: Record<string, string> | null = null;

  const pushCurrent = () => {
    if (current && currentMetadata) {
      current.metadata = currentMetadata;
      todos.push(current);
    }
    current = null;
    currentMetadata = null;
  };

  lines.forEach((line, index) => {
    const headingMatch = line.match(/^#{2,6}\s+(.*)$/);
    if (headingMatch) {
      pushCurrent();
      currentSection = headingMatch[1].trim();
      return;
    }

    const todoMatch = line.match(/^- \[( |x|X)\]\s+(.*)$/);
    if (todoMatch) {
      pushCurrent();
      current = {
        sourceKey: "",
        title: todoMatch[2].trim(),
        category: currentSection,
        tags: [],
        metadata: {},
        sourceLine: index + 1,
      };
      currentMetadata = {};
      return;
    }

    if (current && line.startsWith("  ")) {
      const trimmed = line.trim();
      if (!trimmed) return;
      const [rawKey, ...rest] = trimmed.split(":");
      if (!rawKey || rest.length === 0) {
        current.notes = current.notes ? `${current.notes}\n${trimmed}` : trimmed;
        return;
      }
      const key = rawKey.trim().toLowerCase();
      const value = rest.join(":").trim();
      if (currentMetadata) {
        currentMetadata[key] = value;
      }
      return;
    }
  });

  pushCurrent();
  assignSourceKeys(todos);

  return todos.map((todo) => {
    const tags = parseTags(todo.metadata.tags);
    const notes = todo.metadata.notes ?? todo.notes;
    const timeOfDay = normalizeTime(todo.metadata.time);
    const recurring = parseRecurring(todo.metadata.recurring, timeOfDay);
    return {
      ...todo,
      tags,
      notes,
      timeOfDay,
      recurring,
    };
  });
};

export const parseMarkdownFile = async (filePath: string): Promise<ParsedMarkdownFile> => {
  const content = await fs.readFile(filePath, "utf-8");
  const fileChecksum = checksum(content);
  const parsed = matter(content);
  const data = frontmatterSchema.parse(parsed.data);
  const slug = data.member ?? slugify(path.basename(filePath, ".md"));

  return {
    path: path.relative(process.cwd(), filePath),
    checksum: fileChecksum,
    frontmatter: {
      ...data,
      slug,
    },
    todos: extractTodos(parsed.content),
  };
};

export const loadMarkdownTodoFiles = async (): Promise<ParsedMarkdownFile[]> => {
  try {
    const entries = await fs.readdir(TODOS_DIR, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => path.join(TODOS_DIR, entry.name));

    const parsed = await Promise.all(files.map((file) => parseMarkdownFile(file)));
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
};

type SyncSummary = {
  filesProcessed: number;
  todosProcessed: number;
};

const upsertFamilyMember = async (frontmatter: ParsedMarkdownFile["frontmatter"]) =>
  prisma.familyMember.upsert({
    where: { slug: frontmatter.slug },
    update: {
      name: frontmatter.name ?? frontmatter.slug,
      colorHex: frontmatter.color,
      timezone: frontmatter.timezone,
    },
    create: {
      slug: frontmatter.slug,
      name: frontmatter.name ?? frontmatter.slug,
      colorHex: frontmatter.color,
      timezone: frontmatter.timezone,
    },
  });

const upsertMarkdownSource = async (file: ParsedMarkdownFile) =>
  prisma.markdownSource.upsert({
    where: { path: file.path },
    update: {
      checksum: file.checksum,
      lastSyncedAt: new Date(),
    },
    create: {
      path: file.path,
      checksum: file.checksum,
    },
  });

const upsertRecurringRule = async ({
  todo,
  memberId,
  sourceId,
  timezone,
}: {
  todo: ParsedMarkdownTodo;
  memberId: string;
  sourceId: string;
  timezone?: string;
}) => {
  if (!todo.recurring) {
    return null;
  }

  const recurringKey = `${todo.sourceKey}-recurring`;

  const existing = await prisma.recurringRule.findFirst({
    where: {
      sourceId,
      sourceKey: recurringKey,
    },
  });

  const data = {
    memberId,
    title: todo.title,
    notes: todo.notes,
    frequency: todo.recurring.frequency,
    interval: 1,
    daysOfWeek: todo.recurring.daysOfWeek ?? undefined,
    dayOfMonth: todo.recurring.dayOfMonth,
    timeOfDay: todo.recurring.timeOfDay ?? todo.timeOfDay,
    timezone: timezone ?? "UTC",
    sourceId,
    sourceKey: recurringKey,
    metadata: {
      raw: todo.recurring.raw,
    },
  };

  if (existing) {
    return prisma.recurringRule.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.recurringRule.create({
    data,
  });
};

const upsertTodo = async ({
  todo,
  memberId,
  sourceId,
  recurrenceId,
  timezone,
}: {
  todo: ParsedMarkdownTodo;
  memberId: string;
  sourceId: string;
  recurrenceId?: string | null;
  timezone?: string;
}) => {
  const existing = await prisma.todo.findFirst({
    where: {
      sourceId,
      sourceKey: todo.sourceKey,
    },
  });

  const commonData = {
    memberId,
    title: todo.title,
    notes: todo.notes,
    category: todo.category,
    tags: todo.tags,
    timeOfDay: todo.timeOfDay,
    timezone: timezone ?? undefined,
    metadata: {
      ...todo.metadata,
      category: todo.category,
      tags: todo.tags,
    },
    sourceId,
    sourceKey: todo.sourceKey,
    sourceLine: todo.sourceLine,
    recurrenceRuleId: recurrenceId ?? null,
  };

  if (existing) {
    return prisma.todo.update({
      where: { id: existing.id },
      data: commonData,
    });
  }

  return prisma.todo.create({
    data: {
      ...commonData,
      status: "PENDING",
    },
  });
};

export const syncMarkdownTodos = async (): Promise<SyncSummary> => {
  const files = await loadMarkdownTodoFiles();
  let todosProcessed = 0;

  await resetMarkdownState();

  for (const file of files) {
    const [member, source] = await Promise.all([
      upsertFamilyMember(file.frontmatter),
      upsertMarkdownSource(file),
    ]);

    const keptTodoKeys = new Set<string>();
    const keptRecurringKeys = new Set<string>();

    for (const todo of file.todos) {
      const recurrence = await upsertRecurringRule({
        todo,
        memberId: member.id,
        sourceId: source.id,
        timezone: file.frontmatter.timezone,
      });

      await upsertTodo({
        todo,
        memberId: member.id,
        sourceId: source.id,
        recurrenceId: recurrence?.id,
        timezone: file.frontmatter.timezone,
      });

      keptTodoKeys.add(todo.sourceKey);
      if (recurrence?.sourceKey) {
        keptRecurringKeys.add(recurrence.sourceKey);
      }
      todosProcessed += 1;
    }
  }

  return {
    filesProcessed: files.length,
    todosProcessed,
  };
};

const resetMarkdownState = async () => {
  await prisma.$transaction([
    prisma.todo.deleteMany(),
    prisma.recurringRule.deleteMany(),
    prisma.markdownSource.deleteMany(),
    prisma.familyMember.deleteMany(),
  ]);
};

