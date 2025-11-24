"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import type { TodoApiResponse, TodoResponse } from "@/types/todos";

type Props = {
  member: {
    slug: string;
    name: string;
    colorHex?: string | null;
  };
};

type Filter = "active" | "done" | "all";

const fetcher = async (url: string): Promise<TodoApiResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch todos");
  }
  return response.json();
};

const filterConfig: { id: Filter; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "done", label: "Done" },
  { id: "all", label: "All" },
];

const formatTime = (value?: string | null) => {
  if (!value) return "Anytime";
  const [hourStr, minuteStr] = value.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const suffix = hour >= 12 ? "PM" : "AM";
  const adjustedHour = hour % 12 || 12;
  return `${adjustedHour}:${minute.toString().padStart(2, "0")} ${suffix}`;
};

const frequencyLabel = (todo: TodoResponse) => {
  if (!todo.recurring) return null;
  switch (todo.recurring.frequency) {
    case "DAILY":
      return "Daily";
    case "WEEKLY":
      return todo.recurring.daysOfWeek?.length
        ? `Weekly (${todo.recurring.daysOfWeek.join(", ")})`
        : "Weekly";
    case "MONTHLY":
      return "Monthly";
    default:
      return "Recurring";
  }
};

export const TodoColumn = ({ member }: Props) => {
  const [filter, setFilter] = useState<Filter>("active");
  const [clearing, setClearing] = useState(false);
  const { data, error, isLoading, mutate } = useSWR<TodoApiResponse>(
    `/api/todos?member=${member.slug}`,
    fetcher,
    {
      refreshInterval: 45_000,
    },
  );
  const todos = useMemo(() => data?.todos ?? [], [data]);
  const doneCount = todos.filter((todo) => todo.status === "DONE").length;

  const filtered = useMemo(() => {
    switch (filter) {
      case "active":
        return todos.filter((todo) => todo.status === "PENDING");
      case "done":
        return todos.filter((todo) => todo.status === "DONE");
      default:
        return todos;
    }
  }, [filter, todos]);

  const handleToggle = async (todo: TodoResponse) => {
    const nextStatus = todo.status === "DONE" ? "PENDING" : "DONE";
    await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    await mutate();
  };

  const handleClearFinished = async () => {
    setClearing(true);
    await fetch("/api/todos/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberSlug: member.slug }),
    });
    await mutate();
    setClearing(false);
  };

  return (
    <article className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="border-b border-slate-100 pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Member</p>
            <h3
              className="text-2xl font-semibold text-slate-900"
              style={{ color: member.colorHex ?? undefined }}
            >
              {member.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClearFinished}
            disabled={clearing || doneCount === 0}
            className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {clearing ? "Clearing…" : "Clear finished"}
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          {filterConfig.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filter === option.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pt-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-2xl border border-slate-100 p-3">
                <div className="h-4 w-1/2 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-1/3 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            Unable to load todos. Refresh the page or try again later.
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            {filter === "active"
              ? "Nothing queued right now."
              : filter === "done"
                ? "No completed items yet."
                : "Add tasks via markdown to populate this column."}
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((todo) => {
              const isDone = todo.status === "DONE";
              const recurringLabel = frequencyLabel(todo);
              return (
                <li
                  key={todo.id}
                  className={`rounded-2xl border border-slate-200 p-3 transition ${
                    isDone ? "bg-slate-50 opacity-70" : "bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggle(todo)}
                      className={`mt-1 h-5 w-5 rounded-full border-2 transition ${
                        isDone
                          ? "border-slate-400 bg-slate-400"
                          : "border-slate-300 hover:border-slate-500"
                      }`}
                      aria-label="Toggle status"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-base font-semibold text-slate-900">{todo.title}</p>
                        <span className="text-xs font-semibold text-slate-500">
                          {formatTime(todo.timeOfDay)}
                        </span>
                      </div>
                      {todo.notes ? (
                        <p className="text-sm text-slate-500">{todo.notes}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {todo.category ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {todo.category}
                          </span>
                        ) : null}
                        {todo.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
                          >
                            #{tag}
                          </span>
                        ))}
                        {recurringLabel ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            {recurringLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
};

