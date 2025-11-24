export type TodoResponse = {
  id: string;
  title: string;
  notes?: string | null;
  category?: string | null;
  tags: string[];
  status: "PENDING" | "DONE";
  timeOfDay?: string | null;
  timezone?: string | null;
  member: {
    id: string;
    name: string;
    slug: string;
    colorHex?: string | null;
  };
  recurring: {
    id: string;
    frequency: string;
    daysOfWeek: string[];
    timeOfDay?: string | null;
    timezone?: string | null;
  } | null;
  completedAt: string | null;
  clearedAt: string | null;
};

export type TodoApiResponse = {
  todos: TodoResponse[];
};

