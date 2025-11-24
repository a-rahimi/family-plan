import type { Prisma, TodoStatus } from "@prisma/client";
import { TodoStatus as TodoStatusEnum } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { refreshRecurringTodos } from "@/lib/recurrence";

const includeConfig = {
  member: true,
  recurrenceRule: true,
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
};

const serializeTodo = (todo: Prisma.TodoGetPayload<{ include: typeof includeConfig }>) => ({
  id: todo.id,
  title: todo.title,
  notes: todo.notes,
  category: todo.category,
  tags: toStringArray(todo.tags),
  status: todo.status,
  timeOfDay: todo.timeOfDay,
  timezone: todo.timezone,
  member: {
    id: todo.member.id,
    name: todo.member.name,
    slug: todo.member.slug,
    colorHex: todo.member.colorHex,
  },
  recurring: todo.recurrenceRule
    ? {
        id: todo.recurrenceRule.id,
        frequency: todo.recurrenceRule.frequency,
        daysOfWeek: toStringArray(todo.recurrenceRule.daysOfWeek),
        timeOfDay: todo.recurrenceRule.timeOfDay,
        timezone: todo.recurrenceRule.timezone,
      }
    : null,
  completedAt: todo.completedAt?.toISOString() ?? null,
  clearedAt: todo.clearedAt?.toISOString() ?? null,
});

type ListOptions = {
  memberSlug?: string;
  status?: TodoStatus;
  includeCleared?: boolean;
};

export const listTodos = async (options: ListOptions = {}) => {
  await refreshRecurringTodos();

  const where: Prisma.TodoWhereInput = {
    ...(options.memberSlug ? { member: { slug: options.memberSlug } } : {}),
    ...(options.status ? { status: options.status } : {}),
    ...(options.includeCleared ? {} : { clearedAt: null }),
  };

  const todos = await prisma.todo.findMany({
    where,
    orderBy: [{ member: { slug: "asc" } }, { category: "asc" }, { timeOfDay: "asc" }, { title: "asc" }],
    include: includeConfig,
  });

  return todos.map(serializeTodo);
};

type CreateTodoInput = {
  title: string;
  memberSlug: string;
  notes?: string;
  category?: string;
  timeOfDay?: string;
  tags?: string[];
};

export const createTodo = async (input: CreateTodoInput) => {
  const member = await prisma.familyMember.findUnique({
    where: { slug: input.memberSlug },
  });

  if (!member) {
    throw new Error(`Family member ${input.memberSlug} not found`);
  }

  const todo = await prisma.todo.create({
    data: {
      title: input.title,
      notes: input.notes,
      category: input.category,
      timeOfDay: input.timeOfDay,
      tags: input.tags ?? [],
      status: TodoStatusEnum.PENDING,
      memberId: member.id,
      timezone: member.timezone,
    },
    include: includeConfig,
  });

  return serializeTodo(todo);
};

type UpdateTodoInput = {
  title?: string;
  notes?: string;
  category?: string;
  timeOfDay?: string;
  status?: TodoStatus;
  tags?: string[];
};

export const updateTodo = async (id: string, input: UpdateTodoInput) => {
  const data: Prisma.TodoUpdateInput = {
    ...(input.title ? { title: input.title } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.timeOfDay !== undefined ? { timeOfDay: input.timeOfDay } : {}),
    ...(input.tags ? { tags: input.tags } : {}),
  };

  if (input.status) {
    data.status = input.status;
    data.clearedAt = null;
    data.completedAt =
      input.status === TodoStatusEnum.DONE ? new Date() : null;
  }

  const todo = await prisma.todo.update({
    where: { id },
    data,
    include: includeConfig,
  });

  return serializeTodo(todo);
};

export const clearFinishedTodos = async (memberSlug?: string) => {
  const where: Prisma.TodoWhereInput = {
    status: TodoStatusEnum.DONE,
    clearedAt: null,
    ...(memberSlug ? { member: { slug: memberSlug } } : {}),
  };

  const result = await prisma.todo.updateMany({
    where,
    data: { clearedAt: new Date() },
  });

  const { reactivated } = await refreshRecurringTodos();

  return {
    cleared: result.count,
    reactivated,
  };
};

